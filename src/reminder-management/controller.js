import Boom from '@hapi/boom';
import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

import {
  resolveRange,
  summaryQuery,
  trendQuery,
  listQuery,
  detailsQuery,
  userAggregateQuery,
  userRemindersQuery,
  appUsersQuery,
  allUserIdsQuery,
  MAX_BROADCAST_USERS,
  createRemindersForUsers,
  userDevicesQuery,
  exportQuery
} from './service.js';

// The FCM helper initialises the Firebase Admin SDK at import time, which needs
// the service-account file. Loaded lazily so the read-only reporting endpoints
// (and this module's tests) do not depend on push credentials.
const loadPushSender = async () => {
  const { sendNotificationNew } = await import('../../helpers/fcm.js');

  return sendNotificationNew;
};

/**
 * Super-admin views over Family Reminders. Read-only by design — the admin
 * portal reports on reminder activity, it does not mutate app data.
 */

/** Dashboard cards + daily trend for the selected range. */
export const reminderSummaryController = async (query) => {
  try {
    const range = resolveRange(query.start_date, query.end_date);
    const [summary, trend] = await Promise.all([
      summaryQuery(range),
      trendQuery(range)
    ]);

    return {
      message: 'Reminder summary',
      detail: summary,
      trend
    };
  } catch (err) {
    console.log('reminderSummaryController', err.message);
    throw Boom.conflict(err.message);
  }
};

/** Paginated reminders, searchable by creator name/mobile or reminder title. */
export const reminderListController = async (query) => {
  try {
    const limit = Number(query.limit) || 20;
    const page = Number(query.page) || 1;
    const offset = (page - 1) * limit;
    const range = resolveRange(query.start_date, query.end_date);

    const { list, total } = await listQuery({
      ...range,
      search: query.search ?? '',
      priority: query.priority ?? '',
      status: query.status ?? '',
      limit,
      offset
    });

    return {
      message: 'Reminder list',
      detail: list,
      total,
      page,
      limit
    };
  } catch (err) {
    console.log('reminderListController', err.message);
    throw Boom.conflict(err.message);
  }
};

/** One reminder in full: members, alerts, comments and attachments. */
export const reminderDetailController = async (params) => {
  try {
    const detail = await detailsQuery({ id: params.id });
    if (!detail) throw Boom.notFound('Reminder not found');

    return { message: 'Reminder detail', detail };
  } catch (err) {
    if (err.isBoom) throw err;
    console.log('reminderDetailController', err.message);
    throw Boom.conflict(err.message);
  }
};

/** Per-user rollup — who creates reminders, who is shared on them, who comments. */
export const reminderUserListController = async (query) => {
  try {
    const limit = Number(query.limit) || 20;
    const page = Number(query.page) || 1;
    const offset = (page - 1) * limit;
    const range = resolveRange(query.start_date, query.end_date);

    const { list, total } = await userAggregateQuery({
      ...range,
      search: query.search ?? '',
      limit,
      offset
    });

    return {
      message: 'Reminder user list',
      detail: list,
      total,
      page,
      limit
    };
  } catch (err) {
    console.log('reminderUserListController', err.message);
    throw Boom.conflict(err.message);
  }
};

/** App users for the admin's target picker, searchable by name or mobile. */
export const reminderAppUsersController = async (query) => {
  try {
    const users = await appUsersQuery({
      search: query.search ?? '',
      limit: Number(query.limit) || 50
    });

    return { message: 'App users', detail: users };
  } catch (err) {
    console.log('reminderAppUsersController', err.message);
    throw Boom.conflict(err.message);
  }
};

/**
 * Best-effort push fan-out for admin-created reminders.
 *
 * Deliberately not awaited by the request: pushing to every app user can take
 * far longer than an HTTP request should, and a dead token must never fail a
 * reminder that is already committed.
 */
const pushReminderToUsers = async (targets, { title, body }) => {
  let sendNotificationNew;
  try {
    sendNotificationNew = await loadPushSender();
  } catch (err) {
    console.log('[reminder-admin] push helper unavailable:', err.message);

    return;
  }

  for (const { userId, reminderId } of targets) {
    try {
      const devices = await userDevicesQuery({ userId });
      for (const device of devices) {
        try {
          await sendNotificationNew({
            title,
            body,
            data: {
              router: '/family-reminder-detail',
              pathParameters: JSON.stringify({
                reminderId,
                title,
                notification_type: 'family_reminder',
                event: 'admin_created'
              }),
              notification_type: 'family_reminder',
              reminder_id: reminderId
            },
            user_id: userId,
            device_id: device.device_id,
            fcm_token: device.fcm_token,
            silent: false
          });
        } catch (err) {
          console.log(`[reminder-admin] push failed user=${userId}:`, err.message);
        }
      }
    } catch (err) {
      console.log(`[reminder-admin] device lookup failed user=${userId}:`, err.message);
    }
  }
};

/**
 * Super-admin creates a reminder for specific users, or for every app user.
 *
 * One reminder row is created per target user with that user as the creator, so
 * it behaves exactly like a reminder they made themselves — it appears on their
 * home, calendar and inbox, and the mobile cron delivers its alerts.
 */
export const reminderCreateController = async (body, loggedUser) => {
  try {
    const { target, user_ids = [], ...payload } = body;

    let userIds = [];
    let truncated = false;
    if (target === 'all') {
      const all = await allUserIdsQuery();
      userIds = all.userIds;
      truncated = all.truncated;
    } else {
      userIds = [...new Set(user_ids)];
    }

    if (userIds.length === 0) {
      throw Boom.badRequest('No target users found for this reminder');
    }

    if (dayjs(payload.remind_at).isBefore(dayjs())) {
      throw Boom.badRequest('Reminder date and time must be in the future');
    }

    const created = await createRemindersForUsers({
      userIds,
      adminId: loggedUser?.id ?? null,
      payload
    });

    // Fire-and-forget; see pushReminderToUsers.
    pushReminderToUsers(created, {
      title: payload.title,
      body: payload.description
    }).catch((err) => console.log('[reminder-admin] push fan-out failed:', err.message));

    return {
      message:
        `Reminder created for ${created.length} user${created.length === 1 ? '' : 's'}.` +
        // Surfaced rather than silently reaching fewer users than intended.
        (truncated ? ` Capped at ${MAX_BROADCAST_USERS} recipients.` : ''),
      created_count: created.length,
      truncated,
      target
    };
  } catch (err) {
    if (err.isBoom) throw err;
    console.log('reminderCreateController', err.message);
    throw Boom.conflict(err.message);
  }
};

const IST = 'Asia/Kolkata';
const stamp = (value) => (value ? dayjs(value).tz(IST).format('DD MMM YYYY hh:mm A') : '');

/**
 * Excel export of everything behind the current filters — reminders plus their
 * shared members, comments and documents, one sheet each.
 *
 * Returns base64 so it rides the same download path the other admin exports use.
 */
export const reminderExportController = async (query) => {
  try {
    const range = resolveRange(query.start_date, query.end_date);
    const data = await exportQuery({
      ...range,
      search: query.search ?? '',
      priority: query.priority ?? '',
      status: query.status ?? ''
    });

    const workbook = new ExcelJS.Workbook();

    const reminderSheet = workbook.addWorksheet('Reminders');
    reminderSheet.addRow([
      'Title',
      'Description',
      'Created By',
      'Mobile',
      'Source',
      'Reminder Date',
      'Priority',
      'Status',
      'Venue',
      'Alerts',
      'Shared With',
      'Members',
      'Comments',
      'Documents',
      'Who Can Comment',
      'Created On'
    ]);
    data.reminders.forEach((r) => {
      reminderSheet.addRow([
        r.title,
        r.description,
        r.creator_name || '',
        r.creator_mobile || '',
        r.created_by_admin ? 'Admin' : 'User',
        stamp(r.remind_at),
        r.priority,
        r.status,
        r.venue_name || '',
        r.alerts || '',
        r.shared_with || '',
        r.member_count,
        r.comment_count,
        r.attachment_count,
        r.comment_mode,
        stamp(r.created_at)
      ]);
    });

    const memberSheet = workbook.addWorksheet('Shared Members');
    memberSheet.addRow([
      'Reminder',
      'Member',
      'Mobile',
      'Relation',
      'Role',
      'Can Comment',
      'Can Upload',
      'Status',
      'Added On'
    ]);
    data.members.forEach((m) => {
      memberSheet.addRow([
        m.title,
        m.name || '',
        m.mobile || '',
        m.relation || '',
        m.is_creator ? 'Creator' : m.is_admin ? 'Admin' : 'Member',
        m.can_comment ? 'Yes' : 'No',
        m.can_upload ? 'Yes' : 'No',
        m.is_removed ? 'Removed' : 'Active',
        stamp(m.added_at)
      ]);
    });

    const commentSheet = workbook.addWorksheet('Comments');
    commentSheet.addRow(['Reminder', 'Author', 'Mobile', 'Type', 'Comment', 'Posted On']);
    data.comments.forEach((c) => {
      commentSheet.addRow([
        c.title,
        c.user_name || '',
        c.user_mobile || '',
        c.is_reply ? 'Reply' : 'Comment',
        c.comment,
        stamp(c.created_at)
      ]);
    });

    const docSheet = workbook.addWorksheet('Documents');
    docSheet.addRow(['Reminder', 'Uploaded By', 'File Name', 'Type', 'URL', 'Uploaded On']);
    data.attachments.forEach((a) => {
      docSheet.addRow([
        a.title,
        a.user_name || '',
        a.file_name || '',
        a.file_type || '',
        a.file_url || '',
        stamp(a.created_at)
      ]);
    });

    // Give every column a readable width based on its longest cell.
    [reminderSheet, memberSheet, commentSheet, docSheet].forEach((sheet) => {
      sheet.getRow(1).font = { bold: true };
      sheet.columns.forEach((col) => {
        let max = 12;
        col.eachCell({ includeEmpty: true }, (cell) => {
          const length = cell.value ? String(cell.value).length : 0;
          if (length > max) max = length;
        });
        col.width = Math.min(max + 2, 60);
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      message: 'Reminder export',
      fileName: `family-reminders-${dayjs().tz(IST).format('YYYY-MM-DD')}.xlsx`,
      data: Buffer.from(buffer).toString('base64'),
      rows: data.reminders.length
    };
  } catch (err) {
    console.log('reminderExportController', err.message);
    throw Boom.conflict(err.message);
  }
};

/** Drill-down: every reminder one user created or was shared on. */
export const reminderUserDetailController = async (params, query) => {
  try {
    const range = resolveRange(query.start_date, query.end_date);
    const result = await userRemindersQuery({ userId: params.userId, ...range });

    if (!result.user) throw Boom.notFound('User not found');

    return {
      message: 'User reminder detail',
      detail: result.reminders,
      user: result.user
    };
  } catch (err) {
    if (err.isBoom) throw err;
    console.log('reminderUserDetailController', err.message);
    throw Boom.conflict(err.message);
  }
};
