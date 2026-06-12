// import Boom from '@hapi/boom';
// import { adminDb as adminDbPool } from "../../config/adminDb.js";

// // ─── UPSERT ───────────────────────────────────────────────────────────────────

// export const upsertAdvertisment = async (payload, loggedUser) => {
//   const client = await adminDbPool.connect();
//   const userId = loggedUser.id;

//   try {
//     await client.query("BEGIN");

//     const {
//       id, name, header, body, footer, is_active,
//       contact_us,
//       linkname_1, link_1,
//       linkname_2, link_2,
//       files,
//     } = payload;

//     console.log(name, header, body, footer, is_active,
//       contact_us,
//       linkname_1, link_1,
//       linkname_2, link_2)
//     let adId;

//     if (id) {
//       // ── UPDATE ──
//       const updateQuery = `
//         UPDATE advertisment
//         SET
//           name        = COALESCE($1,  name),
//           header      = COALESCE($2,  header),
//           body        = COALESCE($3,  body),
//           footer      = COALESCE($4,  footer),
//           is_active   = COALESCE($5,  is_active),
//           contact_us  = COALESCE($6,  contact_us),
//           linkname_1  = COALESCE($7,  linkname_1),
//           link_1      = COALESCE($8,  link_1),
//           linkname_2  = COALESCE($9,  linkname_2),
//           link_2      = COALESCE($10, link_2),
//           updated_at  = CURRENT_TIMESTAMP
//         WHERE id = $11
//         RETURNING *
//       `;
//       const { rows } = await client.query(updateQuery, [
//         name, header, body, footer, is_active,
//         contact_us,
//         linkname_1, link_1,
//         linkname_2, link_2,
//         id,
//       ]);

//       if (!rows.length) throw Boom.notFound("Advertisement not found");
//       adId = rows[0].id;
//     } else {
//       // ── INSERT ──
//       const insertQuery = `
//         INSERT INTO advertisment
//           (created_by, name, header, body, footer, is_active, contact_us, linkname_1, link_1, linkname_2, link_2)
//         VALUES
//           ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
//         RETURNING *
//       `;
//       const { rows } = await client.query(insertQuery, [
//         userId, name, header, body, footer,
//         is_active ?? true,
//         contact_us ?? null,
//         linkname_1 ?? null, link_1 ?? null,
//         linkname_2 ?? null, link_2 ?? null,
//       ]);

//       adId = rows[0].id;
//     }

//     // ── HANDLE FILES ──
//     if (files && Array.isArray(files) && files.length > 0) {
//       if (id) {
//         // Keep existing, insert only new (no id) files
//         const newFiles = files.filter((f) => !f.id);
//         if (newFiles.length > 0) {
//           const fileInsertQuery = `
//             INSERT INTO advertisment_filelist (ad_id, file, type)
//             VALUES ($1, $2, $3)
//           `;
//           for (const f of newFiles) {
//             await client.query(fileInsertQuery, [
//               adId,
//               JSON.stringify({ key: f.key, url: f.url, file_name: f.file_name }),
//               f.type,
//             ]);
//           }
//         }
//       } else {
//         // Fresh insert — insert all files
//         const fileInsertQuery = `
//           INSERT INTO advertisment_filelist (ad_id, file, type)
//           VALUES ($1, $2, $3)
//         `;
//         for (const f of files) {
//           await client.query(fileInsertQuery, [
//             adId,
//             JSON.stringify({ key: f.key, url: f.url, file_name: f.file_name }),
//             f.type,
//           ]);
//         }
//       }
//     }

//     // ── FETCH FULL RESULT ──
//     const { rows: result } = await client.query(
//       `
//       SELECT
//         a.*,
//         COALESCE(
//           JSON_AGG(
//             JSON_BUILD_OBJECT(
//               'id',        fl.id,
//               'type',      fl.type,
//               'key',       fl.file->>'key',
//               'url',       fl.file->>'url',
//               'file_name', fl.file->>'file_name'
//             )
//           ) FILTER (WHERE fl.id IS NOT NULL),
//           '[]'
//         ) AS files
//       FROM advertisment a
//       LEFT JOIN advertisment_filelist fl ON fl.ad_id = a.id
//       WHERE a.id = $1
//       GROUP BY a.id
//       `,
//       [adId]
//     );

//     await client.query("COMMIT");

//     return {
//       message: id ? "Advertisement updated" : "Advertisement created",
//       data: result[0],
//     };
//   } catch (err) {
//     await client.query("ROLLBACK");
//     console.log("err----->", err);
//     throw Boom.conflict(err.message);
//   } finally {
//     client.release();
//   }
// };

// // ─── INCREMENT VIEW COUNT ─────────────────────────────────────────────────────

// export const incrementAdViewCount = async (adId) => {
//   const client = await adminDbPool.connect();

//   try {
//     const { rows } = await client.query(
//       `
//       UPDATE advertisment
//       SET
//         view_count = view_count + 1,
//         updated_at = CURRENT_TIMESTAMP
//       WHERE id = $1
//       RETURNING id, view_count
//       `,
//       [adId]
//     );

//     if (!rows.length) throw Boom.notFound("Advertisement not found");

//     return {
//       message: "View count updated",
//       data: rows[0],
//     };
//   } catch (err) {
//     throw Boom.conflict(err.message);
//   } finally {
//     client.release();
//   }
// };

// // ─── LIST ─────────────────────────────────────────────────────────────────────

// export const listAdvertisment = async (query = {}) => {
//   const client = await adminDbPool.connect();

//   try {
//     const { is_active, page = 1, limit = 10 } = query;
//     const offset = (page - 1) * limit;

//     const conditions = [];
//     const values = [];

//     if (is_active !== undefined) {
//       values.push(is_active);
//       conditions.push(`a.is_active = $${values.length}`);
//     }

//     const whereClause = conditions.length
//       ? `WHERE ${conditions.join(" AND ")}`
//       : "";

//     values.push(limit, offset);

//     const listQuery = `
//       SELECT
//         a.*,
//         COALESCE(
//           JSON_AGG(
//             JSON_BUILD_OBJECT(
//               'id',        fl.id,
//               'type',      fl.type,
//               'key',       fl.file->>'key',
//               'url',       fl.file->>'url',
//               'file_name', fl.file->>'file_name'
//             )
//           ) FILTER (WHERE fl.id IS NOT NULL),
//           '[]'
//         ) AS files,
//         COUNT(*) OVER() AS total_count
//       FROM advertisment a
//       LEFT JOIN advertisment_filelist fl ON fl.ad_id = a.id
//       ${whereClause}
//       GROUP BY a.id
//       ORDER BY a.created_at DESC
//       LIMIT $${values.length - 1} OFFSET $${values.length}
//     `;

//     // console.log(listQuery,conditions,values)

//     const { rows } = await client.query(listQuery, values);

//     const totalCount = rows.length ? parseInt(rows[0].total_count) : 0;

//     return {
//       message: "Advertisement List",
//       data: rows,
//       pagination: {
//         total:      totalCount,
//         page:       parseInt(page),
//         limit:      parseInt(limit),
//         totalPages: Math.ceil(totalCount / limit),
//       },
//     };
//   } catch (err) {
//     throw Boom.conflict(err.message);
//   } finally {
//     client.release();
//   }
// };

// // ─── DELETE ───────────────────────────────────────────────────────────────────

// export const deleteAdvertisment = async ({id},loggedUser) => {
//   const client = await adminDbPool.connect();

//   try {
//     const { rows } = await client.query(
//       `DELETE FROM advertisment WHERE id = $1 RETURNING id`,
//       [id]
//     );

//     if (!rows.length) throw Boom.notFound("Advertisement not found");

//     return {
//       message: "Advertisement deleted",
//       data: { id: rows[0].id },
//     };
//   } catch (err) {
//     throw Boom.conflict(err.message);
//   } finally {
//     client.release();
//   }
// };



// export const deleteAdvertismentfile = async ( {id},loggedUser) => {
//   const client = await adminDbPool.connect();

//   try {
//     const { rows } = await client.query(
//       `DELETE FROM advertisment_filelist WHERE id = $1 RETURNING id`,
//       [id]
//     );

//     if (!rows.length) throw Boom.notFound("Advertisement files not found");

//     return {
//       message: "Advertisement files deleted",
//       data: { id: rows[0].id },
//     };
//   } catch (err) {
//     throw Boom.conflict(err.message);
//   } finally {
//     client.release();
//   }
// };


import Boom from "@hapi/boom";
import { adminDb as adminDbPool } from "../../config/adminDb.js";
import dayjs   from "dayjs";
import utc     from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { existingPool } from '../../config/dbExisiting.js';
import { sendNotificationNew } from "../../helpers/fcm.js";

dayjs.extend(utc);
dayjs.extend(timezone);
 
const IST = "Asia/Kolkata";

const nowUTC = () => dayjs().tz(IST, true).utc().format();
const toIST = (ts) => dayjs(ts).tz(IST);


// ═══════════════════════════════════════════════════════════════════════════════
//  ADVERTISEMENT RULES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Upsert an advertisement rule.
 * Pass `id` in payload to update, omit to create.
 */
export const upsertAdvertismentRule = async (payload) => {
  const client = await adminDbPool.connect();

  try {
    const {
      id,
      ad_id,
      page_name,
      slot_name,
      min_interval_seconds,
      max_shows_per_user,
      max_shows_per_day,
      max_shows_per_session,
      priority,
      start_at,
      end_at,
      is_enabled,
    } = payload;

    let row;

    if (id) {
      // ── UPDATE ──
      const { rows } = await client.query(
        `
        UPDATE advertisment_rules
        SET
          ad_id                 = COALESCE($1,  ad_id),
          page_name             = COALESCE($2,  page_name),
          slot_name             = COALESCE($3,  slot_name),
          min_interval_seconds  = COALESCE($4,  min_interval_seconds),
          max_shows_per_user    = COALESCE($5,  max_shows_per_user),
          max_shows_per_day     = COALESCE($6,  max_shows_per_day),
          max_shows_per_session = COALESCE($7,  max_shows_per_session),
          priority              = COALESCE($8,  priority),
          start_at              = COALESCE($9,  start_at),
          end_at                = COALESCE($10, end_at),
          is_enabled            = COALESCE($11, is_enabled),
          updated_at            = CURRENT_TIMESTAMP
        WHERE id = $12
        RETURNING *
        `,
        [
          ad_id,
          page_name,
          slot_name,
          min_interval_seconds,
          max_shows_per_user,
          max_shows_per_day,
          max_shows_per_session,
          priority,
          start_at ?? null,
          end_at ?? null,
          is_enabled,
          id,
        ]
      );

      if (!rows.length) throw Boom.notFound("Advertisement rule not found");
      row = rows[0];
    } else {
      // ── INSERT ──
      const { rows } = await client.query(
        `
        INSERT INTO advertisment_rules
          (ad_id, page_name, slot_name, min_interval_seconds, max_shows_per_user,
           max_shows_per_day, max_shows_per_session, priority, start_at, end_at, is_enabled)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
        `,
        [
          ad_id,
          page_name,
          slot_name,
          min_interval_seconds  ?? 0,
          max_shows_per_user    ?? 0,
          max_shows_per_day     ?? 0,
          max_shows_per_session ?? 0,
          priority              ?? 0,
          start_at              ?? null,
          end_at                ?? null,
          is_enabled            ?? true,
        ]
      );
      row = rows[0];
    }

    return {
      message: id ? "Advertisement rule updated" : "Advertisement rule created",
      data: row,
    };
  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};

// ─── LIST RULES ───────────────────────────────────────────────────────────────

/**
 * List rules with optional filters: ad_id, page_name, slot_name, is_enabled.
 * Supports pagination.
 */
export const listAdvertismentRules = async (query = {}) => {
  const client = await adminDbPool.connect();

  try {
    const { ad_id, page_name, slot_name, is_enabled, page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];

    if (ad_id !== undefined) {
      values.push(ad_id);
      conditions.push(`r.ad_id = $${values.length}`);
    }
    if (page_name !== undefined) {
      values.push(page_name);
      conditions.push(`r.page_name = $${values.length}`);
    }
    if (slot_name !== undefined) {
      values.push(slot_name);
      conditions.push(`r.slot_name = $${values.length}`);
    }
    if (is_enabled !== undefined) {
      values.push(is_enabled);
      conditions.push(`r.is_enabled = $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    values.push(limit, offset);

    const { rows } = await client.query(
      `
      SELECT
        r.*,
        a.name  AS ad_name,
        COUNT(*) OVER() AS total_count
      FROM advertisment_rules r
      LEFT JOIN advertisment a ON a.id = r.ad_id
      ${whereClause}
      ORDER BY r.priority DESC, r.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
      `,
      values
    );

    const totalCount = rows.length ? parseInt(rows[0].total_count) : 0;

    return {
      message: "Advertisement rules list",
      data: rows.map(({ total_count, ...r }) => r),
      pagination: {
        total:      totalCount,
        page:       parseInt(page),
        limit:      parseInt(limit),
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};

// ─── GET RULE BY ID ───────────────────────────────────────────────────────────

export const getAdvertismentRuleById = async ({ id }) => {
  const client = await adminDbPool.connect();

  try {
    const { rows } = await client.query(
      `
      SELECT r.*, a.name AS ad_name
      FROM advertisment_rules r
      LEFT JOIN advertisment a ON a.id = r.ad_id
      WHERE r.id = $1
      `,
      [id]
    );

    if (!rows.length) throw Boom.notFound("Advertisement rule not found");

    return { message: "Advertisement rule", data: rows[0] };
  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};

// ─── DELETE RULE ──────────────────────────────────────────────────────────────

export const deleteAdvertismentRule = async ({ id }) => {
  const client = await adminDbPool.connect();

  try {
    const { rows } = await client.query(
      `DELETE FROM advertisment_rules WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!rows.length) throw Boom.notFound("Advertisement rule not found");

    return { message: "Advertisement rule deleted", data: { id: rows[0].id } };
  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};


// ═══════════════════════════════════════════════════════════════════════════════
//  ADVERTISEMENT IMPRESSIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Record a new impression when an ad is shown to a user.
 * Also bumps the global view_count on the parent advertisement row.
 */
export const recordImpression = async ({ ad_id, user_id, session_id, page_name, slot_name }) => {
  const client = await adminDbPool.connect();

  try {
    await client.query("BEGIN");

    // Insert impression
    const { rows } = await client.query(
      `
      INSERT INTO advertisment_impressions
        (ad_id, user_id, session_id, page_name, slot_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [ad_id, user_id ?? null, session_id ?? null, page_name, slot_name]
    );

    // Bump parent view_count
    await client.query(
      `
      UPDATE advertisment
      SET view_count = view_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [ad_id]
    );

    await client.query("COMMIT");

    return { message: "Impression recorded", data: rows[0] };
  } catch (err) {
    await client.query("ROLLBACK");
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};

// ─── RECORD CLICK ─────────────────────────────────────────────────────────────

/**
 * Mark an existing impression as clicked.
 * `id` is the impression row id returned from recordImpression.
 */
export const recordClick = async ({ id }) => {
  const client = await adminDbPool.connect();

  try {
    const { rows } = await client.query(
      `
      UPDATE advertisment_impressions
      SET clicked_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND clicked_at IS NULL
      RETURNING *
      `,
      [id]
    );

    if (!rows.length)
      throw Boom.notFound("Impression not found or already marked as clicked");

    return { message: "Click recorded", data: rows[0] };
  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};

// ─── LIST IMPRESSIONS ─────────────────────────────────────────────────────────

/**
 * List impressions with optional filters:
 * ad_id, user_id, session_id, page_name, slot_name, from_date, to_date,
 * clicked_only, page, limit.
 */
export const listImpressions = async (query = {}) => {
  const client = await adminDbPool.connect();

  try {
    const {
      ad_id, user_id, session_id, page_name, slot_name,
      from_date, to_date,
      clicked_only,
      page = 1, limit = 20,
    } = query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];

    if (ad_id !== undefined) {
      values.push(ad_id);
      conditions.push(`i.ad_id = $${values.length}`);
    }
    if (user_id !== undefined) {
      values.push(user_id);
      conditions.push(`i.user_id = $${values.length}`);
    }
    if (session_id !== undefined) {
      values.push(session_id);
      conditions.push(`i.session_id = $${values.length}`);
    }
    if (page_name !== undefined) {
      values.push(page_name);
      conditions.push(`i.page_name = $${values.length}`);
    }
    if (slot_name !== undefined) {
      values.push(slot_name);
      conditions.push(`i.slot_name = $${values.length}`);
    }
    if (from_date !== undefined) {
      values.push(from_date);
      conditions.push(`i.shown_at >= $${values.length}`);
    }
    if (to_date !== undefined) {
      values.push(to_date);
      conditions.push(`i.shown_at <= $${values.length}`);
    }
    if (clicked_only === true || clicked_only === "true") {
      conditions.push(`i.clicked_at IS NOT NULL`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    values.push(limit, offset);

    const { rows } = await client.query(
      `
      SELECT
        i.*,
        a.name AS ad_name,
        COUNT(*) OVER() AS total_count
      FROM advertisment_impressions i
      LEFT JOIN advertisment a ON a.id = i.ad_id
      ${whereClause}
      ORDER BY i.shown_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
      `,
      values
    );

    const totalCount = rows.length ? parseInt(rows[0].total_count) : 0;

    return {
      message: "Impression list",
      data: rows.map(({ total_count, ...r }) => r),
      pagination: {
        total:      totalCount,
        page:       parseInt(page),
        limit:      parseInt(limit),
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};

// ─── IMPRESSION STATS ─────────────────────────────────────────────────────────

/**
 * Aggregated stats for one or all advertisements.
 * Optionally filter by ad_id, from_date, to_date.
 * Returns per-ad breakdown: total_impressions, total_clicks, ctr, and
 * a breakdown by page_name + slot_name.
 */
export const getImpressionStats = async (query = {}) => {
  const client = await adminDbPool.connect();

  try {
    const { ad_id, from_date, to_date } = query;

    const conditions = [];
    const values = [];

    if (ad_id !== undefined) {
      values.push(ad_id);
      conditions.push(`i.ad_id = $${values.length}`);
    }
    if (from_date !== undefined) {
      values.push(from_date);
      conditions.push(`i.shown_at >= $${values.length}`);
    }
    if (to_date !== undefined) {
      values.push(to_date);
      conditions.push(`i.shown_at <= $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    // Overall stats per ad
    const { rows: summary } = await client.query(
      `
      SELECT
        i.ad_id,
        a.name                                                    AS ad_name,
        COUNT(*)                                                  AS total_impressions,
        COUNT(i.clicked_at)                                       AS total_clicks,
        ROUND(
          COUNT(i.clicked_at)::NUMERIC / NULLIF(COUNT(*), 0) * 100,
          2
        )                                                         AS ctr_percent
      FROM advertisment_impressions i
      LEFT JOIN advertisment a ON a.id = i.ad_id
      ${whereClause}
      GROUP BY i.ad_id, a.name
      ORDER BY total_impressions DESC
      `,
      values
    );

    // Page + slot breakdown (uses same filters)
    const { rows: breakdown } = await client.query(
      `
      SELECT
        i.ad_id,
        i.page_name,
        i.slot_name,
        COUNT(*)            AS impressions,
        COUNT(i.clicked_at) AS clicks,
        ROUND(
          COUNT(i.clicked_at)::NUMERIC / NULLIF(COUNT(*), 0) * 100,
          2
        )                   AS ctr_percent
      FROM advertisment_impressions i
      ${whereClause}
      GROUP BY i.ad_id, i.page_name, i.slot_name
      ORDER BY i.ad_id, impressions DESC
      `,
      values
    );

    // Attach breakdown array to each summary row
    const breakdownMap = breakdown.reduce((acc, row) => {
      (acc[row.ad_id] = acc[row.ad_id] || []).push(row);
      return acc;
    }, {});

    const data = summary.map((s) => ({
      ...s,
      breakdown: breakdownMap[s.ad_id] ?? [],
    }));

    return { message: "Impression stats", data };
  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};


// ═══════════════════════════════════════════════════════════════════════════════
//  AD SERVING — ELIGIBILITY ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns all ads eligible to be shown for a given page + slot combination.
 *
 * Rules enforced:
 *   • rule.is_enabled must be TRUE
 *   • advertisement.is_active must be TRUE
 *   • now must be within [start_at, end_at] if set
 *   • max_shows_per_user  (0 = unlimited) — counts user's all-time impressions
 *   • max_shows_per_day   (0 = unlimited) — counts user's impressions today
 *   • max_shows_per_session (0 = unlimited) — counts impressions for session_id
 *   • min_interval_seconds — ensures enough time since the last impression
 *
 * Results are ordered by rule.priority DESC.
 *
 * @param {object} params
 * @param {string} params.page_name
 * @param {string} params.slot_name
 * @param {string|null} params.user_id
 * @param {string|null} params.session_id
 * @returns {{ message: string, data: object[] }}
 */
export const getEligibleAds = async ({ page_name, slot_name, user_id, session_id }) => {
  const client = await adminDbPool.connect();

  try {
    // 1. Fetch all candidate rules + their ads for this page/slot
    const { rows: candidates } = await client.query(
      `
      SELECT
        r.*,
        a.id          AS advertisement_id,
        a.name, a.header, a.body, a.footer,
        a.contact_us,
        a.linkname_1, a.link_1,
        a.linkname_2, a.link_2,
        a.view_count,
        COALESCE(
          (
            SELECT JSON_AGG(
              JSON_BUILD_OBJECT(
                'id',        fl.id,
                'type',      fl.type,
                'key',       fl.file->>'key',
                'url',       fl.file->>'url',
                'file_name', fl.file->>'file_name'
              )
            )
            FROM advertisment_filelist fl
            WHERE fl.ad_id = a.id
          ),
          '[]'
        ) AS files
      FROM advertisment_rules r
      INNER JOIN advertisment a ON a.id = r.ad_id
      WHERE
        r.page_name  = $1
        AND r.slot_name  = $2
        AND r.is_enabled = TRUE
        AND a.is_active  = TRUE
        AND (r.start_at IS NULL OR r.start_at <= NOW())
        AND (r.end_at   IS NULL OR r.end_at   >= NOW())
      ORDER BY r.priority DESC
      `,
      [page_name, slot_name]
    );

    if (!candidates.length) {
      return { message: "No eligible advertisements", data: [] };
    }

    const adIds = candidates.map((c) => c.ad_id);

    // 2. Pull impression counts in bulk for all candidate ads
    //    We gather three counters per ad per viewer:
    //      all-time user count, today user count, session count, last shown timestamp
    const { rows: impressionStats } = await client.query(
      `
      SELECT
        ad_id,
        COUNT(*)                                                              AS total_user_count,
        COUNT(*) FILTER (WHERE shown_at >= CURRENT_DATE)                      AS today_count,
        COUNT(*) FILTER (WHERE session_id = $2)                               AS session_count,
        MAX(shown_at)                                                         AS last_shown_at
      FROM advertisment_impressions
      WHERE
        ad_id = ANY($1)
        AND (
          ($3::UUID IS NOT NULL AND user_id = $3::UUID)
          OR
          ($2 IS NOT NULL AND session_id = $2)
        )
      GROUP BY ad_id
      `,
      [adIds, session_id ?? null, user_id ?? null]
    );

    // Index stats by ad_id for O(1) lookup
    const statsMap = impressionStats.reduce((acc, s) => {
      acc[s.ad_id] = s;
      return acc;
    }, {});

    const now = Date.now();

    // 3. Filter candidates against their rules
    const eligible = candidates.filter((rule) => {
      const stats = statsMap[rule.ad_id];

      // max_shows_per_user (0 = unlimited)
      if (
        rule.max_shows_per_user > 0 &&
        stats &&
        parseInt(stats.total_user_count) >= rule.max_shows_per_user
      ) {
        return false;
      }

      // max_shows_per_day (0 = unlimited)
      if (
        rule.max_shows_per_day > 0 &&
        stats &&
        parseInt(stats.today_count) >= rule.max_shows_per_day
      ) {
        return false;
      }

      // max_shows_per_session (0 = unlimited)
      if (
        rule.max_shows_per_session > 0 &&
        stats &&
        parseInt(stats.session_count) >= rule.max_shows_per_session
      ) {
        return false;
      }

      // min_interval_seconds (0 = no restriction)
      if (rule.min_interval_seconds > 0 && stats?.last_shown_at) {
        const secondsSinceLast = (now - new Date(stats.last_shown_at).getTime()) / 1000;
        if (secondsSinceLast < rule.min_interval_seconds) return false;
      }

      return true;
    });

    // 4. Shape response — expose the ad payload, not internal rule fields
    const result = eligible.map((rule) => ({
      rule_id:              rule.id,
      priority:             rule.priority,
      slot_name:            rule.slot_name,
      page_name:            rule.page_name,
      advertisement: {
        id:         rule.advertisement_id,
        name:       rule.name,
        header:     rule.header,
        body:       rule.body,
        footer:     rule.footer,
        contact_us: rule.contact_us,
        linkname_1: rule.linkname_1,
        link_1:     rule.link_1,
        linkname_2: rule.linkname_2,
        link_2:     rule.link_2,
        view_count: rule.view_count,
        files:      rule.files,
      },
    }));

    return { message: "Eligible advertisements", data: result };
  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};


// ═══════════════════════════════════════════════════════════════════════════════
//  RE-EXPORTS  — original CRUD (unchanged, kept here for a single import point)
// ═══════════════════════════════════════════════════════════════════════════════

// export const upsertAdvertisment = async (payload, loggedUser) => {
//   const client = await adminDbPool.connect();
//   const userId = loggedUser.id;

//   try {
//     await client.query("BEGIN");

//     const {
//       id, name, header, body, footer, is_active,
//       contact_us,
//       linkname_1, link_1,
//       linkname_2, link_2,
//       files,
//     } = payload;

//     let adId;

//     if (id) {
//       const { rows } = await client.query(
//         `
//         UPDATE advertisment
//         SET
//           name        = COALESCE($1,  name),
//           header      = COALESCE($2,  header),
//           body        = COALESCE($3,  body),
//           footer      = COALESCE($4,  footer),
//           is_active   = COALESCE($5,  is_active),
//           contact_us  = COALESCE($6,  contact_us),
//           linkname_1  = COALESCE($7,  linkname_1),
//           link_1      = COALESCE($8,  link_1),
//           linkname_2  = COALESCE($9,  linkname_2),
//           link_2      = COALESCE($10, link_2),
//           updated_at  = CURRENT_TIMESTAMP
//         WHERE id = $11
//         RETURNING *
//         `,
//         [name, header, body, footer, is_active, contact_us,
//           linkname_1, link_1, linkname_2, link_2, id]
//       );
//       if (!rows.length) throw Boom.notFound("Advertisement not found");
//       adId = rows[0].id;
//     } else {
//       const { rows } = await client.query(
//         `
//         INSERT INTO advertisment
//           (created_by, name, header, body, footer, is_active, contact_us,
//            linkname_1, link_1, linkname_2, link_2)
//         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
//         RETURNING *
//         `,
//         [
//           userId, name, header, body, footer,
//           is_active  ?? true,
//           contact_us ?? null,
//           linkname_1 ?? null, link_1 ?? null,
//           linkname_2 ?? null, link_2 ?? null,
//         ]
//       );
//       adId = rows[0].id;
//     }

//     if (files && Array.isArray(files) && files.length > 0) {
//       const newFiles = id ? files.filter((f) => !f.id) : files;
//       if (newFiles.length > 0) {
//         for (const f of newFiles) {
//           await client.query(
//             `INSERT INTO advertisment_filelist (ad_id, file, type) VALUES ($1, $2, $3)`,
//             [adId, JSON.stringify({ key: f.key, url: f.url, file_name: f.file_name }), f.type]
//           );
//         }
//       }
//     }

//     const { rows: result } = await client.query(
//       `
//       SELECT
//         a.*,
//         COALESCE(
//           JSON_AGG(
//             JSON_BUILD_OBJECT(
//               'id',        fl.id,
//               'type',      fl.type,
//               'key',       fl.file->>'key',
//               'url',       fl.file->>'url',
//               'file_name', fl.file->>'file_name'
//             )
//           ) FILTER (WHERE fl.id IS NOT NULL),
//           '[]'
//         ) AS files
//       FROM advertisment a
//       LEFT JOIN advertisment_filelist fl ON fl.ad_id = a.id
//       WHERE a.id = $1
//       GROUP BY a.id
//       `,
//       [adId]
//     );

//     await client.query("COMMIT");

//     return {
//       message: id ? "Advertisement updated" : "Advertisement created",
//       data: result[0],
//     };
//   } catch (err) {
//     await client.query("ROLLBACK");
//     throw Boom.conflict(err.message);
//   } finally {
//     client.release();
//   }
// };

export const upsertAdvertisment = async (payload, loggedUser) => {
  const client = await adminDbPool.connect();
  const userId = loggedUser.id;
 
  try {
    await client.query("BEGIN");
 
    const {
      id,
      name,
      logo,                        // JSONB  { key, url, file_name }
      header,
      subheader,
      body,
      footer,
      is_active,
      contact_us,
      linkname_1, link_1,
      linkname_2, link_2,
      linkname_3, link_3,
      files,
      ui_config,                   // NEW
      ad_type,                     // new — e.g. "sponsored"
      offer_header,                // new
      offer_subheader,             // new
      offer_details,               // new
      ad_display_type,             // new — "standard" | "popup" | "video"
      link_btn_text,               // new
      btn_icon 
    } = payload;
    console.log(btn_icon)
 
    let adId;
 
    if (id) {
      // ── UPDATE ──────────────────────────────────────────────────────────────
      const { rows } = await client.query(
        `
        UPDATE advertisment
        SET
          name        = COALESCE($1,  name),
          logo        = COALESCE($2,  logo),
          header      = COALESCE($3,  header),
          subheader   = COALESCE($4,  subheader),
          body        = COALESCE($5,  body),
          footer      = COALESCE($6,  footer),
          is_active   = COALESCE($7,  is_active),
          contact_us  = COALESCE($8,  contact_us),
          linkname_1  = COALESCE($9,  linkname_1),
          link_1      = COALESCE($10, link_1),
          linkname_2  = COALESCE($11, linkname_2),
          link_2      = COALESCE($12, link_2),
          linkname_3  = COALESCE($13, linkname_3),
          link_3      = COALESCE($14, link_3),
          ad_type         = COALESCE($15, ad_type),
          offer_header    = COALESCE($16, offer_header),
          offer_subheader = COALESCE($17, offer_subheader),
          offer_details   = COALESCE($18, offer_details),
          ad_display_type = COALESCE($19, ad_display_type),
          link_btn_text =  COALESCE($20, link_btn_text),
          btn_icon = COALESCE($21, btn_icon),
          updated_at  = CURRENT_TIMESTAMP
        WHERE id = $22
        RETURNING *
        `,
        [
          name,
          logo ? JSON.stringify(logo) : null,
          header    ?? null,
          subheader ?? null,
          body      ?? null,
          footer    ?? null,
          is_active ?? null,
          contact_us ?? null,
          linkname_1 ?? null, link_1 ?? null,
          linkname_2 ?? null, link_2 ?? null,
          linkname_3 ?? null, link_3 ?? null,
          ad_type         ?? null,
          offer_header    ?? null,
          offer_subheader ?? null,
          offer_details   ?? null,
          ad_display_type ?? null,
          link_btn_text ?? null,
          btn_icon.length >0 ? JSON.stringify(btn_icon[0]) : null,
          id,
        ]
      );
 
      if (!rows.length) throw Boom.notFound("Advertisement not found");
      adId = rows[0].id;
      
    } else {
      // ── INSERT ──────────────────────────────────────────────────────────────
      const { rows } = await client.query(
        `
        INSERT INTO advertisment
          (created_by, name, logo, header, subheader, body, footer,
           is_active, contact_us,
           linkname_1, link_1,
           linkname_2, link_2,
           linkname_3, link_3,ad_type, offer_header, offer_subheader, offer_details, ad_display_type,link_btn_text,btn_icon)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,$16, $17, $18, $19, $20,$21,$22)
        RETURNING *
        `,
        [
          userId,
          name,
          logo       ? JSON.stringify(logo) : null,
          header     ?? null,
          subheader  ?? null,
          body       ?? null,
          footer     ?? null,
          is_active  ?? true,
          contact_us ?? null,
          linkname_1 ?? null, link_1 ?? null,
          linkname_2 ?? null, link_2 ?? null,
          linkname_3 ?? null, link_3 ?? null,
          ad_type         ?? "sponsored",
          offer_header    ?? null,
          offer_subheader ?? null,
          offer_details   ?? null,
          ad_display_type ?? "standard",
          link_btn_text ?? null,
          btn_icon.length >0 ? JSON.stringify(btn_icon[0]) : null,
        ]
      );
      adId = rows[0].id;
    }

    // Make only one ad active
    const shouldBeActive = is_active ?? true;

    if (shouldBeActive) {
      await client.query(
        `
        UPDATE advertisment
        SET is_active = false,
            updated_at = CURRENT_TIMESTAMP
        WHERE id <> $1
          AND is_active = true
        `,
        [adId]
      );

      await client.query(
        `
        UPDATE advertisment
        SET is_active = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [adId]
      );
    }
 
    // ── UI CONFIG ────────────────────────────────────────────────────────────
    if (ui_config && typeof ui_config === "object") {
      await client.query(
        `
        INSERT INTO advertisment_ui_config (ad_id, payload)
        VALUES ($1, $2::jsonb)
        ON CONFLICT (ad_id)
        DO UPDATE SET
          payload = EXCLUDED.payload,
          updated_at = CURRENT_TIMESTAMP
        `,
        [adId, JSON.stringify(ui_config)]
      );
    }
 
    // ── FILES ────────────────────────────────────────────────────────────────
    if (files && Array.isArray(files) && files.length > 0) {
      const newFiles = id ? files.filter((f) => !f.id) : files;
      for (const f of newFiles) {
        await client.query(
          `INSERT INTO advertisment_filelist (ad_id, file, type) VALUES ($1, $2, $3)`,
          [adId, JSON.stringify({ key: f.key, url: f.url, file_name: f.file_name }), f.type]
        );
      }
    }
 
    // ── RETURN FULL ROW ──────────────────────────────────────────────────────
    const { rows: result } = await client.query(
      `
      SELECT
        a.*,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id',        fl.id,
              'type',      fl.type,
              'key',       fl.file->>'key',
              'url',       fl.file->>'url',
              'file_name', fl.file->>'file_name'
            )
          ) FILTER (WHERE fl.id IS NOT NULL),
          '[]'
        ) AS files
      FROM advertisment a
      LEFT JOIN advertisment_filelist fl ON fl.ad_id = a.id
      WHERE a.id = $1
      GROUP BY a.id
      `,
      [adId]
    );
 
    await client.query("COMMIT");
 
    return {
      message: id ? "Advertisement updated" : "Advertisement created",
      data: result[0],
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("upsertAdvertisment error:", err);
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};

export const incrementAdViewCount = async (adId) => {
  const client = await adminDbPool.connect();
  try {
    const { rows } = await client.query(
      `UPDATE advertisment SET view_count = view_count + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING id, view_count`,
      [adId]
    );
    if (!rows.length) throw Boom.notFound("Advertisement not found");
    return { message: "View count updated", data: rows[0] };
  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};

// export const listAdvertisment = async (query = {}) => {
//   const client = await adminDbPool.connect();
//   try {
//     const { is_active, page = 1, limit = 10 } = query;
//     const offset = (page - 1) * limit;

//     const conditions = [];
//     const values = [];

//     if (is_active !== undefined) {
//       values.push(is_active);
//       conditions.push(`a.is_active = $${values.length}`);
//     }

//     const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
//     values.push(limit, offset);

 
//     const { rows } = await client.query(
//   `
//   WITH file_agg AS (
//     SELECT
//       ad_id,
//       COALESCE(
//         JSON_AGG(
//           JSON_BUILD_OBJECT(
//             'id',        id,
//             'type',      type,
//             'key',       file->>'key',
//             'url',       file->>'url',
//             'file_name', file->>'file_name'
//           )
//         ) FILTER (WHERE id IS NOT NULL),
//         '[]'
//       ) AS files
//     FROM advertisment_filelist
//     GROUP BY ad_id
//   ),
//   rule_agg AS (
//     SELECT
//       ad_id,
//       COALESCE(
//         JSON_AGG(
//           JSON_BUILD_OBJECT(
//             'id',                   id,
//             'page_name',            page_name,
//             'slot_name',            slot_name,
//             'min_interval_seconds', min_interval_seconds,
//             'max_shows_per_user',   max_shows_per_user,
//             'max_shows_per_day',    max_shows_per_day,
//             'max_shows_per_session', max_shows_per_session,
//             'priority',             priority,
//             'start_at',             start_at,
//             'end_at',               end_at,
//             'is_enabled',           is_enabled
//           )
//           ORDER BY priority DESC, created_at DESC
//         ) FILTER (WHERE id IS NOT NULL),
//         '[]'
//       ) AS rules
//     FROM advertisment_rules
//     GROUP BY ad_id
//   )
//   SELECT
//     a.*,
//     COALESCE(fa.files, '[]') AS files,
//     COALESCE(ra.rules, '[]') AS rules,
//     COUNT(*) OVER() AS total_count
//   FROM advertisment a
//   LEFT JOIN file_agg fa ON fa.ad_id = a.id
//   LEFT JOIN rule_agg ra ON ra.ad_id = a.id
//   ${whereClause}
//   ORDER BY a.created_at DESC
//   LIMIT $${values.length - 1}
//   OFFSET $${values.length}
//   `,
//   values
// );
//     const totalCount = rows.length ? parseInt(rows[0].total_count) : 0;

//     return {
//       message: "Advertisement List",
//       data: rows,
//       pagination: {
//         total:      totalCount,
//         page:       parseInt(page),
//         limit:      parseInt(limit),
//         totalPages: Math.ceil(totalCount / limit),
//       },
//     };
//   } catch (err) {
//     throw Boom.conflict(err.message);
//   } finally {
//     client.release();
//   }
// };

export const listAdvertisment = async (query = {}) => {
  const client = await adminDbPool.connect();
  try {
    const { is_active, page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];

    // if is_active is empty, send all data
    if (is_active !== undefined && is_active !== null && is_active !== '') {
      const activeValue =
        is_active === true || is_active === 'true' || is_active === '1'
          ? true
          : is_active === false || is_active === 'false' || is_active === '0'
            ? false
            : null;

      if (activeValue !== null) {
        values.push(activeValue);
        conditions.push(`a.is_active = $${values.length}`);
      }
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    values.push(limit, offset);

    const { rows } = await client.query(
      `
      WITH file_agg AS (
        SELECT
          ad_id,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id',        id,
                'type',      type,
                'key',       file->>'key',
                'url',       file->>'url',
                'file_name', file->>'file_name'
              )
            ) FILTER (WHERE id IS NOT NULL),
            '[]'
          ) AS files
        FROM advertisment_filelist
        GROUP BY ad_id
      ),
      rule_agg AS (
        SELECT
          ad_id,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id',                   id,
                'page_name',            page_name,
                'slot_name',            slot_name,
                'min_interval_seconds', min_interval_seconds,
                'max_shows_per_user',   max_shows_per_user,
                'max_shows_per_day',    max_shows_per_day,
                'max_shows_per_session', max_shows_per_session,
                'priority',             priority,
                'start_at',             start_at,
                'end_at',               end_at,
                'is_enabled',           is_enabled
              )
              ORDER BY priority DESC, created_at DESC
            ) FILTER (WHERE id IS NOT NULL),
            '[]'
          ) AS rules
        FROM advertisment_rules
        GROUP BY ad_id
      )
      SELECT
        a.*,
        COALESCE(ui.payload, '{}'::jsonb) AS ui_config,
        COALESCE(fa.files, '[]') AS files,
        COALESCE(ra.rules, '[]') AS rules,
        COUNT(*) OVER() AS total_count
      FROM advertisment a
      LEFT JOIN file_agg fa ON fa.ad_id = a.id
      LEFT JOIN rule_agg ra ON ra.ad_id = a.id
      LEFT JOIN advertisment_ui_config ui ON ui.ad_id = a.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
      `,
      values
    );

    const totalCount = rows.length ? parseInt(rows[0].total_count) : 0;

    return {
      message: "Advertisement List",
      data: rows,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};

export const deleteAdvertisment = async ({ id }, loggedUser) => {
  const client = await adminDbPool.connect();
  try {
    const { rows } = await client.query(
      `DELETE FROM advertisment WHERE id = $1 RETURNING id`,
      [id]
    );
    if (!rows.length) throw Boom.notFound("Advertisement not found");
    return { message: "Advertisement deleted", data: { id: rows[0].id } };
  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};

export const deleteAdvertismentfile = async ({ id }, loggedUser) => {
  const client = await adminDbPool.connect();
  try {
    const { rows } = await client.query(
      `DELETE FROM advertisment_filelist WHERE id = $1 RETURNING id`,
      [id]
    );
    if (!rows.length) throw Boom.notFound("Advertisement files not found");
    return { message: "Advertisement files deleted", data: { id: rows[0].id } };
  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};





// export const getActiveAd = async ({ device_id, fcm_token, user_id }) => {
//   const client = await adminDbPool.connect();
 
//   try {
//     await client.query("BEGIN");
 
//     // ── 1. Fetch the single active ad with files + rules ─────────────────────
//     const { rows: adRows } = await client.query(`
//       WITH file_agg AS (
//         SELECT
//           ad_id,
//           COALESCE(
//             JSON_AGG(
//               JSON_BUILD_OBJECT(
//                 'id',        id,
//                 'type',      type,
//                 'key',       file->>'key',
//                 'url',       file->>'url',
//                 'file_name', file->>'file_name'
//               )
//             ) FILTER (WHERE id IS NOT NULL),
//             '[]'
//           ) AS files
//         FROM advertisment_filelist
//         GROUP BY ad_id
//       ),
//       rule_agg AS (
//         SELECT
//           ad_id,
//           COALESCE(
//             JSON_AGG(
//               JSON_BUILD_OBJECT(
//                 'id',                    id,
//                 'page_name',             page_name,
//                 'slot_name',             slot_name,
//                 'min_interval_seconds',  min_interval_seconds,
//                 'max_shows_per_user',    max_shows_per_user,
//                 'max_shows_per_day',     max_shows_per_day,
//                 'max_shows_per_session', max_shows_per_session,
//                 'priority',              priority,
//                 'start_at',              start_at,
//                 'end_at',                end_at,
//                 'is_enabled',            is_enabled
//               )
//               ORDER BY priority DESC, created_at DESC
//             ) FILTER (WHERE id IS NOT NULL),
//             '[]'
//           ) AS rules
//         FROM advertisment_rules
//         GROUP BY ad_id
//       )
//       SELECT
//         a.*,
//         COALESCE(fa.files, '[]') AS files,
//         COALESCE(ra.rules, '[]') AS rules
//       FROM advertisment a
//       LEFT JOIN file_agg  fa ON fa.ad_id = a.id
//       LEFT JOIN rule_agg  ra ON ra.ad_id = a.id
//       WHERE a.is_active = TRUE
//       LIMIT 1
//     `);
 
//     // ── 2. No active ad ───────────────────────────────────────────────────────
//     if (!adRows.length) {
//       await client.query("ROLLBACK");
//       return { eligible: false, data: null, message: "No active advertisement" };
//     }
 
//     const ad = adRows[0];
 
//     // ── 3. Pick the governing rule ────────────────────────────────────────────
//     // Highest-priority rule whose schedule window is currently open.
//     const rules       = Array.isArray(ad.rules) ? ad.rules : JSON.parse(ad.rules ?? "[]");
//     const nowIST      = dayjs().tz(IST);
//     const activeRules = rules
//       .filter((r) => {
//         if (!r.is_enabled) return false;
//         if (r.start_at && dayjs(r.start_at).tz(IST).isAfter(nowIST))  return false;
//         if (r.end_at   && dayjs(r.end_at).tz(IST).isBefore(nowIST))   return false;
//         return true;
//       })
//       .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
 
//     // If no rule is active yet — treat as unlimited (0)
//     const governingRule = activeRules[0] ?? null;
//     const maxPerDay     = governingRule ? parseInt(governingRule.max_shows_per_day) : 0;
 
//     const currentUTC = nowUTC();
 
//     // ── 4. Device session lookup ──────────────────────────────────────────────
//     const { rows: existing } = await client.query(
//       `SELECT * FROM device_sessions WHERE fcm_token = $1 LIMIT 1`,
//       [fcm_token]
//     );
 
//     // ─────────────────────────────────────────────
//     //  CASE A — New device, first ever call
//     // ─────────────────────────────────────────────
//     if (!existing.length) {
//       const { rows: inserted } = await client.query(
//         `
//         INSERT INTO device_sessions (device_id, fcm_token, user_id, view_count, expire_at)
//         VALUES ($1, $2, $3, 1, $4)
//         RETURNING session_id, view_count, expire_at
//         `,
//         [device_id, fcm_token, user_id ?? null, currentUTC]
//       );
 
//       await client.query("COMMIT");
 
//       return _eligibleResponse(ad, inserted[0], maxPerDay, "New device registered");
//     }
 
//     // ── 5. Existing device — compute window age ───────────────────────────────
//     const row              = existing[0];
//     const windowStart      = toIST(row.expire_at);
//     const hoursSinceWindow = nowIST.diff(windowStart, "hour", true);
 
//     // ─────────────────────────────────────────────
//     //  CASE D — 24-hour window has expired → RESET
//     // ─────────────────────────────────────────────
//     if (hoursSinceWindow >= 24) {
//       const { rows: updated } = await client.query(
//         `
//         UPDATE device_sessions
//         SET
//           view_count = 1,
//           expire_at  = $1,
//           user_id    = COALESCE($2, user_id),
//           device_id  = $3
//         WHERE fcm_token = $4
//         RETURNING session_id, view_count, expire_at
//         `,
//         [currentUTC, user_id ?? null, device_id, fcm_token]
//       );
 
//       await client.query("COMMIT");
 
//       return _eligibleResponse(ad, updated[0], maxPerDay, "24-hour window reset");
//     }
 
//     // ── 6. Within window — check cap ─────────────────────────────────────────
//     const currentCount = parseInt(row.view_count);
 
//     // ─────────────────────────────────────────────
//     //  CASE B — Daily cap reached
//     // ─────────────────────────────────────────────
//     if (maxPerDay > 0 && currentCount >= maxPerDay) {
//       await client.query("ROLLBACK");
 
//       const resetsAt    = windowStart.add(24, "hour");
//       const minutesLeft = resetsAt.diff(nowIST, "minute");
 
//       return {
//         eligible:          false,
//         data:              null,
//         session_id:        row.session_id,
//         view_count:        currentCount,
//         max_per_day:       maxPerDay,
//         resets_in_minutes: minutesLeft > 0 ? minutesLeft : 0,
//         resets_at:         resetsAt.format("YYYY-MM-DD HH:mm:ss"),
//         message:           "Daily limit reached",
//       };
//     }
 
//     // ─────────────────────────────────────────────
//     //  CASE C — Within window, under cap → increment
//     // ─────────────────────────────────────────────
//     const { rows: updated } = await client.query(
//       `
//       UPDATE device_sessions
//       SET
//         view_count = view_count + 1,
//         user_id    = COALESCE($1, user_id),
//         device_id  = $2
//       WHERE fcm_token = $3
//       RETURNING session_id, view_count, expire_at
//       `,
//       [user_id ?? null, device_id, fcm_token]
//     );
 
//     await client.query("COMMIT");
 
//     return _eligibleResponse(ad, updated[0], maxPerDay, "Count incremented");
 
//   } catch (err) {
//     await client.query("ROLLBACK");
//     console.error("getActiveAd error:", err);
//     throw Boom.conflict(err.message);
//   } finally {
//     client.release();
//   }
// };
 
// // ─── Response shape helper ────────────────────────────────────────────────────
// // Keeps the ad payload identical to what listAdvertisment returns.
// const _eligibleResponse = (ad, sessionRow, maxPerDay, message) => ({
//   eligible:    true,
//   session_id:  sessionRow.session_id,
//   view_count:  sessionRow.view_count,
//   max_per_day: maxPerDay === 0 ? "unlimited" : maxPerDay,
//   window_start: toIST(sessionRow.expire_at).format("YYYY-MM-DD HH:mm:ss"),
//   message,
//   data: {
//     id:          ad.id,
//     created_by:  ad.created_by,
//     name:        ad.name,
//     header:      ad.header,
//     body:        ad.body,
//     footer:      ad.footer,
//     is_active:   ad.is_active,
//     contact_us:  ad.contact_us,
//     linkname_1:  ad.linkname_1,
//     link_1:      ad.link_1,
//     linkname_2:  ad.linkname_2,
//     link_2:      ad.link_2,
//     view_count:  ad.view_count,
//     created_at:  ad.created_at,
//     updated_at:  ad.updated_at,
//     files:       ad.files,
//     rules:       ad.rules,
//   },
// });


export const getActiveAd = async ({ device_id, fcm_token, user_id }) => {
  const client = await adminDbPool.connect();
 
  try {
    await client.query("BEGIN");
 
    // ── 1. Active ad with files + rules ──────────────────────────────────────
    const { rows: adRows } = await client.query(`
      WITH file_agg AS (
        SELECT
          ad_id,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id',        id,
                'type',      type,
                'key',       file->>'key',
                'url',       file->>'url',
                'file_name', file->>'file_name'
              )
            ) FILTER (WHERE id IS NOT NULL),
            '[]'
          ) AS files
        FROM advertisment_filelist
        GROUP BY ad_id
      ),
      rule_agg AS (
        SELECT
          ad_id,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id',                    id,
                'page_name',             page_name,
                'slot_name',             slot_name,
                'min_interval_seconds',  min_interval_seconds,
                'max_shows_per_user',    max_shows_per_user,
                'max_shows_per_day',     max_shows_per_day,
                'max_shows_per_session', max_shows_per_session,
                'priority',              priority,
                'start_at',             start_at,
                'end_at',               end_at,
                'is_enabled',           is_enabled
              )
              ORDER BY priority DESC, created_at DESC
            ) FILTER (WHERE id IS NOT NULL),
            '[]'
          ) AS rules
        FROM advertisment_rules
        GROUP BY ad_id
      ),
      ui_agg AS (
        SELECT
          ad_id,
          COALESCE(payload, '{}'::jsonb) AS ui_config
        FROM advertisment_ui_config
      )
      SELECT
        a.id,
        a.created_by,
        a.name,
        a.logo,
        a.header,
        a.subheader,
        a.body,
        a.footer,
        a.is_active,
        a.contact_us,
        a.linkname_1, a.link_1,
        a.linkname_2, a.link_2,
        a.linkname_3, a.link_3,
        a.ad_type,
        a.offer_header,
        a.offer_subheader,
        a.offer_details,
        a.ad_display_type,
        a.view_count,
        a.link_btn_text,
        a.btn_icon,
        a.created_at,
        a.updated_at,
        COALESCE(fa.files, '[]') AS files,
        COALESCE(ra.rules, '[]') AS rules,
        COALESCE(ua.ui_config, '{}'::jsonb) AS ui_config
      FROM advertisment a
      LEFT JOIN file_agg  fa ON fa.ad_id = a.id
      LEFT JOIN rule_agg  ra ON ra.ad_id = a.id
      LEFT JOIN ui_agg ua ON ua.ad_id = a.id
      WHERE a.is_active = TRUE
      LIMIT 1
    `);
 
    // ── 2. No active ad ───────────────────────────────────────────────────────
    if (!adRows.length) {
      await client.query("ROLLBACK");
      return { eligible: false, data: null, message: "No active advertisement" };
    }
 
    const ad = adRows[0];

    console.log("fetched ad------>",ad)
 
    // ── 3. Governing rule ─────────────────────────────────────────────────────
    const rules       = Array.isArray(ad.rules) ? ad.rules : JSON.parse(ad.rules ?? "[]");
    const nowIST      = dayjs().tz(IST);
    console.log("ad rules----->",rules)
    console.log("nowIST", nowIST.format());
    console.log("start_at", dayjs(rules[0].start_at).tz("Asia/Kolkata", true).format());
    console.log("end_at", dayjs(rules[0].end_at).tz("Asia/Kolkata", true).format());
    // const activeRules = rules
    //   .filter((r) => {
    //     if (!r.is_enabled) return false;
    //     if (r.start_at && dayjs(r.start_at).tz(IST).isAfter(nowIST))  return false;
    //     if (r.end_at   && dayjs(r.end_at).tz(IST).isBefore(nowIST))   return false;
    //     return true;
    //   })
    //   .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    const activeRules = rules
  .filter((r) => {
    if (!r.is_enabled) return false;

    const startAt = r.start_at
      ? dayjs(r.start_at).tz("Asia/Kolkata", true)
      : null;

    const endAt = r.end_at
      ? dayjs(r.end_at).tz("Asia/Kolkata", true)
      : null;

    if (startAt && startAt.isAfter(nowIST)) return false;
    if (endAt && endAt.isBefore(nowIST)) return false;

    return true;
  })
  .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    console.log("activeRules ad------>",activeRules)
 
    const governingRule = activeRules[0] ?? null;
    const maxPerDay     = governingRule ? parseInt(governingRule.max_shows_per_day) : 0;
    console.log("activeRules maxprday ad------>",maxPerDay)
 
    const currentUTC = nowUTC();
 
    // ── 4. Device session lookup ──────────────────────────────────────────────
    const { rows: existing } = await client.query(
      `SELECT * FROM device_sessions WHERE fcm_token = $1 LIMIT 1`,
      [fcm_token]
    );
 
    // ── CASE A: new device ────────────────────────────────────────────────────
    if (!existing.length) {
      const { rows: inserted } = await client.query(
        `
        INSERT INTO device_sessions (device_id, fcm_token, user_id, view_count, expire_at)
        VALUES ($1, $2, $3, 1, $4)
        RETURNING session_id, view_count, expire_at
        `,
        [device_id, fcm_token, user_id ?? null, currentUTC]
      );
      await client.query("COMMIT");
    console.log("max per day inserted ad------>",maxPerDay)

      return _eligibleResponse(ad, inserted[0], maxPerDay, "New device registered");
    }
 
    const row              = existing[0];
    const windowStart      = toIST(row.expire_at);
    const hoursSinceWindow = nowIST.diff(windowStart, "hour", true);
 
    // ── CASE D: window expired → reset ────────────────────────────────────────
    if (hoursSinceWindow >= 24) {
      const { rows: updated } = await client.query(
        `
        UPDATE device_sessions
        SET view_count = 1, expire_at = $1,
            user_id = COALESCE($2, user_id), device_id = $3
        WHERE fcm_token = $4
        RETURNING session_id, view_count, expire_at
        `,
        [currentUTC, user_id ?? null, device_id, fcm_token]
      );
      await client.query("COMMIT");
    console.log("max per day 24hrs reset ad------>",maxPerDay)

      return _eligibleResponse(ad, updated[0], maxPerDay, "24-hour window reset");
    }
 
    const currentCount = parseInt(row.view_count);
 
    // ── CASE B: daily cap hit ─────────────────────────────────────────────────
    if (maxPerDay > 0 && currentCount >= maxPerDay) {
      await client.query("ROLLBACK");
      const resetsAt    = windowStart.add(24, "hour");
      const minutesLeft = resetsAt.diff(nowIST, "minute");
      return {
        eligible:          false,
        data:              null,
        session_id:        row.session_id,
        view_count:        currentCount,
        max_per_day:       maxPerDay,
        resets_in_minutes: minutesLeft > 0 ? minutesLeft : 0,
        resets_at:         resetsAt.format("YYYY-MM-DD HH:mm:ss"),
        message:           "Daily limit reached",
      };
    }

    if(!activeRules.length){
      await client.query("ROLLBACK");
           return {
        eligible:          false,
        data:              null,
        session_id:        row.session_id,
        // view_count:        currentCount,
        // max_per_day:       maxPerDay,
        // resets_in_minutes: minutesLeft > 0 ? minutesLeft : 0,
        // resets_at:         resetsAt.format("YYYY-MM-DD HH:mm:ss"),
        message:           "No Active Ad Found",
      };
    }
 
    // ── CASE C: within window, under cap → increment ──────────────────────────
    const { rows: updated } = await client.query(
      `
      UPDATE device_sessions
      SET view_count = view_count + 1,
          user_id = COALESCE($1, user_id), device_id = $2
      WHERE fcm_token = $3
      RETURNING session_id, view_count, expire_at
      `,
      [user_id ?? null, device_id, fcm_token]
    );
    await client.query("COMMIT");
    console.log("max per day incremented ad------>",maxPerDay)
    return _eligibleResponse(ad, updated[0], maxPerDay, "Count incremented");
 
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("getActiveAd error:", err);
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};
 
// ─── Shared response shape ────────────────────────────────────────────────────
const _eligibleResponse = (ad, sessionRow, maxPerDay, message) => ({
  eligible:    true,
  session_id:  sessionRow.session_id,
  view_count:  sessionRow.view_count,
  max_per_day: maxPerDay === 0 ? "unlimited" : maxPerDay,
  window_start: toIST(sessionRow.expire_at).format("YYYY-MM-DD HH:mm:ss"),
  message,
  data: {
    id:         ad.id,
    created_by: ad.created_by,
    name:       ad.name,
    logo:       ad.logo,
    header:     ad.header,
    subheader:  ad.subheader,
    body:       ad.body,
    footer:     ad.footer,
    is_active:  ad.is_active,
    contact_us: ad.contact_us,
    linkname_1: ad.linkname_1,  link_1: ad.link_1,
    linkname_2: ad.linkname_2,  link_2: ad.link_2,
    linkname_3: ad.linkname_3,  link_3: ad.link_3,
    view_count: ad.view_count,
    created_at: ad.created_at,
    updated_at: ad.updated_at,
    files:      ad.files,
    rules:      ad.rules,
    ad_type:         ad.ad_type,
    offer_header:    ad.offer_header,
    offer_subheader: ad.offer_subheader,
    offer_details:   ad.offer_details,
    ad_display_type: ad.ad_display_type,
    link_btn_text: ad.link_btn_text,
    btn_icon:ad.btn_icon,
    ui_config: ad.ui_config,
  },
});


// GET /advertisement/:ad_id/notifications
export const getAdNotifications = async (params) => {
  const { ad_id } = params;
  try {
    const { rows } = await adminDbPool.query(
      `SELECT * FROM advertisment_notification WHERE ad_id = $1 ORDER BY created_at ASC`,
      [ad_id]
    );
    return { data: rows };
  } catch (err) {

    throw Boom.internal(err.message);
  }
};

// POST /advertisement/:ad_id/notifications  — add one
export const addAdNotification = async (params, payload) => {
  const { ad_id } = params;
  const { title, sub_heading, body, banner_url } = payload;
  try {
    const { rows } = await adminDbPool.query(
      `INSERT INTO advertisment_notification (ad_id, title, sub_heading, body, banner_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [ad_id, title, sub_heading, body, banner_url ?? null]
    );
    return { data: rows[0] };
  } catch (err) {
    console.log(err)
    throw Boom.internal(err.message);
  }
};

// PUT /advertisement/notifications/:id  — update one
export const updateAdNotification = async (params, payload) => {
  const { id } = params;
  const { title, sub_heading, body, banner_url } = payload;
  try {
    const { rows } = await adminDbPool.query(
      `UPDATE advertisment_notification SET
        title       = COALESCE($1, title),
        sub_heading = COALESCE($2, sub_heading),
        body        = COALESCE($3, body),
        banner_url  = COALESCE($4, banner_url),
        updated_at  = NOW()
       WHERE id = $5 RETURNING *`,
      [title, sub_heading, body, banner_url, id]
    );
    if (!rows.length) throw Boom.notFound('Notification not found');
    return { data: rows[0] };
  } catch (err) {
    throw Boom.internal(err.message);
  }
};

// DELETE /advertisement/notifications/:id
export const deleteAdNotification = async (params) => {
  const { id } = params;
  try {
    await adminDbPool.query(
      `DELETE FROM advertisment_notification WHERE id = $1`,
      [id]
    );
    return { message: 'Deleted' };
  } catch (err) {
    throw Boom.internal(err.message);
  }
};


export const pushadnotificationForallusers = async(params)=>{
  // let {title,bodytxt} = body
  const client  = await existingPool.connect()
  const {id} = params
  try{


    const {rows:notificationAdcontent} = await adminDbPool.query(`
        SELECT * FROM advertisment_notification WHERE id = $1
      `,[id])

      if(!notificationAdcontent.length){
        throw Boom.internal("Notification content not found");
      } 



        const { rows: fcmTokens } = await client.query(
            `SELECT user_id, device_id, fcm_token 
             FROM fcm 
             WHERE isloggedout=false`
          );
          
          const userIds = fcmTokens.map((d)=>d.user_id)

          const { rows } = await client.query(
            `
            SELECT 
              user_id, device_id, fcm_token,
              ROW_NUMBER() OVER (PARTITION BY device_id ORDER BY created_at DESC) AS rn
            FROM fcm
            WHERE user_id = ANY($1::uuid[])
            `,
            [userIds]
          );
          console.log("⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️ active FCM tokens for users: rows",rows);

          // Split results in JS
          const activeUser = rows.filter(r => Number(r.rn) === 1);
          const inActiveUser = rows.filter(r => Number(r.rn) > 1);

          console.log("⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️ active FCM tokens for users:",{ activeUser, inActiveUser });
 
          const filteredInactiveUsers = inActiveUser.filter(
            inactive => !activeUser.some(active => active.user_id === inactive.user_id)
          )

          console.log("⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️ active FCM tokens for users: filtered",filteredInactiveUsers);

  

        // console.log("active check tokens----->",activeFcmTokens)


      for (const tokenRow of activeUser) {
      //  const {rows:userData} = await client.query(`select * from users where id=$1`,[tokenRow.user_id])
      //  console.log("push notification userData",userData,tokenRow.user_id, userData[0]?.name??'invalid name')
        let typebasedTitle = notificationAdcontent[0].title
        try {

          await sendNotificationNew({
            title: typebasedTitle ,
            body:  notificationAdcontent[0].body,
            data: {
              banner_img:  "",
              router: "/main-screen",
              pathParameters: JSON.stringify({
                title:typebasedTitle,
                body: notificationAdcontent[0].body,
                subheading: notificationAdcontent[0].sub_heading || "",
                userId: tokenRow.user_id,
                //  notification_type: "family",
              }),
              // genmessage_id: msg_id,
            },
            user_id: tokenRow.user_id,
            device_id: tokenRow.device_id,
            fcm_token: tokenRow.fcm_token,
            silent: false,
          });
          console.log(`✅ Notification sent to user ${tokenRow.user_id}`);
        } catch (err) {
          console.error(
            `❌ No Fcm Send error for user ${tokenRow.user_id}:`,
            err.message
          );
          continue
        }
        
      }

        const { rows:updatedData } = await adminDbPool.query(
          `UPDATE advertisment_notification SET
            is_triggered = true,
            triggered_at = NOW(),
            updated_at  = NOW()
          WHERE id = $1 RETURNING *`,
          [id]
        );
    return updatedData
  }catch (error) {
    await client.query("ROLLBACK");
    console.error('send push alone  notification error:', error);
    throw boom.badRequest(error.message);
  }
}


