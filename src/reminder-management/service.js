import { existingPool as existDb } from '../../config/dbExisiting.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Read-only queries over the Family Reminders tables in the app database.
 *
 * The mobile app owns these tables (see IDS_backend/api/familyReminders); the
 * admin portal only reads from them.
 */

/**
 * Converts an IST calendar range into UTC bounds, matching how the rest of the
 * admin reports interpret `start_date` / `end_date`.
 */
export const resolveRange = (start_date, end_date) => {
  if (!start_date || !end_date) return { hasRange: false };
  return {
    hasRange: true,
    startUTC: dayjs(start_date).tz('Asia/Kolkata', true).startOf('day').utc().toISOString(),
    endUTC: dayjs(end_date).tz('Asia/Kolkata', true).endOf('day').utc().toISOString()
  };
};

/**
 * Headline counters for the dashboard cards.
 *
 * Counted on `created_at` (when the reminder was set), not `remind_at`, so
 * "how many reminders were set between these dates" reads as the admin expects.
 */
export const summaryQuery = async ({ startUTC, endUTC, hasRange }) => {
  const dateFilter = hasRange ? 'AND r.created_at BETWEEN $1 AND $2' : '';
  const values = hasRange ? [startUTC, endUTC] : [];

  const { rows } = await existDb.query(
    `
    SELECT
      COUNT(*)::int                                                   AS total_reminders,
      COUNT(*) FILTER (WHERE r.status = 'active')::int                AS active_reminders,
      COUNT(*) FILTER (WHERE r.status = 'completed')::int             AS completed_reminders,
      COUNT(*) FILTER (WHERE r.priority = 'high')::int                AS high_priority,
      COUNT(*) FILTER (WHERE r.priority = 'medium')::int              AS medium_priority,
      COUNT(*) FILTER (WHERE r.priority = 'low')::int                 AS low_priority,
      COUNT(DISTINCT r.created_by)::int                               AS distinct_creators
    FROM family_reminders r
    WHERE r.is_deleted = false
      ${dateFilter};
    `,
    values
  );

  // Collaboration volume is scoped to reminders created inside the window so
  // every card on the dashboard describes the same set of reminders.
  const activityFilter = hasRange ? 'AND r.created_at BETWEEN $1 AND $2' : '';

  const [{ rows: commentRows }, { rows: attachmentRows }, { rows: memberRows }] =
    await Promise.all([
      existDb.query(
        `
        SELECT COUNT(c.id)::int AS total_comments
        FROM family_reminder_comments c
        JOIN family_reminders r ON r.id = c.reminder_id
        WHERE c.is_deleted = false AND r.is_deleted = false
          ${activityFilter};
        `,
        values
      ),
      existDb.query(
        `
        SELECT COUNT(a.id)::int AS total_attachments
        FROM family_reminder_attachments a
        JOIN family_reminders r ON r.id = a.reminder_id
        WHERE a.is_deleted = false AND r.is_deleted = false
          ${activityFilter};
        `,
        values
      ),
      existDb.query(
        `
        SELECT COUNT(DISTINCT m.user_id)::int AS members_reached
        FROM family_reminder_members m
        JOIN family_reminders r ON r.id = m.reminder_id
        WHERE m.is_removed = false AND r.is_deleted = false
          ${activityFilter};
        `,
        values
      )
    ]);

  return {
    ...rows[0],
    total_comments: commentRows[0].total_comments,
    total_attachments: attachmentRows[0].total_attachments,
    members_reached: memberRows[0].members_reached
  };
};

/** Day-by-day counts, for a trend line across the selected range. */
export const trendQuery = async ({ startUTC, endUTC, hasRange }) => {
  if (!hasRange) return [];
  const { rows } = await existDb.query(
    `
    SELECT to_char(
             (r.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date,
             'YYYY-MM-DD'
           ) AS day,
           COUNT(*)::int AS reminders
    FROM family_reminders r
    WHERE r.is_deleted = false
      AND r.created_at BETWEEN $1 AND $2
    GROUP BY day
    ORDER BY day ASC;
    `,
    [startUTC, endUTC]
  );
  return rows;
};

/**
 * Paginated reminder list. `search` matches the creator's name or mobile and
 * the reminder title, so one box covers "search a particular user from
 * name/number" and finding a reminder by name.
 */
/**
 * Builds the shared WHERE fragment with placeholder numbers starting at
 * `startIndex`, so the list query (which leads with limit/offset), the count
 * query and the export query each get correctly numbered SQL.
 *
 * Rewriting placeholder numbers after the fact is not safe — sequential string
 * replacement can rewrite a number it just produced.
 */
const buildReminderFilters = (params, startIndex) => {
  const { hasRange, startUTC, endUTC, search = '', priority = '', status = '' } = params;

  const values = [];
  let index = startIndex;

  values.push(search ?? '');
  const searchIdx = index;
  index += 1;

  let extra = '';
  if (hasRange) {
    values.push(startUTC, endUTC);
    extra += ` AND r.created_at BETWEEN $${index} AND $${index + 1}`;
    index += 2;
  }
  if (priority) {
    values.push(priority);
    extra += ` AND r.priority = $${index}`;
    index += 1;
  }
  if (status) {
    values.push(status);
    extra += ` AND r.status = $${index}`;
    index += 1;
  }

  const searchWhere = `
    (
      $${searchIdx}::text IS NULL OR $${searchIdx}::text = ''
      OR u.name   ILIKE '%' || $${searchIdx}::text || '%'
      OR u.mobile ILIKE '%' || $${searchIdx}::text || '%'
      OR r.title  ILIKE '%' || $${searchIdx}::text || '%'
    )
  `;

  return { values, extra, searchWhere };
};

export const listQuery = async (params) => {
  const { limit, offset } = params;

  // List: $1 = limit, $2 = offset, filters start at $3.
  const listFilters = buildReminderFilters(params, 3);
  const listValues = [limit, offset, ...listFilters.values];
  const { extra, searchWhere } = listFilters;

  const { rows } = await existDb.query(
    `
    SELECT r.id,
           r.title,
           r.description,
           r.remind_at,
           r.priority,
           r.status,
           r.comment_mode,
           r.venue_name,
           r.created_at,
           r.created_by,
           u.name   AS creator_name,
           u.mobile AS creator_mobile,
           (SELECT COUNT(*) FROM family_reminder_members mm
              WHERE mm.reminder_id = r.id AND mm.is_removed = false)::int AS member_count,
           (SELECT COUNT(*) FROM family_reminder_comments cc
              WHERE cc.reminder_id = r.id AND cc.is_deleted = false)::int AS comment_count,
           (SELECT COUNT(*) FROM family_reminder_attachments aa
              WHERE aa.reminder_id = r.id AND aa.is_deleted = false)::int AS attachment_count,
           (SELECT COUNT(*) FROM family_reminder_schedules ss
              WHERE ss.reminder_id = r.id)::int AS alert_count
    FROM family_reminders r
    LEFT JOIN users u ON u.id = r.created_by
    WHERE r.is_deleted = false
      AND ${searchWhere}
      ${extra}
    ORDER BY r.created_at DESC
    LIMIT $1 OFFSET $2;
    `,
    listValues
  );

  // Count: no paging placeholders, so filters start at $1.
  const countFilters = buildFilters(1);

  const { rows: countRows } = await existDb.query(
    `
    SELECT COUNT(*)::int AS count
    FROM family_reminders r
    LEFT JOIN users u ON u.id = r.created_by
    WHERE r.is_deleted = false
      AND ${countFilters.searchWhere}
      ${countFilters.extra};
    `,
    countFilters.values
  );

  return { list: rows, total: countRows[0].count };
};

/** Everything about one reminder: members, alerts, comments, attachments. */
export const detailsQuery = async ({ id }) => {
  const { rows: reminderRows } = await existDb.query(
    `
    SELECT r.*,
           u.name   AS creator_name,
           u.mobile AS creator_mobile
    FROM family_reminders r
    LEFT JOIN users u ON u.id = r.created_by
    WHERE r.id = $1;
    `,
    [id]
  );
  if (reminderRows.length === 0) return null;

  const [members, schedules, comments, attachments] = await Promise.all([
    existDb.query(
      `
      SELECT m.user_id,
             COALESCE(NULLIF(m.name, ''), u.name) AS name,
             u.mobile,
             m.relation,
             m.is_creator,
             m.is_admin,
             m.can_comment,
             m.can_upload,
             m.is_removed,
             m.added_at,
             m.removed_at
      FROM family_reminder_members m
      LEFT JOIN users u ON u.id = m.user_id
      WHERE m.reminder_id = $1
      ORDER BY m.is_creator DESC, m.is_admin DESC, m.added_at ASC;
      `,
      [id]
    ),
    existDb.query(
      `SELECT offset_minutes, label FROM family_reminder_schedules
       WHERE reminder_id = $1 ORDER BY offset_minutes DESC;`,
      [id]
    ),
    existDb.query(
      `
      SELECT c.id, c.parent_id, c.user_id, c.comment, c.mentions, c.created_at,
             u.name AS user_name, u.mobile AS user_mobile
      FROM family_reminder_comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.reminder_id = $1 AND c.is_deleted = false
      ORDER BY c.created_at ASC;
      `,
      [id]
    ),
    existDb.query(
      `
      SELECT a.id, a.user_id, a.file_name, a.file_url, a.file_type, a.created_at,
             u.name AS user_name
      FROM family_reminder_attachments a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.reminder_id = $1 AND a.is_deleted = false
      ORDER BY a.created_at DESC;
      `,
      [id]
    )
  ]);

  return {
    ...reminderRows[0],
    members: members.rows,
    schedules: schedules.rows,
    comments: comments.rows,
    attachments: attachments.rows
  };
};

/**
 * Per-user rollup: who is using reminders and how much. Searchable by name or
 * mobile so an admin can pull up one person.
 */
export const userAggregateQuery = async (params) => {
  const { startUTC, endUTC, hasRange, search = '', limit, offset } = params;

  const values = [limit, offset, search ?? ''];
  let dateFilter = '';
  if (hasRange) {
    values.push(startUTC, endUTC);
    dateFilter = ` AND r.created_at BETWEEN $${values.length - 1} AND $${values.length}`;
  }

  // Only users who actually appear on a reminder — either as creator or member.
  const { rows } = await existDb.query(
    `
    WITH involved AS (
      SELECT DISTINCT m.user_id
      FROM family_reminder_members m
      JOIN family_reminders r ON r.id = m.reminder_id
      WHERE r.is_deleted = false ${dateFilter}
    )
    SELECT u.id   AS user_id,
           u.name,
           u.mobile,
           (SELECT COUNT(*) FROM family_reminders r2
              WHERE r2.created_by = u.id AND r2.is_deleted = false
              ${dateFilter.replace(/r\./g, 'r2.')})::int AS created_count,
           (SELECT COUNT(*) FROM family_reminder_members m2
              JOIN family_reminders r3 ON r3.id = m2.reminder_id
              WHERE m2.user_id = u.id
                AND m2.is_removed = false
                AND m2.is_creator = false
                AND r3.is_deleted = false
                ${dateFilter.replace(/r\./g, 'r3.')})::int AS shared_with_count,
           (SELECT COUNT(*) FROM family_reminder_comments c2
              JOIN family_reminders r4 ON r4.id = c2.reminder_id
              WHERE c2.user_id = u.id
                AND c2.is_deleted = false
                AND r4.is_deleted = false
                ${dateFilter.replace(/r\./g, 'r4.')})::int AS comment_count
    FROM involved i
    JOIN users u ON u.id = i.user_id
    WHERE (
      $3::text IS NULL OR $3::text = ''
      OR u.name   ILIKE '%' || $3::text || '%'
      OR u.mobile ILIKE '%' || $3::text || '%'
    )
    ORDER BY created_count DESC, u.name ASC
    LIMIT $1 OFFSET $2;
    `,
    values
  );

  const countValues = hasRange
    ? [search ?? '', startUTC, endUTC]
    : [search ?? ''];
  const countDateFilter = hasRange ? ' AND r.created_at BETWEEN $2 AND $3' : '';

  const { rows: countRows } = await existDb.query(
    `
    WITH involved AS (
      SELECT DISTINCT m.user_id
      FROM family_reminder_members m
      JOIN family_reminders r ON r.id = m.reminder_id
      WHERE r.is_deleted = false ${countDateFilter}
    )
    SELECT COUNT(*)::int AS count
    FROM involved i
    JOIN users u ON u.id = i.user_id
    WHERE (
      $1::text IS NULL OR $1::text = ''
      OR u.name   ILIKE '%' || $1::text || '%'
      OR u.mobile ILIKE '%' || $1::text || '%'
    );
    `,
    countValues
  );

  return { list: rows, total: countRows[0].count };
};

/**
 * Records which admin pushed a reminder from the portal.
 *
 * The mobile backend owns these tables, so this is an additive, idempotent
 * migration the admin service can run independently on boot.
 */
export const ensureAdminReminderColumn = async () => {
  try {
    await existDb.query(
      `ALTER TABLE family_reminders
         ADD COLUMN IF NOT EXISTS created_by_admin UUID;`
    );
    console.log('✅ family_reminders.created_by_admin ensured');
  } catch (err) {
    // A missing family_reminders table simply means the mobile backend has not
    // booted yet; the reminder section will show empty until it has.
    console.error('❌ ensureAdminReminderColumn:', err.message);
  }
};

/** App users, searchable by name or mobile, for the admin's target picker. */
export const appUsersQuery = async ({ search = '', limit = 50 }) => {
  const { rows } = await existDb.query(
    `
    SELECT id, name, mobile
    FROM users
    WHERE (
      $1::text IS NULL OR $1::text = ''
      OR name   ILIKE '%' || $1::text || '%'
      OR mobile ILIKE '%' || $1::text || '%'
    )
    ORDER BY name ASC NULLS LAST
    LIMIT $2;
    `,
    [search ?? '', limit]
  );
  return rows;
};

/**
 * Every app user id — the target set when the admin pushes to everyone.
 *
 * Bounded so an unexpectedly large user table cannot exhaust memory. If the cap
 * is reached the caller is told, rather than silently reaching fewer users than
 * the admin believes.
 */
export const MAX_BROADCAST_USERS = 200000;

/** Users per transaction when broadcasting; keeps each transaction short. */
const BROADCAST_CHUNK = 1000;

export const allUserIdsQuery = async () => {
  const { rows } = await existDb.query(
    `SELECT id FROM users ORDER BY created_at ASC NULLS LAST LIMIT $1;`,
    [MAX_BROADCAST_USERS + 1]
  );
  const truncated = rows.length > MAX_BROADCAST_USERS;

  return {
    userIds: rows.slice(0, MAX_BROADCAST_USERS).map((r) => r.id),
    truncated,
  };
};

/**
 * Creates one reminder per target user, with that user as the creator.
 *
 * Modelling it this way means the reminder behaves like any other in the mobile
 * app — it shows on their home, calendar and inbox, and the existing cron
 * delivers its alerts — with no mobile changes required.
 */
export const createRemindersForUsers = async ({ userIds, adminId, payload }) => {
  const {
    title,
    description,
    remind_at,
    venue_name = null,
    venue_address = null,
    priority = 'medium',
    comment_mode = 'everyone',
    schedules = []
  } = payload;

  // De-duplicated alert offsets, computed once for every target user.
  const seen = new Set();
  const offsets = [];
  for (const schedule of schedules) {
    const offset = Number(schedule.offset_minutes);
    if (!Number.isFinite(offset) || seen.has(offset)) continue;
    seen.add(offset);
    offsets.push({ offset, label: schedule.label || null });
  }

  const created = [];

  // Chunked rather than one statement per user in a single transaction. A
  // broadcast to 100k users was 300k+ serial INSERTs holding locks for minutes;
  // set-based inserts per chunk keep each transaction short and bounded.
  for (let i = 0; i < userIds.length; i += BROADCAST_CHUNK) {
    const batch = userIds.slice(i, i + BROADCAST_CHUNK);
    const client = await existDb.connect();

    try {
      await client.query('BEGIN');

      // One INSERT ... SELECT creates every reminder for this chunk.
      const { rows: reminders } = await client.query(
        `
        INSERT INTO family_reminders
          (created_by, created_by_admin, title, description, remind_at,
           venue_name, venue_address, priority, comment_mode)
        SELECT u, $2, $3, $4, $5, $6, $7, $8, $9
        FROM unnest($1::uuid[]) AS u
        RETURNING id, created_by;
        `,
        [
          batch,
          adminId,
          title,
          description,
          remind_at,
          venue_name,
          venue_address,
          priority,
          comment_mode
        ]
      );

      const reminderIds = reminders.map((r) => r.id);

      // Creator membership for the whole chunk in one statement.
      await client.query(
        `
        INSERT INTO family_reminder_members
          (reminder_id, user_id, name, relation, is_creator)
        SELECT r.id, r.created_by, NULL, 'Creator', true
        FROM family_reminders r
        WHERE r.id = ANY($1::uuid[])
        ON CONFLICT (reminder_id, user_id) DO NOTHING;
        `,
        [reminderIds]
      );

      // Alerts: cross join chunk reminders with the offset list.
      if (offsets.length > 0) {
        await client.query(
          `
          INSERT INTO family_reminder_schedules (reminder_id, offset_minutes, label)
          SELECT rid, s.offset_minutes, s.label
          FROM unnest($1::uuid[]) AS rid
          CROSS JOIN unnest($2::int[], $3::text[]) AS s(offset_minutes, label)
          ON CONFLICT (reminder_id, offset_minutes) DO NOTHING;
          `,
          [reminderIds, offsets.map((o) => o.offset), offsets.map((o) => o.label)]
        );
      }

      await client.query('COMMIT');

      reminders.forEach((r) =>
        created.push({ reminderId: r.id, userId: r.created_by })
      );
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  return created;
};

/** Active device tokens for a user, so the admin push reaches every device. */
export const userDevicesQuery = async ({ userId }) => {
  const { rows } = await existDb.query(
    `SELECT device_id, fcm_token FROM fcm
     WHERE user_id = $1 AND isloggedout = false;`,
    [userId]
  );
  return rows;
};

/**
 * Full unpaginated rows for the Excel export, using the same filters as the
 * list view so what you see is what you download.
 */
export const exportQuery = async (params) => {
  const filters = buildReminderFilters(params, 1);

  const { rows: reminders } = await existDb.query(
    `
    SELECT r.id,
           r.title,
           r.description,
           r.remind_at,
           r.priority,
           r.status,
           r.comment_mode,
           r.venue_name,
           r.created_at,
           r.created_by_admin,
           u.name   AS creator_name,
           u.mobile AS creator_mobile,
           (SELECT COUNT(*) FROM family_reminder_members mm
              WHERE mm.reminder_id = r.id AND mm.is_removed = false)::int AS member_count,
           (SELECT COUNT(*) FROM family_reminder_comments cc
              WHERE cc.reminder_id = r.id AND cc.is_deleted = false)::int AS comment_count,
           (SELECT COUNT(*) FROM family_reminder_attachments aa
              WHERE aa.reminder_id = r.id AND aa.is_deleted = false)::int AS attachment_count,
           (SELECT string_agg(COALESCE(s.label, s.offset_minutes || 'm'), ', '
                              ORDER BY s.offset_minutes DESC)
              FROM family_reminder_schedules s WHERE s.reminder_id = r.id) AS alerts,
           (SELECT string_agg(COALESCE(NULLIF(m2.name,''), u2.name), ', ')
              FROM family_reminder_members m2
              LEFT JOIN users u2 ON u2.id = m2.user_id
              WHERE m2.reminder_id = r.id AND m2.is_removed = false) AS shared_with
    FROM family_reminders r
    LEFT JOIN users u ON u.id = r.created_by
    WHERE r.is_deleted = false
      AND ${filters.searchWhere}
      ${filters.extra}
    ORDER BY r.created_at DESC;
    `,
    filters.values
  );

  if (reminders.length === 0) {
    return { reminders: [], members: [], comments: [], attachments: [] };
  }

  const ids = reminders.map((r) => r.id);

  const [members, comments, attachments] = await Promise.all([
    existDb.query(
      `
      SELECT m.reminder_id, r.title,
             COALESCE(NULLIF(m.name,''), u.name) AS name,
             u.mobile, m.relation, m.is_creator, m.is_admin,
             m.can_comment, m.can_upload, m.is_removed, m.added_at
      FROM family_reminder_members m
      JOIN family_reminders r ON r.id = m.reminder_id
      LEFT JOIN users u ON u.id = m.user_id
      WHERE m.reminder_id = ANY($1::uuid[])
      ORDER BY r.created_at DESC, m.is_creator DESC;
      `,
      [ids]
    ),
    existDb.query(
      `
      SELECT c.reminder_id, r.title, c.comment, c.created_at,
             c.parent_id IS NOT NULL AS is_reply,
             u.name AS user_name, u.mobile AS user_mobile
      FROM family_reminder_comments c
      JOIN family_reminders r ON r.id = c.reminder_id
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.reminder_id = ANY($1::uuid[]) AND c.is_deleted = false
      ORDER BY r.created_at DESC, c.created_at ASC;
      `,
      [ids]
    ),
    existDb.query(
      `
      SELECT a.reminder_id, r.title, a.file_name, a.file_url, a.file_type,
             a.created_at, u.name AS user_name
      FROM family_reminder_attachments a
      JOIN family_reminders r ON r.id = a.reminder_id
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.reminder_id = ANY($1::uuid[]) AND a.is_deleted = false
      ORDER BY r.created_at DESC, a.created_at DESC;
      `,
      [ids]
    )
  ]);

  return {
    reminders,
    members: members.rows,
    comments: comments.rows,
    attachments: attachments.rows
  };
};

/** Reminders belonging to one user — created by them or shared with them. */
export const userRemindersQuery = async ({ userId, startUTC, endUTC, hasRange }) => {
  const values = [userId];
  let dateFilter = '';
  if (hasRange) {
    values.push(startUTC, endUTC);
    dateFilter = ' AND r.created_at BETWEEN $2 AND $3';
  }

  const { rows } = await existDb.query(
    `
    SELECT DISTINCT r.id,
           r.title,
           r.remind_at,
           r.priority,
           r.status,
           r.created_at,
           r.created_by,
           (r.created_by = $1) AS is_creator,
           cu.name AS creator_name,
           (SELECT COUNT(*) FROM family_reminder_members mm
              WHERE mm.reminder_id = r.id AND mm.is_removed = false)::int AS member_count,
           (SELECT COUNT(*) FROM family_reminder_comments cc
              WHERE cc.reminder_id = r.id AND cc.is_deleted = false)::int AS comment_count
    FROM family_reminders r
    JOIN family_reminder_members m ON m.reminder_id = r.id AND m.user_id = $1
    LEFT JOIN users cu ON cu.id = r.created_by
    WHERE r.is_deleted = false
      AND m.is_removed = false
      ${dateFilter}
    ORDER BY r.created_at DESC;
    `,
    values
  );

  const { rows: userRows } = await existDb.query(
    `SELECT id, name, mobile FROM users WHERE id = $1;`,
    [userId]
  );

  return { user: userRows[0] || null, reminders: rows };
};
