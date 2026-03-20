import Boom from '@hapi/boom';
import { adminDb as adminDbPool } from "../../config/adminDb.js";
import {  existingPool as existDb } from '../../config/dbExisiting.js';
import { assignedContactList } from '../call-managements/controller.js';
import ExcelJS from"exceljs";
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc);
dayjs.extend(timezone);


///////////////////////////////////////////////////////////////////////////////////////
// export const userListBasedFunction = async (query, loggedUser) => {
//   const { limit = 20, page = 1, search,start_date,end_date } = query; 
  
//   //need to add type = 'online'/'offline'/'' 
//   // if online only online , if offline only offline else all

//   const limitN = Number(limit) || 20;
//   const pageN = Number(page) || 1;
//   const offset = (pageN - 1) * limitN;

//   const client = await adminDbPool.connect();
//   const existClient = await existDb.connect();

//   try {
//     // ---------- FETCH ONLINE FUNCTION USERS ----------
//     let dateFilter = ''
//     let values = []
//      if (start_date !== '' && end_date !== '') {
//       const startUTC = dayjs(start_date)
//         .tz("Asia/Kolkata",true)
//         .startOf("day")
//         .utc()
//         .toISOString()

//       const endUTC = dayjs(end_date)
//         .tz("Asia/Kolkata",true)
//         .endOf("day")
//         .utc()
//         .toISOString()

//       dateFilter = `AND f.created_at BETWEEN $4 AND $5`
//       values = [limitN, offset, search,startUTC, endUTC]
//     }else{
//       values =[limitN, offset, search]
//     }
//     const { rows: onlineList } = await existClient.query(`
//       select distinct f.user_id as id, u.name, u.mobile
//       from function f 
//       join users u on u.id = f.user_id
//       where (
//         $3::text IS NULL OR 
//         $3::text = '' OR 
//         u.name ILIKE '%' || $3::text || '%' OR 
//         u.mobile ILIKE '%' || $3::text || '%'
//       )
//       ${dateFilter}
//       ORDER BY f.user_id, u.name, u.mobile DESC
//       LIMIT $1 OFFSET $2
//     `, values);

//     const { rows: onlineCount } = await existClient.query(`
//       select count(distinct f.user_id)
//       from function f 
//       join users u on u.id = f.user_id
//       where (
//         $1::text IS NULL OR 
//         $1::text = '' OR 
//         u.name ILIKE '%' || $1::text || '%' OR 
//         u.mobile ILIKE '%' || $1::text || '%'
//       )

//     `, [search]);


//     // ---------- FETCH OFFLINE FUNCTION USERS ----------
//     const { rows: offlineList } = await existClient.query(`
//       select distinct f.created_by as id, u.name, u.mobile
//       from offline_function f 
//       join users u on u.id = f.created_by
//       where (
//         $3::text IS NULL OR 
//         $3::text = '' OR 
//         u.name ILIKE '%' || $3::text || '%' OR 
//         u.mobile ILIKE '%' || $3::text || '%'
//       )
//       ORDER BY f.created_by, u.name, u.mobile DESC
//       LIMIT $1 OFFSET $2
//     `, [limitN, offset, search]);

//     const { rows: offlineCount } = await existClient.query(`
//       select count(distinct f.created_by)
//       from offline_function f 
//       join users u on u.id = f.created_by
//       where (
//         $1::text IS NULL OR 
//         $1::text = '' OR 
//         u.name ILIKE '%' || $1::text || '%' OR 
//         u.mobile ILIKE '%' || $1::text || '%'
//       )
//     `, [search]);


//     // ---------- MERGE ONLINE & OFFLINE ----------
//     const combinedMap = new Map();

//     // 1) Add online users
//     onlineList.forEach(u => {
//       combinedMap.set(u.id, {
//         id: u.id,
//         name: u.name,
//         mobile: u.mobile,
//         function: ["online"]
//       });
//     });

//     // 2) Add offline users
//     offlineList.forEach(u => {
//       if (combinedMap.has(u.id)) {
//         // Already exists → push only if not duplicate
//         const entry = combinedMap.get(u.id);
//         if (!entry.function.includes("offline")) {
//           entry.function.push("offline");
//         }
//       } else {
//         // New user
//         combinedMap.set(u.id, {
//           id: u.id,
//           name: u.name,
//           mobile: u.mobile,
//           function: ["offline"]
//         });
//       }
//     });

//     const mergedList = Array.from(combinedMap.values());


//     // --------- FIX COUNT (UNIQUE USERS ONLY) ----------
//     const totalUniqueCount = mergedList.length;


//     // --------- PAGINATION (APPLY AFTER MERGED) ----------
//     const paginated = mergedList.slice(offset, offset + limitN);


//     // --------- FINAL RESPONSE ----------
//     return {
//       message: "User List Data",
//       data: paginated,
//       count: totalUniqueCount,
//       page: pageN,
//       limit: limitN
//     };

//   } catch (err) {
//     throw Boom.conflict(err.message);
//   } finally {
//     if (client) client.release();
//     if (existClient) existClient.release();
//   }
// };

export const userListBasedFunction = async (query, loggedUser) => {
  const { limit = 20, page = 1, search, start_date, end_date, type = '' } = query;

  const limitN = Number(limit) || 20;
  const pageN = Number(page) || 1;
  const offset = (pageN - 1) * limitN;

  const existClient = await existDb.connect();

  try {
    // ─── Date Filter Setup ────────────────────────────────────────
    const hasDateFilter = start_date && end_date;
    let startUTC, endUTC;

    if (hasDateFilter) {
      startUTC = dayjs(start_date).tz("Asia/Kolkata", true).startOf("day").utc().toISOString();
      endUTC   = dayjs(end_date).tz("Asia/Kolkata", true).endOf("day").utc().toISOString();
    }

    // ─── Shared Search Filter ─────────────────────────────────────
    const searchWhere = `
      (
        $3::text IS NULL OR $3::text = ''
        OR u.name   ILIKE '%' || $3::text || '%'
        OR u.mobile ILIKE '%' || $3::text || '%'
      )
    `;

    const searchWhereCount = `
      (
        $1::text IS NULL OR $1::text = ''
        OR u.name   ILIKE '%' || $1::text || '%'
        OR u.mobile ILIKE '%' || $1::text || '%'
      )
    `;

    // ─── Online Query Builder ─────────────────────────────────────
    const onlineDateFilter  = hasDateFilter ? `AND f.created_at BETWEEN $4 AND $5` : '';
    const onlineListValues  = hasDateFilter
      ? [limitN, offset, search ?? '', startUTC, endUTC]
      : [limitN, offset, search ?? ''];

    const onlineCountDateFilter = hasDateFilter ? `AND f.created_at BETWEEN $2 AND $3` : '';
    const onlineCountValues     = hasDateFilter
      ? [search ?? '', startUTC, endUTC]
      : [search ?? ''];

    // ─── Offline Query Builder ────────────────────────────────────
    const offlineDateFilter  = hasDateFilter ? `AND f.created_at BETWEEN $4 AND $5` : '';
    const offlineListValues  = hasDateFilter
      ? [limitN, offset, search ?? '', startUTC, endUTC]
      : [limitN, offset, search ?? ''];

    const offlineCountDateFilter = hasDateFilter ? `AND f.created_at BETWEEN $2 AND $3` : '';
    const offlineCountValues     = hasDateFilter
      ? [search ?? '', startUTC, endUTC]
      : [search ?? ''];

    // ─── Decide which queries to run based on type ─────────────────
    const fetchOnline  = type === 'online'  || type === '';
    const fetchOffline = type === 'offline' || type === '';

    // ─── Run Queries in Parallel ──────────────────────────────────
    const [
      onlineListResult,
      onlineCountResult,
      offlineListResult,
      offlineCountResult,
    ] = await Promise.all([

      // Online List
      fetchOnline
        ? existClient.query(`
            SELECT DISTINCT ON (f.user_id) f.user_id AS id, u.name, u.mobile
            FROM function f
            JOIN users u ON u.id = f.user_id
            WHERE ${searchWhere}
            ${onlineDateFilter}
            ORDER BY f.user_id, f.created_at DESC
            LIMIT $1 OFFSET $2
          `, onlineListValues)
        : Promise.resolve({ rows: [] }),

      // Online Count
      fetchOnline
        ? existClient.query(`
            SELECT COUNT(DISTINCT f.user_id) AS total
            FROM function f
            JOIN users u ON u.id = f.user_id
            WHERE ${searchWhereCount}
            ${onlineCountDateFilter}
          `, onlineCountValues)
        : Promise.resolve({ rows: [{ total: 0 }] }),

      // Offline List
      fetchOffline
        ? existClient.query(`
            SELECT DISTINCT ON (f.created_by) f.created_by AS id, u.name, u.mobile
            FROM offline_function f
            JOIN users u ON u.id = f.created_by
            WHERE ${searchWhere}
            ${offlineDateFilter}
            ORDER BY f.created_by, f.created_at DESC
            LIMIT $1 OFFSET $2
          `, offlineListValues)
        : Promise.resolve({ rows: [] }),

      // Offline Count
      fetchOffline
        ? existClient.query(`
            SELECT COUNT(DISTINCT f.created_by) AS total
            FROM offline_function f
            JOIN users u ON u.id = f.created_by
            WHERE ${searchWhereCount}
            ${offlineCountDateFilter}
          `, offlineCountValues)
        : Promise.resolve({ rows: [{ total: 0 }] }),

    ]);

    const onlineList  = onlineListResult.rows;
    const offlineList = offlineListResult.rows;

    // ─── Merge Online + Offline ───────────────────────────────────
    const combinedMap = new Map();

    onlineList.forEach(u => {
      combinedMap.set(u.id, { id: u.id, name: u.name, mobile: u.mobile, function: ["online"] });
    });

    offlineList.forEach(u => {
      if (combinedMap.has(u.id)) {
        combinedMap.get(u.id).function.push("offline");
      } else {
        combinedMap.set(u.id, { id: u.id, name: u.name, mobile: u.mobile, function: ["offline"] });
      }
    });

    const mergedList = Array.from(combinedMap.values());

    // ─── Count Logic by type ──────────────────────────────────────
    const totalCount =
      type === 'online'  ? Number(onlineCountResult.rows[0].total) :
      type === 'offline' ? Number(offlineCountResult.rows[0].total) :
      mergedList.length; // merged unique count when type = ''

    return {
      message: "User List Data",
      data: mergedList,
      count: totalCount,
      page: pageN,
      limit: limitN,
    };

  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    if (existClient) existClient.release();
  }
};

// export const functionDetailsByUserId = async (query, loggedUser) => {
//   const { limit = 20, page = 1, search, userId } = query;

//   const client = await adminDbPool.connect();
//   const existClient = await existDb.connect();

//   try {
//     const limitN = parseInt(limit) || 10;
//     const pageN = parseInt(page) || 1;
//     const offset = (pageN - 1) * limitN;
//      const { rows: userDetails } = await existClient.query(`
//       SELECT 
//         u.id,
//         u.name,
//         u.last_name,
//         u.mobile,
//         COUNT(DISTINCT f.id) AS total_online_function,
//         COUNT(DISTINCT ofn.id) AS total_offline_function
//       FROM users u
//       LEFT JOIN function f 
//         ON f.user_id = u.id
//       LEFT JOIN offline_function ofn 
//         ON ofn.created_by = u.id
//       WHERE u.id = $1
//       GROUP BY 
//         u.id, u.name, u.last_name, u.mobile;
//       `,
//       [userId])
//     /* ---------- 1. Fetch Online Functions WITH SEARCH ---------- */
//     const { rows: onlineRows } = await existClient.query(`
//       SELECT 
//         f.id as functionId,
//         f.user_id,
//         u.name,
//         u.mobile,
//         'online' AS function_type,
//         f.function_name,
//         f.created_at
//       FROM function f 
//       JOIN users u ON u.id = f.user_id
//       WHERE f.user_id = $2
//       AND (
//         $1::text IS NULL OR
//         $1::text = '' OR
//         u.name ILIKE '%' || $1::text || '%' OR
//         u.mobile ILIKE '%' || $1::text || '%' OR
//         f.function_name ILIKE '%' || $1::text || '%'
//       )
//       ORDER BY f.created_at DESC
//     `, [search, userId]);

//     /* ---------- 2. Fetch Offline Functions WITH SEARCH ---------- */
//     const { rows: offlineRows } = await existClient.query(`
//       SELECT 
//         f.id as functionId,
//         f.created_by AS user_id,
//         u.name,
//         u.mobile,
//         'offline' AS function_type,
//         f.function_name,
//         f.created_at
//       FROM offline_function f 
//       JOIN users u ON u.id = f.created_by
//       WHERE f.created_by = $2
//       AND (
//         $1::text IS NULL OR
//         $1::text = '' OR
//         u.name ILIKE '%' || $1::text || '%' OR
//         u.mobile ILIKE '%' || $1::text || '%' OR
//         f.function_name ILIKE '%' || $1::text || '%'
//       )
//       ORDER BY f.created_at DESC
//     `, [search, userId]);

//     /* ---------- 3. Merge both lists ---------- */
//     let combinedList = [...onlineRows, ...offlineRows];

//     /* ---------- 4. Sort by created_at DESC ---------- */
//     combinedList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

//     /* ---------- 5. Total Count ---------- */
//     const totalCount = combinedList.length;

//     /* ---------- 6. Pagination ---------- */
//     const paginatedData = combinedList.slice(offset, offset + limitN);

//     /* ---------- 7. Final Output Format ---------- */
//     // console.log(paginatedData)
//     const formatted = paginatedData.map(row => ({
//       user_id: row.user_id,
//       name: row.name,
//       mobile: row.mobile,
//       function: row.function_type,
//       function_name: row.function_name,
//       functionid:row.functionid
//     }));

//     return {
//       message: "User Function List",
//       totalFunction: totalCount,
//       page: pageN,
//       limit: limitN,
//       data: formatted,
//       userDetails,
//     };

//   } catch (err) {
//     throw Boom.conflict(err.message);
//   } finally {
//     if (client) client.release();
//     if (existClient) existClient.release();
//   }
// };

export const functionDetailsByUserId = async (query, loggedUser) => {
  const { limit = 20, page = 1, search, userId, start_date, end_date, type = '' } = query;

  const existClient = await existDb.connect();

  try {
    const limitN = parseInt(limit) || 10;
    const pageN = parseInt(page) || 1;
    const offset = (pageN - 1) * limitN;

    // ─── Date Filter Setup ────────────────────────────────────────
    const hasDateFilter = start_date && end_date;
    let startUTC, endUTC;

    if (hasDateFilter) {
      startUTC = dayjs(start_date).tz("Asia/Kolkata", true).startOf("day").utc().toISOString();
      endUTC   = dayjs(end_date).tz("Asia/Kolkata", true).endOf("day").utc().toISOString();
    }

    const fetchOnline  = type === 'online'  || type === '';
    const fetchOffline = type === 'offline' || type === '';

    // ─── Shared Search Condition ──────────────────────────────────
    const searchCondition = `
      (
        $1::text IS NULL OR $1::text = ''
        OR u.name          ILIKE '%' || $1::text || '%'
        OR u.mobile        ILIKE '%' || $1::text || '%'
        OR f.function_name ILIKE '%' || $1::text || '%'
      )
    `;

    // ─── Online values ────────────────────────────────────────────
    // $1=search, $2=userId, $3=startUTC, $4=endUTC
    const onlineDateFilter = hasDateFilter ? `AND f.created_at BETWEEN $3 AND $4` : '';
    const onlineValues     = hasDateFilter
      ? [search ?? '', userId, startUTC, endUTC]
      : [search ?? '', userId];

    // ─── Offline values ───────────────────────────────────────────
    const offlineDateFilter = hasDateFilter ? `AND f.created_at BETWEEN $3 AND $4` : '';
    const offlineValues     = hasDateFilter
      ? [search ?? '', userId, startUTC, endUTC]
      : [search ?? '', userId];

    // ─── Run All Queries in Parallel ──────────────────────────────
    const [userDetailsResult, onlineResult, offlineResult] = await Promise.all([

      // User summary — counts respect type filter
      existClient.query(`
        SELECT
          u.id,
          u.name,
          u.last_name,
          u.mobile,
          ${fetchOnline  ? `COUNT(DISTINCT f.id)   AS total_online_function,`  : `0 AS total_online_function,`}
          ${fetchOffline ? `COUNT(DISTINCT ofn.id) AS total_offline_function`  : `0 AS total_offline_function`}
        FROM users u
        ${fetchOnline  ? `LEFT JOIN function         f   ON f.user_id    = u.id` : ''}
        ${fetchOffline ? `LEFT JOIN offline_function ofn ON ofn.created_by = u.id` : ''}
        WHERE u.id = $1
        GROUP BY u.id, u.name, u.last_name, u.mobile
      `, [userId]),

      // Online list
      fetchOnline
        ? existClient.query(`
            SELECT
              f.id          AS functionid,
              f.user_id,
              u.name,
              u.mobile,
              'online'      AS function_type,
              f.function_name,
              f.created_at
            FROM function f
            JOIN users u ON u.id = f.user_id
            WHERE f.user_id = $2
            AND ${searchCondition}
            ${onlineDateFilter}
            ORDER BY f.created_at DESC
          `, onlineValues)
        : Promise.resolve({ rows: [] }),

      // Offline list
      fetchOffline
        ? existClient.query(`
            SELECT
              f.id          AS functionid,
              f.created_by  AS user_id,
              u.name,
              u.mobile,
              'offline'     AS function_type,
              f.function_name,
              f.created_at
            FROM offline_function f
            JOIN users u ON u.id = f.created_by
            WHERE f.created_by = $2
            AND ${searchCondition}
            ${offlineDateFilter}
            ORDER BY f.created_at DESC
          `, offlineValues)
        : Promise.resolve({ rows: [] }),

    ]);

    // ─── Merge + Sort ─────────────────────────────────────────────
    const combinedList = [...onlineResult.rows, ...offlineResult.rows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // ─── Paginate ─────────────────────────────────────────────────
    const totalCount   = combinedList.length;
    const paginatedData = combinedList.slice(offset, offset + limitN);

    // ─── Format ───────────────────────────────────────────────────
    const formatted = paginatedData.map(row => ({
      functionid:     row.functionid,
      user_id:        row.user_id,
      name:           row.name,
      mobile:         row.mobile,
      function:       row.function_type,
      function_name:  row.function_name,
      created_at:     row.created_at,
    }));

    return {
      message:       "User Function List",
      totalFunction: totalCount,
      page:          pageN,
      limit:         limitN,
      data:          formatted,
      userDetails:   userDetailsResult.rows,
    };

  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    if (existClient) existClient.release();
  }
};


export const functionDetailsByFunctionId = async (query, loggedUser) => {
  const { limit = 20, page = 1, search = "", userId, functionId, type, sort = "latest" } = query;

  const client = await adminDbPool.connect();
  const existClient = await existDb.connect();

  try {
    // ---------------- PAGINATION ----------------
    const limitN = parseInt(limit) || 10;
    const pageN = parseInt(page) || 1;
    const offset = (pageN - 1) * limitN;

    // ---------------- USER INFO ----------------
    const { rows: userDetails } = await existClient.query(
      `SELECT id, name, last_name, mobile FROM users WHERE id = $1`,
      [userId]
    );

    // ---------------- FUNCTION DETAILS ----------------
    const { rows: functionDetails } = await existClient.query(
      `SELECT 
        f.*,
        COALESCE(
          (
            SELECT json_agg(row_to_json(fi))
            FROM firm fi
            WHERE fi.function_id = f.id
          ),
          '[]'::json
        ) AS firm,
         COALESCE(
          (
            SELECT json_agg(row_to_json(sl))
            FROM social_link sl
            WHERE sl.function_id = f.id
          ),
          '[]'::json
        ) AS social_link,
          COALESCE(
          (
            SELECT json_agg(row_to_json(oi))
            FROM otherimages oi
            WHERE oi.other_id = f.id
            and oi.type = 'host'
          ),
          '[]'::json
        ) AS host_images_other,
          COALESCE(
          (
            SELECT json_agg(row_to_json(oi))
            FROM otherimages oi
            WHERE oi.other_id = f.id
            and oi.type = 'host_video'
          ),
          '[]'::json
        ) AS host_video_other,
          COALESCE(
          (
            SELECT json_agg(row_to_json(oi))
            FROM otherimages oi
            WHERE oi.other_id = f.id
            and oi.type = 'special_invite_video'
          ),
          '[]'::json
        ) AS special_invite_video_other,
          COALESCE(
          (
            SELECT json_agg(row_to_json(oi))
            FROM otherimages oi
            WHERE oi.other_id = f.id
            and oi.type = 'special_invite'
          ),
          '[]'::json
        ) AS special_invite_other,
          COALESCE(
          (
            SELECT json_agg(row_to_json(oi))
            FROM otherimages oi
            WHERE oi.other_id = f.id
            and oi.type = 'firms_video'
          ),
          '[]'::json
        ) AS firms_video_other,
          COALESCE(
          (
            SELECT json_agg(row_to_json(oi))
            FROM otherimages oi
            WHERE oi.other_id = f.id
            and oi.type = 'firms'
          ),
          '[]'::json
        ) AS firms_other,
         
        COALESCE(
          (
            SELECT json_agg(row_to_json(cmf))
            FROM custommedia cmf
            WHERE cmf.other_id = f.id
          ),
          '[]'::json
        ) AS custom_media,
          COALESCE(
          (
            SELECT json_agg(row_to_json(spli))
            FROM specialinvitee spli
            WHERE spli.function_id = f.id
          ),
          '[]'::json
        ) AS special_invitee
      FROM function f
      WHERE f.user_id = $1
        AND f.id = $2;`,
      [userId, functionId]
    );

    console.log("functionDetails------------->",functionDetails)

    // ---------------- SORT OPTIONS ----------------
    let orderBy = "mc.created_at DESC";
    if (sort === "asc") orderBy = "item_name ASC";
    if (sort === "desc") orderBy = "item_name DESC";
    if (sort === "alphabetical") orderBy = "item_name ASC";

    // ---------------- SEARCH CONDITION ----------------
    let searchCondition = "";
    let params = [functionId];

    if (search && search.trim() !== "") {
      params.push(`%${search}%`);
      searchCondition = `
        AND (
          e.event_name ILIKE $${params.length}
          OR a.title ILIKE $${params.length}
          OR t.title ILIKE $${params.length}
          OR o.info_name ILIKE $${params.length}
        )
      `;
    }

    // IMPORTANT: type filter removed completely, NOT applied in SQL
    const typeCondition = ""; 

    // ---------------- TOTAL COUNT QUERY ----------------
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM mappedContact mc
      LEFT JOIN event e 
          ON mc.oid = e.id AND mc.type = 'event' AND e.function_id = $1
      LEFT JOIN accommodation a 
          ON mc.oid = a.id AND mc.type = 'accommodation' AND a.function_id = $1
      LEFT JOIN transportation t 
          ON mc.oid = t.id AND mc.type = 'transportation' AND t.function_id = $1
      LEFT JOIN otherinfo o 
          ON mc.oid = o.id AND mc.type = 'other' AND o.function_id = $1
      WHERE 
          (e.id IS NOT NULL OR a.id IS NOT NULL OR t.id IS NOT NULL OR o.id IS NOT NULL)
          ${searchCondition}
    `;

    const { rows: countRows } = await existClient.query(countQuery, params);
    const totalMapped = parseInt(countRows[0].total);

    // ---------------- PAGINATED MAIN QUERY ----------------
    params.push(limitN, offset);

    const dataQuery = `
      SELECT 
        mc.oid,
        mc.type,
        mc.contact_id,
        CARDINALITY(mc.contact_id) AS mapped_count,

        CASE 
          WHEN mc.type = 'event' THEN e.event_name
          WHEN mc.type = 'accommodation' THEN a.title
          WHEN mc.type = 'transportation' THEN t.title
          WHEN mc.type = 'other' THEN o.info_name
        END AS item_name

      FROM mappedContact mc
      LEFT JOIN event e 
          ON mc.oid = e.id AND mc.type = 'event' AND e.function_id = $1
      LEFT JOIN accommodation a 
          ON mc.oid = a.id AND mc.type = 'accommodation' AND a.function_id = $1
      LEFT JOIN transportation t 
          ON mc.oid = t.id AND mc.type = 'transportation' AND t.function_id = $1
      LEFT JOIN otherinfo o 
          ON mc.oid = o.id AND mc.type = 'other' AND o.function_id = $1

      WHERE 
          (e.id IS NOT NULL OR a.id IS NOT NULL OR t.id IS NOT NULL OR o.id IS NOT NULL)
          ${searchCondition}

      ORDER BY ${orderBy}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const { rows: mappedData } = await existClient.query(dataQuery, params);

    // ---------------- BUILD OIDS LIST ----------------
    const [
      { rows: events },
      { rows: others },
      { rows: transports },
      { rows: accommodations },
    ] = await Promise.all([
      existClient.query(`SELECT id, event_name AS title FROM event WHERE function_id = $1`, [functionId]),
      existClient.query(`SELECT id, info_name AS title FROM otherInfo WHERE function_id = $1`, [functionId]),
      existClient.query(`SELECT id, title FROM transportation WHERE function_id = $1`, [functionId]),
      existClient.query(`SELECT id, title FROM accommodation WHERE function_id = $1`, [functionId]),
    ]);

    let oids = [...events, ...others, ...transports, ...accommodations];

    // ---------------- RETURN RESPONSE ----------------
    return {
      message: "User Function List",
      userDetails,
      functionDetails,
      eventCounts: {
        totalevent: events.length,
        totalPreInvite: others.length,
        totalTransport: transports.length,
        totalAccommodations:accommodations.length
      },
      mappedData,
      eventsList: oids,
      // Pagination Info
      totalMapped,
      page: pageN,
      limit: limitN,
      totalPages: Math.ceil(totalMapped / limitN),

      // send type back, but NOT used in SQL
      requestType: type || null,
    };

  } catch (err) {
    console.log(err)
    throw Boom.conflict(err.message);
  } finally {
    if (client) client.release();
    if (existClient) existClient.release();
  }
};


export const contactListByEventId = async (query, loggedUser) => {
  const { 
    limit = 20, 
    page = 1, 
    search = "", 
    eventId, 
    sort = "latest",
    type,
    functionId
  } = query;

  const existClient = await existDb.connect();

  try {
    const limitN = parseInt(limit) || 20;
    const pageN = parseInt(page) || 1;
    const offset = (pageN - 1) * limitN;

    // ---------------- SORT ----------------
    let orderBy = "c.created_at DESC";
    if (sort === "asc") orderBy = "c.name ASC";
    if (sort === "desc") orderBy = "c.name DESC";
    if (sort === "alphabetical") orderBy = "c.name ASC";

    // ---------------- EVENT DETAIL ----------------
    let eventQuery = "";

    if (type === "event") eventQuery = `SELECT *,event_name AS title, 'Event' as typeof FROM event WHERE id = $1`;
    else if (type === "accommodation") eventQuery = `SELECT *,'Accommodation' as typeof FROM accommodation WHERE id = $1`;
    else if (type === "transportation") eventQuery = `SELECT *,'Transportation' as typeof FROM transportation WHERE id = $1`;
    else eventQuery = `SELECT *,info_name AS title,'Pre invite' as typeof FROM otherInfo WHERE id = $1`;

    const { rows: eventDetail } = await existClient.query(eventQuery, [eventId]);

    // ---------------- FETCH MAPPED CONTACT IDs ----------------
    const { rows: mappedRow } = await existClient.query(
      `SELECT contact_id FROM mappedContact WHERE oid = $1`,
      [eventId]
    );

    if (!mappedRow.length || mappedRow[0].contact_id.length === 0) {
      return {
        message: "No contacts mapped for this item",
        contacts: [],
        total: 0,
        page: pageN,
        limit: limitN,
        totalPages: 0,
        eventDetail
      };
    }

    const contactIds = mappedRow[0].contact_id; // array of UUIDs

    // ---------------- MAIN QUERY (Clean version) ----------------

    const searchSQL = search
      ? `AND (
            c.name ILIKE '%${search}%'
            OR c.mobile ILIKE '%${search}%'
            --OR c.email ILIKE '%${search}%'
         )`
      : "";

    // --- Count ---
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM contacts c
      WHERE c.id = ANY($1)
      ${searchSQL}
    `;
    const { rows: countRows } = await existClient.query(countQuery, [contactIds]);
    const total = parseInt(countRows[0].total);

    // --- Data ---
    const dataQuery = `
      SELECT 
        c.id,
        c.name,
        c.mobile,
        --c.email,
        c.address,
        c.created_at,
        ib.is_viewed,
        ib.is_sent,
        ib.watch_secs,
        ib.delivery_status,
        ib.clicked_count
      FROM contacts c
      join inbox ib on ib.contact_id = c.id
      WHERE c.id = ANY($1)
      and ib.oid = $2
      ${searchSQL}
      ORDER BY ${orderBy}
      LIMIT ${limitN} OFFSET ${offset}
    `;
    const { rows: contacts } = await existClient.query(dataQuery, [contactIds,functionId]);//type === "event"?functionId:eventId

    // ---------------- RESPONSE ----------------
    return {
      message: "Event Contact List",
      contacts,
      total,
      page: pageN,
      limit: limitN,
      totalPages: Math.ceil(total / limitN),
      eventDetail
    };

  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    if (existClient) existClient.release();
  }
};



export async function getOidList(params) {
  let client;
  const { functionId } = params;
  try {
    client = await existDb.connect();
    const [events, others, transports, accommodations] = await Promise.all([
      client.query(`SELECT id, event_name FROM event WHERE function_id = $1`, [
        functionId,
      ]),
      client.query(
        `SELECT id, info_name FROM otherInfo WHERE function_id = $1`,
        [functionId]
      ),
      client.query(
        `SELECT id, title FROM transportation WHERE function_id = $1`,
        [functionId]
      ),
      client.query(
        `SELECT id, title FROM accommodation WHERE function_id = $1`,
        [functionId]
      ),
    ]);
    const eventMap = events.rows.map((e) => ({
      id: e.id,
      name: e.event_name,
      type: "event",
    }));
    const otherMap = others.rows.map((o) => ({
      id: o.id,
      name: o.info_name,
      type: "other",
    }));
    const transportMap = transports.rows.map((t) => ({
      id: t.id,
      name: t.title,
      type: "transportation",
    }));
    const accomMap = accommodations.rows.map((a) => ({
      id: a.id,
      name: a.title,
      type: "accommodation",
    }));

    const allMaps = [...eventMap, ...otherMap, ...transportMap, ...accomMap];
    console.log("pppppppppppppppppp liiss----->", allMaps);
    return {
      message: "template fetched successfully",
      data: allMaps || [],
    };
  } catch (err) {
    console.error("Error fetching templates", err);
    throw new Error(err.message);
  }finally {
    console.log("client reelase---->")
     client.release();
  }
}






export const callHistoryExcelById =  async (params,user,resp) => {
  const client = await adminDbPool.connect();
  const {functionId,callerID,page =1,limit=30,search,filterbyoid,excel= 'false'} = params
  const limitN = Number(limit) || 20;
  const pageN = Number(page) || 1;
  const offset = (pageN - 1) * limitN;
//   const userId = loggedUser.id
console.log({functionId,page,limit,search,filterbyoid},{id:callerID})
  try {
      const {rows:callerDetails} = await client.query(`
      select * from users 
      where id = $1 and role ='support'
      `,[callerID])
     let res = await assignedContactList({functionId,page,limit,search,filterbyoid},{id:callerID})
     console.log("res------>",res)
  if(excel === 'false'){
    return {
       message:'Caller History',
       callerDetails,
       data:res.data,
       pagination:res.pagination
    };
     }
    else{
      let maxLenResponse = 0;

      res.data.forEach((c) => {
        if (Array.isArray(c.reasons) && c.reasons.length > maxLenResponse) {
          maxLenResponse = c.reasons.length;
        }
      });
      console.log("in-------------->",res.data)
      
    let filePath = 'dummy';
    let titleMap = {
      contact_function_id: "Contact Function ID",
      name: "Name",
      mobile: "Mobile",
      title:'Event Title',
      no_of_calls: "No. of Calls",
      no_of_notifications: "No. of Notifications",
      message_status: "Message Status",
    };
      console.log("in-------------->",titleMap)

    for (let i = 1; i <= maxLenResponse; i++) {
          titleMap[`msg_${i}`] = `Msg ${i}`;
          titleMap[`response_${i}`] = `Response ${i}`;
        }
      let body = {
        title: [
          titleMap,
        ],
        contacts:res.data,
        // unseen:unseenContactsSort
      };
      console.log("in-------------->")
      await generateExcel(body, filePath,resp);
    }
  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};


async function generateExcel(body, filePath,res,eventListReq = false) {
  try{
    console.log(filePath)
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Contacts");

  // Extract titles
  const titleMap = body.title[0]; // first element of title array
  const keys = Object.keys(titleMap); // field keys in order
  const headers = Object.values(titleMap); // display names in same order
 console.log('in22222222222222')
  // Add header row
  worksheet.addRow(headers);

  // Add data rows
  body.contacts.forEach((contact) => {
    // const row = keys.map((key) => {
    //   let value = contact[key];

    //   // Handle booleans
    //   if (typeof value === "boolean") {
    //     return value ? "Yes" : "No";
    //   }

    //   // Handle null / undefined
    //   if (value === null || value === undefined) {
    //     return "-";
    //   }
    //   // if(Array.isArray(body.unseen)){
    //   //  Array(body.unseen).filter(contact['mobile'])
    //   // }
    //   return value;
    // });
    const row = [];

    keys.forEach((key) => {
      if (key.startsWith("msg_")) {
        const index = Number(key.split("_")[1]) - 1; // msg_1 → index 0
        row.push(contact.reasons[index]?.msg || "-");
      } else if (key.startsWith("response_")) {
        const index = Number(key.split("_")[1]) - 1;
        row.push(contact.reasons[index]?.response || "-");
      } else {
        // Regular fields
        let val = contact[key];
        if (typeof val === "boolean") val = val ? "Yes" : "No";
        if (val === null || val === undefined) val = "-";
        row.push(val);
      }
    });
    worksheet.addRow(row);
  });

  // Add data rows
  console .log("eventListReq========>",eventListReq)
  // Auto-fit column widths
  worksheet.columns.forEach((col) => {
    let maxLength = 15;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const cellLength = cell.value ? cell.value.toString().length : 0;
      if (cellLength > maxLength) maxLength = cellLength;
    });
    col.width = maxLength + 2;
  });

  // Save file
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename=${filePath}.xlsx`);

  const buffer = await workbook.xlsx.writeBuffer();
  // return {
  //   fileName: `${filePath}.xlsx`,
  //   data: buffer.toString("base64"),
  // }
  res.json({
    fileName: `${filePath}.xlsx`,
    data: buffer.toString("base64"),
  });
}catch(err){
  console.error("Error fetching function excel list:", err.message);
    throw err;
}
}

export async function getOfflineFunctionDetails(params
  //user_id_tok
) {
  const { functionId: function_id,userId:user_id } = params;
  let client;
  // let user_id;
  try {
    client = await existDb.connect();

    // const { rows: issharedInbox } = await client.query(
    //   `
    //     select * from sharedinbox where user_id = $1 and oid = $2
    //   `,
    //   [user_id_tok, function_id]
    // );

    // user_id =
    //   issharedInbox.length > 0 ? issharedInbox[0].shared_by : user_id_tok;

    // 1️⃣ Fetch host + function basic details
    const functionQuery = `
    SELECT 
      f.id AS function_id,
      f.function_name,
      f.occasion_name,
      f.type,
      f.hastag,
      f.notes,
      f.created_by,
      f.offline_host_id,
      h.name AS host_name,
      h.mobile AS host_mobile,
      h.address AS host_address,
      h.city AS host_city,
      h.pincode AS host_pincode,
      h.notes As host_notes,
      COALESCE(
      json_agg(
        jsonb_build_object(
          'id', ofl.id,
          'file_name', file_item->>'file_name',
          'url', file_item->>'url',
          'key', file_item->>'key',
          'type', file_item->>'type',
          'eventtype', file_item->>'eventtype'
        )
        ORDER BY ofl.created_at ASC
      ) FILTER (WHERE file_item IS NOT NULL),
      '[]'
    ) AS occasion_file,
COALESCE(
  (
    SELECT jsonb_agg(ev.obj)
    FROM (
      SELECT DISTINCT
        jsonb_build_object(
          'id', u.id,
          'name', u.name,
          'mobile', u.mobile,
          'country_code', u.country_code
        ) AS obj
      FROM sharedinbox si
      JOIN users u ON u.id = si.user_id
      WHERE si.oid = f.id
        AND si.shared_by = f.created_by
        AND si.type = 'offline-function'
    ) ev
  ),
  '[]'::jsonb
) AS shared_details
    --  COALESCE(
       -- json_agg(
        --  DISTINCT jsonb_build_object(
         --   'id', ofl.id,
           -- 'file_name', file_item->>'file_name',
           -- 'url', file_item->>'url',
           -- 'key', file_item->>'key',
          --  'type', file_item->>'type',
           -- 'eventtype', file_item->>'eventtype'
         -- )
        --) FILTER (WHERE file_item IS NOT NULL),
       -- '[]'
      --) AS occasion_file
    FROM offline_function f
    JOIN offline_host h ON f.offline_host_id = h.id
    LEFT JOIN offline_filelist ofl 
      ON ofl.offline_function_id = f.id
      AND ofl.oid = f.id
    LEFT JOIN LATERAL jsonb_array_elements(ofl.file) AS file_item ON TRUE
    WHERE f.id = $1 
      AND f.created_by = $2
    GROUP BY 
      f.id, f.function_name, f.occasion_name, f.type, f.hastag, f.notes, 
  f.created_by, f.offline_host_id, h.name, h.mobile, h.address, h.city, h.pincode,h.notes;

    `;
    console.log( function_id,
      user_id,)
    const { rows: funcRows } = await client.query(functionQuery, [
      function_id,
      user_id,
    ]);
    if (!funcRows.length) throw new Error("Function not found");
    const functionData = funcRows[0];

    // return functionData

    // 2️⃣ Related tables + file mappings
    const relatedTables = [
      {
        table: "offline_event",
        alias: "event_details",
        fileTypes: ["event", "event-gift"],
        type: "event",
        columns: `
          t.id, t.event_name AS title, t.venu, t.notes, t.date, t.time, t.lat, t.long, t.type,t.location_name,t.gift,t.gift_code
        `,
        notesKey:"event_id"
      },
      {
        table: "offline_transportation",
        alias: "transport_details",
        fileTypes: ["transportation", "transportation-tickets"],
        type: "transportation",
        columns: `
          t.id, t.title, t.modes, t.venu, t.notes, t.date, t.time, t.lat, t.long, t.type,t.location_name
        `,
        notesKey:"transportation_id"
      },
      {
        table: "offline_accommodation",
        alias: "accommodation_details",
        fileTypes: ["accommodation", "accommodation-key"],
        type: "accommodation",
        columns: `
          t.id, t.title, t.roomkey, t.venu, t.notes, t.cin_date, t.cin_time, t.cout_date, t.cout_time, t.lat, t.long, t.type,t.location_name
        `,
         notesKey:"accommodation_id"
      },
      {
        table: "offline_preinvite",
        alias: "preinvite_details",
        fileTypes: ["preinvite"],
        type: "preinvite",
        columns: `
          t.id, t.title, t.notes, t.type
        `,
      },
    ];

    const details = {};

    // 3️⃣ Fetch related data with files and notifications
    for (const { table, alias, fileTypes, columns, type,notesKey } of relatedTables) {
      const query = `
        SELECT 
          ${columns},
          COALESCE(
            json_agg(
              --DISTINCT 
              jsonb_build_object(
                'id', fl.id,
                'file_name', f.value->>'file_name',
                'url', f.value->>'url',
                'key', f.value->>'key',
                'type', f.value->>'type',
                'eventtype', f.value->>'eventtype'
              )
              ORDER BY fl.created_at ASC
            ) FILTER (WHERE f.value IS NOT NULL),
            '[]'
          ) AS ${alias}_file
           ${table!=="offline_preinvite"? `
            ,COALESCE(
              json_agg(
               DISTINCT jsonb_build_object(
                  'id', flnt.id,
                  'notes', flnt.notes,
                  '${notesKey}', flnt.${notesKey},
                  'notescreated_at',flnt.created_at
                )
                --ORDER BY flnt.created_at ASC
              ) FILTER (WHERE flnt.notes IS NOT NULL),
              null
            ) AS user_notes`:''}
        FROM ${table} t
        LEFT JOIN offline_filelist fl 
          ON fl.oid = t.id 
          AND fl.eventtype = ANY($2)
        LEFT JOIN LATERAL jsonb_array_elements(fl.file) AS f(value) ON TRUE
       ${table!=="offline_preinvite"? 
        `LEFT JOIN offlinenotes flnt 
          ON flnt.${notesKey} = t.id 
          AND flnt.user_id ='${user_id}'`:''}
        WHERE t.offline_function_id = $1
        GROUP BY t.id
      `;
  //     , COALESCE((
  //   SELECT json_agg(
  //     jsonb_build_object(
  //       'id', n.id,
  //       'notes', n.notes,
  //       '${notesKey}', n.${notesKey}
  //     )
  //     ORDER BY n.created_at ASC
  //   )
  //   FROM offlinenotes n
  //   WHERE n.${notesKey} = t.id
  //     AND n.user_id = $3
  // ), '[]') AS user_notes

      // console.log(query)
      const { rows } = await client.query(query, [function_id, fileTypes]);

      // 3.1️⃣ Add reminder & custom notifications for each record
      for (const item of rows) {
        const oid = item.id;

        console.log(`Fetching notifications for ${type} ID:`, oid, user_id);
        // Fetch reminder notification
        const reminderQuery = `
          SELECT id, send_24hr, send_12hr, send_8hr, send_4hr
          FROM offline_push_notification_templates
          WHERE offline_function_id = $1 AND oid = $2 AND type = $3
          LIMIT 1
        `;
        const { rows: reminderRows } = await client.query(reminderQuery, [
          function_id,
          oid,
          type,
        ]);

        if (reminderRows.length) {
          const reminder = reminderRows[0];
          const messageQuery = `
            SELECT id, title, sub_heading, body, banner_url, hrs_type
            FROM offline_push_notification_messages
            WHERE notification_id = $1
            ORDER BY id ASC
          `;
          const { rows: messageRows } = await client.query(messageQuery, [
            reminder.id,
          ]);
          item.reminder_notifications = {
            ...reminder,
            messages: messageRows,
          };
        } else {
          item.reminder_notifications = null;
        }

        // Fetch custom notifications
        const customQuery = `
          SELECT 
            id, title, sub_heading, body, banner_url,
            TO_CHAR(dispatch_date_time AT TIME ZONE 'Etc/UTC', 'YYYY-MM-DD') AS dispatch_date,
            TO_CHAR(dispatch_date_time AT TIME ZONE 'Etc/UTC', 'HH24:MI:SS') AS dispatch_time
          FROM offline_push_notification_manual
          WHERE offline_function_id = $1 AND oid = $2 AND user_id = $3
          ORDER BY id ASC
        `;
        const { rows: customRows } = await client.query(customQuery, [
          function_id,
          oid,
          user_id,
        ]);
        item.custom_notification = customRows.length
          ? customRows.map((d) => ({
              ...d,
              ...convertIstTime(d.dispatch_date, d.dispatch_time),
            }))
          : [];
      }

      details[alias] = rows;
    }

    // 4️⃣ Final structured response
    return {
      success: true,
      message: "Function details fetched successfully",
      data: {
        // sharedDetails: issharedInbox,
        offline_host: {
          id: functionData.offline_host_id,
          name: functionData.host_name,
          mobile: functionData.host_mobile,
          address: functionData.host_address,
          city: functionData.host_city,
          pincode: functionData.host_pincode,
          notes: functionData.host_notes,
        },
        offline_function: {
          id: functionData.function_id,
          function_name: functionData.function_name,
          occasion_name: functionData.occasion_name,
          type: functionData.type,
          hastag: functionData.hastag,
          notes: functionData.notes,
          occasion_file: functionData.occasion_file,
        },
        shared_details:functionData.shared_details,
        ...details,
      },
    };
  } catch (error) {
    console.error("Error fetching function details:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
};

export async function getDashboardDetails(params) {
  let client;

  try {
    client = await existDb.connect();

    const { start_date, end_date } = params;

    let dateFilter = "";
    let values = [];
    let dateFilterUser = '';

    if (start_date && end_date) {
      const startUTC = dayjs(start_date)
        .tz("Asia/Kolkata",true)
        .startOf("day")
        .utc()
        .toISOString()

      const endUTC = dayjs(end_date)
        .tz("Asia/Kolkata",true)
        .endOf("day")
        .utc()
        .toISOString()

      dateFilter = `AND created_at BETWEEN $1 AND $2`
      dateFilterUser = `AND fc.created_at BETWEEN $1 AND $2`

      values = [startUTC, endUTC]
    }


    const { rows } = await client.query(
      `
      SELECT
        (SELECT COUNT(*) FROM function WHERE 1=1 ${dateFilter}) AS function_count,
        (SELECT COUNT(*) FROM offline_function WHERE 1=1 ${dateFilter}) AS offline_function_count,
        --(SELECT COUNT(*) FROM users u join fcm fc on fc.user_id = u.id  WHERE 1=1 ${dateFilterUser}) AS user_count,
        (SELECT COUNT(*) FROM (
          SELECT DISTINCT ON (fc.user_id) fc.user_id
          FROM users u
          JOIN fcm fc ON fc.user_id = u.id
          WHERE 1=1 ${dateFilterUser}
          ORDER BY fc.user_id, fc.created_at DESC
        ) AS latest_fcm) AS user_count,
        (SELECT COUNT(*) FROM familyconnection WHERE 1=1 ${dateFilter}) AS familyconnection_count
      `,
      values
    );

    return rows[0];
  } catch (error) {
    console.error("Error fetching Dashboard Numbers:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

// export async function getuserList(params) {
//   let client;

//   try {
//     client = await existDb.connect();

//     const { 
//       page,
//       limit,
//       search,
//       sd:start_date,
//       ed:end_date
//       } = params;
//       const limitN = Number(limit) || 1; 
//       const pageN = Number(page) || 10;  
//       const offset = (pageN - 1) * limit;
//     let dateFilter = ''
//     let values = []
//      if (start_date !== '' && end_date !== '') {
//       const startUTC = dayjs(start_date)
//         .tz("Asia/Kolkata",true)
//         .startOf("day")
//         .utc()
//         .toISOString()

//       const endUTC = dayjs(end_date)
//         .tz("Asia/Kolkata",true)
//         .endOf("day")
//         .utc()
//         .toISOString()

//       dateFilter = `AND f.created_at BETWEEN $4 AND $5`
//       values = [limitN, offset, search,startUTC, endUTC]
//     }else{
//       values =[limitN, offset, search]
//     }
//   const { rows } = await client.query(
//       `${start_date !== '' && end_date !== '' ? `SELECT *
//       FROM users u
//       WHERE (
//         COALESCE($3, '') = ''
//         OR u.name ILIKE '%' || $3 || '%'
//         OR u.mobile ILIKE '%' || $3 || '%'
//       )
//       ORDER BY u.created_at DESC
//       LIMIT $1 OFFSET $2`:
//       `
//       SELECT *
//       FROM users u
//       join fcm f on f.user_id = u.id
//       WHERE (
//         COALESCE($3, '') = ''
//         OR u.name ILIKE '%' || $3 || '%'
//         OR u.mobile ILIKE '%' || $3 || '%'
//       )
//       AND f.created_at BETWEEN $4 AND $5
//       ORDER BY f.created_at DESC
//       LIMIT $1 OFFSET $2
//       `}
      
//       `,
//       values
//     )

//     const { rows:count } = await client.query(
//       `
//       SELECT count(*) from users u
//        WHERE (
//         COALESCE($1, '') = ''
//         OR u.name ILIKE '%' || $1 || '%'
//         OR u.mobile ILIKE '%' || $1 || '%'
//       )
//       `,
//       [search]
//     );

//     return {data:rows,count:count[0]};
//   } catch (error) {
//     console.error("Error fetching User List:", error);
//     throw error;
//   } finally {
//     if (client) client.release();
//   }
// }

export async function getuserList(params) {
  let client;

  try {
    client = await existDb.connect();

    const {
      page,
      limit,
      search,
      sd: start_date,
      ed: end_date,
    } = params;

    const limitN = Number(limit) || 10;
    const pageN = Number(page) || 1;
    const offset = (pageN - 1) * limitN; // ✅ was using `limit` instead of `limitN`

    const hasDateFilter = start_date && end_date;
    const hasSearch = search?.trim() !== '' && search != null;

    let values = [];
    let dateFilter = '';

    if (hasDateFilter) {
      const startUTC = dayjs(start_date)
        .tz("Asia/Kolkata", true)
        .startOf("day")
        .utc()
        .toISOString();

      const endUTC = dayjs(end_date)
        .tz("Asia/Kolkata", true)
        .endOf("day")
        .utc()
        .toISOString();

      dateFilter = `AND f.created_at BETWEEN $4 AND $5`;
      values = [limitN, offset, search ?? '', startUTC, endUTC];
    } else {
      values = [limitN, offset, search ?? ''];
    }

    // ─── List Query ───────────────────────────────────────────────
    const listQuery = hasDateFilter
      ? `
          SELECT DISTINCT ON (u.id) u.*,f.created_at as fcm_created
          FROM users u
          JOIN fcm f ON f.user_id = u.id
          WHERE (
            COALESCE($3, '') = ''
            OR u.name   ILIKE '%' || $3 || '%'
            OR u.mobile ILIKE '%' || $3 || '%'
          )
          ${dateFilter}
          ORDER BY u.id, f.created_at DESC
          LIMIT $1 OFFSET $2
        `
      : `
          SELECT *
          FROM users u
          WHERE (
            COALESCE($3, '') = ''
            OR u.name   ILIKE '%' || $3 || '%'
            OR u.mobile ILIKE '%' || $3 || '%'
          )
          ORDER BY u.created_at DESC
          LIMIT $1 OFFSET $2
        `;

    // ─── Count Query ──────────────────────────────────────────────
    const countQuery = hasDateFilter
      ? `
          SELECT COUNT(DISTINCT u.id) AS total
          FROM users u
          JOIN fcm f ON f.user_id = u.id
          WHERE (
            COALESCE($1, '') = ''
            OR u.name   ILIKE '%' || $1 || '%'
            OR u.mobile ILIKE '%' || $1 || '%'
          )
          AND f.created_at BETWEEN $2 AND $3
        `
      : `
          SELECT COUNT(*) AS total
          FROM users u
          WHERE (
            COALESCE($1, '') = ''
            OR u.name   ILIKE '%' || $1 || '%'
            OR u.mobile ILIKE '%' || $1 || '%'
          )
        `;

    const countValues = hasDateFilter
      ? [search ?? '', values[3], values[4]]
      : [search ?? ''];

    // ─── Run Both in Parallel ─────────────────────────────────────
    const [{ rows }, { rows: countRows }] = await Promise.all([
      client.query(listQuery, values),
      client.query(countQuery, countValues),
    ]);

    return { data: rows, count: countRows[0] };

  } catch (error) {
    console.error("Error fetching User List:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

export async function getuserDetails(params) {
  let client;

  try {
    client = await existDb.connect();

    const { 
      page,
      limit,
      search,
      userId
      } = params;
      const limitN = Number(limit) || 1; 
      const pageN = Number(page) || 10;  
      const offset = (pageN - 1) * limit;


  const { rows:userDetail } = await client.query(
      `
      SELECT *
      FROM users u
      WHERE u.id = $1
      `,
      [userId]
    )

    if(!userDetail.length){
      throw Boom.notFound("User Not Found")
    }
    const {mobile,country_code} = userDetail[0]
    const {rows:contactsId} = await client.query(
      `
      select id from contacts where mobile = $1 and country_code=$2
      `,[mobile,country_code]
    )

    const mappedIds = contactsId.map(d=>d.id)

    console.log("mappedIds----->",mappedIds)
      const { rows:mappedEvents } = await client.query(
      `
      SELECT 
        f.*,

        COALESCE(
          json_agg(DISTINCT e) FILTER (WHERE e.id IS NOT NULL),
          '[]'
        ) AS events,

        COALESCE(
          json_agg(DISTINCT t) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) AS transportation,

        COALESCE(
          json_agg(DISTINCT a) FILTER (WHERE a.id IS NOT NULL),
          '[]'
        ) AS accommodation,

        COALESCE(
          json_agg(DISTINCT io) FILTER (WHERE io.id IS NOT NULL),
          '[]'
        ) AS otherinfo

      FROM mappedContact mc

      LEFT JOIN event e 
        ON e.id = mc.oid

      LEFT JOIN transportation t 
        ON t.id = mc.oid

      LEFT JOIN accommodation a 
        ON a.id = mc.oid

      LEFT JOIN otherinfo io 
        ON io.id = mc.oid

      LEFT JOIN function f 
        ON f.id = COALESCE(
            e.function_id,
            t.function_id,
            a.function_id,
            io.function_id
        )

      WHERE mc.contact_id && $1::uuid[]

      GROUP BY f.id
      `,
      [mappedIds]
      );

       const { rows:sharedInvites } = await client.query(
      `
      SELECT 
  f.*,

  COALESCE(
    json_agg(DISTINCT e) FILTER (WHERE e.id IS NOT NULL),
    '[]'
  ) AS events,

  COALESCE(
    json_agg(DISTINCT t) FILTER (WHERE t.id IS NOT NULL),
    '[]'
  ) AS transportation,

  COALESCE(
    json_agg(DISTINCT a) FILTER (WHERE a.id IS NOT NULL),
    '[]'
  ) AS accommodation,

  COALESCE(
    json_agg(DISTINCT io) FILTER (WHERE io.id IS NOT NULL),
    '[]'
  ) AS otherinfo,

COALESCE(
  json_agg(
    jsonb_build_object(
      'id', si.id,
      'oid', si.oid,
      'type', si.type,
      'shared_by', si.shared_by,
      'user_id', si.user_id,
      'user_name', u.name
    )
  ) FILTER (WHERE si.id IS NOT NULL),
  '[]'
) AS sharedInfo

FROM mappedContact mc

LEFT JOIN event e 
  ON e.id = mc.oid

LEFT JOIN transportation t 
  ON t.id = mc.oid

LEFT JOIN accommodation a 
  ON a.id = mc.oid

LEFT JOIN otherinfo io 
  ON io.id = mc.oid

LEFT JOIN function f 
  ON f.id = COALESCE(
      e.function_id,
      t.function_id,
      a.function_id,
      io.function_id
  )

LEFT JOIN sharedinbox si 
  ON (
        (si.type = 'function' AND si.oid = f.id)
     OR (si.type = 'transportation' AND si.oid = t.id)
     OR (si.type = 'accommodation' AND si.oid = a.id)
     OR (si.type = 'otherinfo' AND si.oid = io.id)
     )
  AND si.shared_by = ANY($1)
LEFT JOIN users u
ON u.id = si.user_id

WHERE mc.contact_id && $1::uuid[]

GROUP BY f.id
      `,
      [mappedIds]
      );

      const [addedByMe, addedMe, mutual] = await Promise.all([

      // 1️⃣ Added by me (NON mutual)
      client.query(
        `
        SELECT fc.*
        FROM familyConnection fc
        WHERE
          fc.created_by = $1
          AND NOT EXISTS (
            SELECT 1
            FROM familyConnection fc2
            WHERE
              fc2.created_by = fc.user_id
              AND fc2.user_id = $1
          )
        `,
        [userId]
      ),

      // 2️⃣ Added me (NON mutual)
      client.query(
        `
        SELECT fc.*,
        u.name as added_by,
        u.mobile as adder_mobile,
        u.country_code as adder_countrycode,
        u.profile_logo as adder_file
        FROM familyConnection fc
        join users u on u.id = fc.created_by
        WHERE
           fc.user_id = $1
           AND fc.created_by != $1
          --fc1.created_by = $1
          AND NOT EXISTS (
            SELECT 1
            FROM familyConnection fc2
            WHERE
              fc2.created_by = $1
              AND fc2.user_id = fc.created_by
          )
        `,
        [userId]
      ),

      // 3️⃣ Mutual
      client.query(
        `
        SELECT fc1.*,
        fc2.share_invite as share_invite_bythem,
        fc2.share_offinvite as share_offinvite_bythem
        FROM familyConnection fc1
        JOIN familyConnection fc2
          ON fc1.created_by = fc2.user_id
         AND fc1.user_id = fc2.created_by
        WHERE fc1.created_by = $1
        `,
        [userId]
      )

    ]);

    return {
      data:{
      userDetail,
      mappedEvents,
      familyList:{
        addedByMe: addedByMe.rows,
        addedMe: addedMe.rows,
        mutual: mutual.rows
      },
      sharedInvites
    }};
  } catch (error) {
    console.error("Error fetching User List:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

// export async function getOfflineFunctionDetailsAll(params) {
//   const { userId:user_id } = params;
//   let client;
//   try {
//     client = await existDb.connect();
//     // 1️⃣ Fetch host + function basic details
//     const functionQuery = `
//     SELECT 
//       f.id AS function_id,
//       f.function_name,
//       f.occasion_name,
//       f.type,
//       f.hastag,
//       f.notes,
//       f.created_by,
//       f.offline_host_id,
//       h.name AS host_name,
//       h.mobile AS host_mobile,
//       h.address AS host_address,
//       h.city AS host_city,
//       h.pincode AS host_pincode,
//       h.notes As host_notes,
//       COALESCE(
//       json_agg(
//         jsonb_build_object(
//           'id', ofl.id,
//           'file_name', file_item->>'file_name',
//           'url', file_item->>'url',
//           'key', file_item->>'key',
//           'type', file_item->>'type',
//           'eventtype', file_item->>'eventtype'
//         )
//         ORDER BY ofl.created_at ASC
//       ) FILTER (WHERE file_item IS NOT NULL),
//       '[]'
//     ) AS occasion_file,
// COALESCE(
//   (
//     SELECT jsonb_agg(ev.obj)
//     FROM (
//       SELECT DISTINCT
//         jsonb_build_object(
//           'id', u.id,
//           'name', u.name,
//           'mobile', u.mobile,
//           'country_code', u.country_code
//         ) AS obj
//       FROM sharedinbox si
//       JOIN users u ON u.id = si.user_id
//       WHERE si.oid = f.id
//         AND si.shared_by = f.created_by
//         AND si.type = 'offline-function'
//     ) ev
//   ),
//   '[]'::jsonb
// ) AS shared_details
//     FROM offline_function f
//     JOIN offline_host h ON f.offline_host_id = h.id
//     LEFT JOIN offline_filelist ofl 
//       ON ofl.offline_function_id = f.id
//       AND ofl.oid = f.id
//     LEFT JOIN LATERAL jsonb_array_elements(ofl.file) AS file_item ON TRUE
//     WHERE f.id = $1 
//       AND f.created_by = $2
//     GROUP BY 
//       f.id, f.function_name, f.occasion_name, f.type, f.hastag, f.notes, 
//   f.created_by, f.offline_host_id, h.name, h.mobile, h.address, h.city, h.pincode,h.notes;

//     `;
//     console.log(user_id,)
//     const { rows: funcRows } = await client.query(functionQuery, [
//       user_id,
//     ]);
//     if (!funcRows.length) return{
//       success: true,
//       message: "Offline Function details fetched successfully",
//       offline: [] ,
//     };

//     const results =[]

//     for(let d of funcRows){
//     const functionData = d;

//     // return functionData

//     // 2️⃣ Related tables + file mappings
//     const relatedTables = [
//       {
//         table: "offline_event",
//         alias: "event_details",
//         fileTypes: ["event", "event-gift"],
//         type: "event",
//         columns: `
//           t.id, t.event_name AS title, t.venu, t.notes, t.date, t.time, t.lat, t.long, t.type,t.location_name,t.gift,t.gift_code
//         `,
//         notesKey:"event_id"
//       },
//       {
//         table: "offline_transportation",
//         alias: "transport_details",
//         fileTypes: ["transportation", "transportation-tickets"],
//         type: "transportation",
//         columns: `
//           t.id, t.title, t.modes, t.venu, t.notes, t.date, t.time, t.lat, t.long, t.type,t.location_name
//         `,
//         notesKey:"transportation_id"
//       },
//       {
//         table: "offline_accommodation",
//         alias: "accommodation_details",
//         fileTypes: ["accommodation", "accommodation-key"],
//         type: "accommodation",
//         columns: `
//           t.id, t.title, t.roomkey, t.venu, t.notes, t.cin_date, t.cin_time, t.cout_date, t.cout_time, t.lat, t.long, t.type,t.location_name
//         `,
//          notesKey:"accommodation_id"
//       },
//       {
//         table: "offline_preinvite",
//         alias: "preinvite_details",
//         fileTypes: ["preinvite"],
//         type: "preinvite",
//         columns: `
//           t.id, t.title, t.notes, t.type
//         `,
//       },
//     ];

//     const details = {};

//     // 3️⃣ Fetch related data with files and notifications
//     for (const { table, alias, fileTypes, columns, type,notesKey } of relatedTables) {
//       const query = `
//         SELECT 
//           ${columns},
//           COALESCE(
//             json_agg(
//               --DISTINCT 
//               jsonb_build_object(
//                 'id', fl.id,
//                 'file_name', f.value->>'file_name',
//                 'url', f.value->>'url',
//                 'key', f.value->>'key',
//                 'type', f.value->>'type',
//                 'eventtype', f.value->>'eventtype'
//               )
//               ORDER BY fl.created_at ASC
//             ) FILTER (WHERE f.value IS NOT NULL),
//             '[]'
//           ) AS ${alias}_file
//            ${table!=="offline_preinvite"? `
//             ,COALESCE(
//               json_agg(
//                DISTINCT jsonb_build_object(
//                   'id', flnt.id,
//                   'notes', flnt.notes,
//                   '${notesKey}', flnt.${notesKey},
//                   'notescreated_at',flnt.created_at
//                 )
//                 --ORDER BY flnt.created_at ASC
//               ) FILTER (WHERE flnt.notes IS NOT NULL),
//               null
//             ) AS user_notes`:''}
//         FROM ${table} t
//         LEFT JOIN offline_filelist fl 
//           ON fl.oid = t.id 
//           AND fl.eventtype = ANY($2)
//         LEFT JOIN LATERAL jsonb_array_elements(fl.file) AS f(value) ON TRUE
//        ${table!=="offline_preinvite"? 
//         `LEFT JOIN offlinenotes flnt 
//           ON flnt.${notesKey} = t.id 
//           AND flnt.user_id ='${user_id}'`:''}
//         WHERE t.offline_function_id = $1
//         GROUP BY t.id
//       `;
//   //     , COALESCE((
//   //   SELECT json_agg(
//   //     jsonb_build_object(
//   //       'id', n.id,
//   //       'notes', n.notes,
//   //       '${notesKey}', n.${notesKey}
//   //     )
//   //     ORDER BY n.created_at ASC
//   //   )
//   //   FROM offlinenotes n
//   //   WHERE n.${notesKey} = t.id
//   //     AND n.user_id = $3
//   // ), '[]') AS user_notes

//       // console.log(query)
//       const { rows } = await client.query(query, [function_id, fileTypes]);

//       // 3.1️⃣ Add reminder & custom notifications for each record
//       for (const item of rows) {
//         const oid = item.id;

//         console.log(`Fetching notifications for ${type} ID:`, oid, user_id);
//         // Fetch reminder notification
//         const reminderQuery = `
//           SELECT id, send_24hr, send_12hr, send_8hr, send_4hr
//           FROM offline_push_notification_templates
//           WHERE offline_function_id = $1 AND oid = $2 AND type = $3
//           LIMIT 1
//         `;
//         const { rows: reminderRows } = await client.query(reminderQuery, [
//           function_id,
//           oid,
//           type,
//         ]);

//         if (reminderRows.length) {
//           const reminder = reminderRows[0];
//           const messageQuery = `
//             SELECT id, title, sub_heading, body, banner_url, hrs_type
//             FROM offline_push_notification_messages
//             WHERE notification_id = $1
//             ORDER BY id ASC
//           `;
//           const { rows: messageRows } = await client.query(messageQuery, [
//             reminder.id,
//           ]);
//           item.reminder_notifications = {
//             ...reminder,
//             messages: messageRows,
//           };
//         } else {
//           item.reminder_notifications = null;
//         }

//         // Fetch custom notifications
//         const customQuery = `
//           SELECT 
//             id, title, sub_heading, body, banner_url,
//             TO_CHAR(dispatch_date_time AT TIME ZONE 'Etc/UTC', 'YYYY-MM-DD') AS dispatch_date,
//             TO_CHAR(dispatch_date_time AT TIME ZONE 'Etc/UTC', 'HH24:MI:SS') AS dispatch_time
//           FROM offline_push_notification_manual
//           WHERE offline_function_id = $1 AND oid = $2 AND user_id = $3
//           ORDER BY id ASC
//         `;
//         const { rows: customRows } = await client.query(customQuery, [
//           function_id,
//           oid,
//           user_id,
//         ]);
//         item.custom_notification = customRows.length
//           ? customRows.map((d) => ({
//               ...d,
//               ...convertIstTime(d.dispatch_date, d.dispatch_time),
//             }))
//           : [];
//       }

//       details[alias] = rows;
//     }
//      results.push({
//         // sharedDetails: issharedInbox,
//         offline_host: {
//           id: functionData.offline_host_id,
//           name: functionData.host_name,
//           mobile: functionData.host_mobile,
//           address: functionData.host_address,
//           city: functionData.host_city,
//           pincode: functionData.host_pincode,
//           notes: functionData.host_notes,
//         },
//         offline_function: {
//           id: functionData.function_id,
//           function_name: functionData.function_name,
//           occasion_name: functionData.occasion_name,
//           type: functionData.type,
//           hastag: functionData.hastag,
//           notes: functionData.notes,
//           occasion_file: functionData.occasion_file,
//         },
//         shared_details:functionData.shared_details,
//         ...details,
//       })
//     }


//     // 4️⃣ Final structured response
//     return {
//       success: true,
//       message: "Offline Function details fetched successfully",
//       offline: results ,
//     };
//   } catch (error) {
//     console.error("Error fetching function details:", error);
//     throw error;
//   } finally {
//     if (client) client.release();
//   }
// };

export async function getOfflineFunctionDetailsAll(params) {
  const { userId: user_id } = params;
  let client;

  try {
    client = await existDb.connect();

    // ─── 1. Main Function Query ───────────────────────────────────
    const { rows: funcRows } = await client.query(`
      SELECT 
        f.id AS function_id,
        f.function_name,
        f.occasion_name,
        f.type,
        f.hastag,
        f.notes,
        f.created_by,
        f.offline_host_id,
        h.name        AS host_name,
        h.mobile      AS host_mobile,
        h.address     AS host_address,
        h.city        AS host_city,
        h.pincode     AS host_pincode,
        h.notes       AS host_notes,
        COALESCE(
          json_agg(
            jsonb_build_object(
              'id',        ofl.id,
              'file_name', file_item->>'file_name',
              'url',       file_item->>'url',
              'key',       file_item->>'key',
              'type',      file_item->>'type',
              'eventtype', file_item->>'eventtype'
            ) ORDER BY ofl.created_at ASC
          ) FILTER (WHERE file_item IS NOT NULL),
          '[]'
        ) AS occasion_file,
        COALESCE(
          (
            SELECT jsonb_agg(ev.obj)
            FROM (
              SELECT DISTINCT jsonb_build_object(
                'id',           u.id,
                'name',         u.name,
                'mobile',       u.mobile,
                'country_code', u.country_code
              ) AS obj
              FROM sharedinbox si
              JOIN users u ON u.id = si.user_id
              WHERE si.oid = f.id
                AND si.shared_by = f.created_by
                AND si.type = 'offline-function'
            ) ev
          ),
          '[]'::jsonb
        ) AS shared_details
      FROM offline_function f
      JOIN offline_host h ON f.offline_host_id = h.id
      LEFT JOIN offline_filelist ofl
        ON ofl.offline_function_id = f.id AND ofl.oid = f.id
      LEFT JOIN LATERAL jsonb_array_elements(ofl.file) AS file_item ON TRUE
      WHERE f.created_by = $1
      GROUP BY
        f.id, f.function_name, f.occasion_name, f.type, f.hastag, f.notes,
        f.created_by, f.offline_host_id,
        h.name, h.mobile, h.address, h.city, h.pincode, h.notes
    `, [user_id]);

    if (!funcRows.length) return {
      success: true,
      message: "Offline Function details fetched successfully",
      offline: [],
    };

    // ─── 2. Related Table Config ──────────────────────────────────
    const relatedTables = [
      {
        table: "offline_event",
        alias: "event_details",
        fileTypes: ["event", "event-gift"],
        type: "event",
        notesKey: "event_id",
        columns: `t.id, t.event_name AS title, t.venu, t.notes, t.date, t.time,
                  t.lat, t.long, t.type, t.location_name, t.gift, t.gift_code`,
      },
      {
        table: "offline_transportation",
        alias: "transport_details",
        fileTypes: ["transportation", "transportation-tickets"],
        type: "transportation",
        notesKey: "transportation_id",
        columns: `t.id, t.title, t.modes, t.venu, t.notes, t.date, t.time,
                  t.lat, t.long, t.type, t.location_name`,
      },
      {
        table: "offline_accommodation",
        alias: "accommodation_details",
        fileTypes: ["accommodation", "accommodation-key"],
        type: "accommodation",
        notesKey: "accommodation_id",
        columns: `t.id, t.title, t.roomkey, t.venu, t.notes, t.cin_date, t.cin_time,
                  t.cout_date, t.cout_time, t.lat, t.long, t.type, t.location_name`,
      },
      {
        table: "offline_preinvite",
        alias: "preinvite_details",
        fileTypes: ["preinvite"],
        type: "preinvite",
        notesKey: null,
        columns: `t.id, t.title, t.notes, t.type`,
      },
    ];

    // ─── 3. Helper: Fetch notifications for a single item ─────────
    const fetchNotifications = async (function_id, oid, type) => {
      const [reminderResult, customResult] = await Promise.all([
        client.query(`
          SELECT id, send_24hr, send_12hr, send_8hr, send_4hr
          FROM offline_push_notification_templates
          WHERE offline_function_id = $1 AND oid = $2 AND type = $3
          LIMIT 1
        `, [function_id, oid, type]),

        client.query(`
          SELECT
            id, title, sub_heading, body, banner_url,
            TO_CHAR(dispatch_date_time AT TIME ZONE 'Etc/UTC', 'YYYY-MM-DD') AS dispatch_date,
            TO_CHAR(dispatch_date_time AT TIME ZONE 'Etc/UTC', 'HH24:MI:SS') AS dispatch_time
          FROM offline_push_notification_manual
          WHERE offline_function_id = $1 AND oid = $2 AND user_id = $3
          ORDER BY id ASC
        `, [function_id, oid, user_id]),
      ]);

      // Fetch messages if reminder exists
      let reminder_notifications = null;
      if (reminderResult.rows.length) {
        const reminder = reminderResult.rows[0];
        const { rows: messageRows } = await client.query(`
          SELECT id, title, sub_heading, body, banner_url, hrs_type
          FROM offline_push_notification_messages
          WHERE notification_id = $1
          ORDER BY id ASC
        `, [reminder.id]);

        reminder_notifications = { ...reminder, messages: messageRows };
      }

      const custom_notification = customResult.rows.length
        ? customResult.rows.map(d => ({
            ...d,
            ...convertIstTime(d.dispatch_date, d.dispatch_time),
          }))
        : [];

      return { reminder_notifications, custom_notification };
    };

    // ─── 4. Helper: Fetch one related table for a function ────────
    const fetchRelatedTable = async (function_id, tableCfg) => {
      const { table, alias, fileTypes, columns, type, notesKey } = tableCfg;
      const hasNotes = notesKey !== null;

      const { rows } = await client.query(`
        SELECT
          ${columns},
          COALESCE(
            json_agg(
              jsonb_build_object(
                'id',        fl.id,
                'file_name', f.value->>'file_name',
                'url',       f.value->>'url',
                'key',       f.value->>'key',
                'type',      f.value->>'type',
                'eventtype', f.value->>'eventtype'
              ) ORDER BY fl.created_at ASC
            ) FILTER (WHERE f.value IS NOT NULL),
            '[]'
          ) AS ${alias}_file
          ${hasNotes ? `,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id',               flnt.id,
                'notes',            flnt.notes,
                '${notesKey}',      flnt.${notesKey},
                'notescreated_at',  flnt.created_at
              )
            ) FILTER (WHERE flnt.notes IS NOT NULL),
            null
          ) AS user_notes` : ''}
        FROM ${table} t
        LEFT JOIN offline_filelist fl
          ON fl.oid = t.id AND fl.eventtype = ANY($2)
        LEFT JOIN LATERAL jsonb_array_elements(fl.file) AS f(value) ON TRUE
        ${hasNotes ? `
        LEFT JOIN offlinenotes flnt
          ON flnt.${notesKey} = t.id AND flnt.user_id = $3` : ''}
        WHERE t.offline_function_id = $1
        GROUP BY t.id
      `, hasNotes ? [function_id, fileTypes, user_id] : [function_id, fileTypes]);

      // ── Attach notifications to each row in parallel ──
      const rowsWithNotifications = await Promise.all(
        rows.map(async item => {
          const notifications = await fetchNotifications(function_id, item.id, type);
          return { ...item, ...notifications };
        })
      );

      return { alias, rows: rowsWithNotifications };
    };

    // ─── 5. Process all functions in parallel ─────────────────────
    const results = await Promise.all(
      funcRows.map(async (functionData) => {
        const function_id = functionData.function_id;

        // Fetch all related tables in parallel per function
        const relatedResults = await Promise.all(
          relatedTables.map(cfg => fetchRelatedTable(function_id, cfg))
        );

        const details = Object.fromEntries(
          relatedResults.map(({ alias, rows }) => [alias, rows])
        );

        return {
          offline_host: {
            id:      functionData.offline_host_id,
            name:    functionData.host_name,
            mobile:  functionData.host_mobile,
            address: functionData.host_address,
            city:    functionData.host_city,
            pincode: functionData.host_pincode,
            notes:   functionData.host_notes,
          },
          offline_function: {
            id:            functionData.function_id,
            function_name: functionData.function_name,
            occasion_name: functionData.occasion_name,
            type:          functionData.type,
            hastag:        functionData.hastag,
            notes:         functionData.notes,
            occasion_file: functionData.occasion_file,
          },
          shared_details: functionData.shared_details,
          ...details,
        };
      })
    );

    return {
      success: true,
      message: "Offline Function details fetched successfully",
      offline: results,
    };

  } catch (error) {
    console.error("Error fetching function details:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

const convertIstTime = (date, time) => {
  if (!date || !time) return { ist_date: null, ist_time: null };

  const utcDateTime = dayjs.utc(`${date}T${time}`);
  const ist = utcDateTime.tz("Asia/Kolkata");

  return {
    ist_date: ist.format("YYYY-MM-DD"),
    ist_time: ist.format("HH:mm:ss"),
  };
};

export async function getFamilyMemberList(params) {
  let client;

  try {
    client = await existDb.connect();

    const {
      page,
      limit,
      search,
      sd: start_date,
      ed: end_date,
    } = params;

    const limitN = Number(limit) || 10;
    const pageN = Number(page) || 1;
    const offset = (pageN - 1) * limitN;

    const hasDateFilter = start_date && end_date;

    let values = [];
    let dateFilter = '';
    let startUTC, endUTC;

    if (hasDateFilter) {
      startUTC = dayjs(start_date)
        .tz("Asia/Kolkata", true)
        .startOf("day")
        .utc()
        .toISOString();

      endUTC = dayjs(end_date)
        .tz("Asia/Kolkata", true)
        .endOf("day")
        .utc()
        .toISOString();

      dateFilter = `AND f.created_at BETWEEN $4 AND $5`;
      values = [limitN, offset, search ?? '', startUTC, endUTC];
    } else {
      values = [limitN, offset, search ?? ''];
    }

    // ─── Shared SELECT columns ────────────────────────────────────
    const selectColumns = `
      f.user_id as id,
      f.name AS member_name,
      f.mobile AS member_mobile,
      f.created_at,
      u.id As creator_id,
      u.name AS creator_name,
      u.mobile AS creator_mobile,
      f.created_at
    `;

    // ─── Shared WHERE clause ──────────────────────────────────────
    const searchFilter = `
      WHERE (
        COALESCE($3, '') = ''
        OR u.name   ILIKE '%' || $3 || '%'
        OR u.mobile ILIKE '%' || $3 || '%'
        OR f.name   ILIKE '%' || $3 || '%'
        OR f.mobile ILIKE '%' || $3 || '%'
      )
    `;

    // ─── List Query ───────────────────────────────────────────────
    const listQuery = `
      SELECT ${selectColumns}
      FROM familyconnection f
      JOIN users u ON u.id = f.created_by
      ${searchFilter}
      ${hasDateFilter ? dateFilter : ''}
      ORDER BY f.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    // ─── Count Query ──────────────────────────────────────────────
    // ✅ Fixed: was using $3 for both search and endUTC (param collision)
    // ✅ Fixed: count query now uses its own clean param positions $1, $2, $3
    const countQuery = hasDateFilter
      ? `
          SELECT COUNT(*) AS total
          FROM familyconnection f
          JOIN users u ON u.id = f.created_by
          WHERE (
            COALESCE($1, '') = ''
            OR u.name   ILIKE '%' || $1 || '%'
            OR u.mobile ILIKE '%' || $1 || '%'
            OR f.name   ILIKE '%' || $1 || '%'
            OR f.mobile ILIKE '%' || $1 || '%'
          )
          AND f.created_at BETWEEN $2 AND $3
        `
      : `
          SELECT COUNT(*) AS total
          FROM familyconnection f
          JOIN users u ON u.id = f.created_by
          WHERE (
            COALESCE($1, '') = ''
            OR u.name   ILIKE '%' || $1 || '%'
            OR u.mobile ILIKE '%' || $1 || '%'
            OR f.name   ILIKE '%' || $1 || '%'
            OR f.mobile ILIKE '%' || $1 || '%'
          )
        `;

    const countValues = hasDateFilter
      ? [search ?? '', startUTC, endUTC]  // ✅ use saved vars, not values[3]/values[4]
      : [search ?? ''];

    // ─── Run Both in Parallel ─────────────────────────────────────
    const [{ rows }, { rows: countRows }] = await Promise.all([
      client.query(listQuery, values),
      client.query(countQuery, countValues),
    ]);

    return { data: rows, count: countRows[0] };

  } catch (error) {
    console.error("Error fetching Family Member List:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}