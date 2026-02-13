import Boom from '@hapi/boom';
import { adminDb as adminDbPool } from "../../config/adminDb.js";
import {  existingPool as existDb } from '../../config/dbExisiting.js';
import { assignedContactList } from '../call-managements/controller.js';
import ExcelJS from"exceljs";





// export const userListBasedFunction = async (query, loggedUser) => {
//   const { limit = 20, page = 1, search } = query;

//   const limitN = Number(limit) || 1;
//   const pageN = Number(page) || 10;
//   const offset = (pageN - 1) * limit;

//   const client = await adminDbPool.connect();
//   const existClient = await existDb.connect();

//   try {
//     // --------------------
//     // Fetch MAIN FUNCTION LIST
//     // --------------------
//     const { rows: functionlist } = await existClient.query(`
//       select distinct f.user_id, u.name, u.mobile
//       from function f 
//       join users u on u.id = f.user_id
//       where (
//         $3::text IS NULL OR 
//         $3::text = '' OR 
//         u.name ILIKE '%' || $3::text || '%' OR 
//         u.mobile ILIKE '%' || $3::text || '%'
//       )
//       ORDER BY f.user_id, u.name, u.mobile DESC
//       LIMIT $1 OFFSET $2
//     `, [limitN, offset, search]);

//     const { rows: functionCount } = await existClient.query(`
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


//     // --------------------
//     // Fetch OFFLINE FUNCTION LIST
//     // --------------------
//     const { rows: offfunctionlist } = await existClient.query(`
//       select distinct f.created_by as user_id, u.name, u.mobile
//       from offline_function f 
//       join users u on u.id = f.created_by
//       where (
//         $3::text IS NULL OR 
//         $3::text = '' OR 
//         u.name ILIKE '%' || $3::text || '%' OR 
//         u.mobile ILIKE '%' || $3::text || '%'
//       )
//       ORDER BY f.created_by, u.name, u.mobile  DESC
//       LIMIT $1 OFFSET $2
//     `, [limitN, offset, search]);


//     const { rows: offlinefunctionCount } = await existClient.query(`
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


//     // --------------------
//     // REMOVE DUPLICATES
//     // --------------------
//     const functionIds = new Set(functionlist.map(u => u.user_id));

//     const filteredOffline = offfunctionlist.filter(
//       u => !functionIds.has(u.user_id)
//     );

//     const adjustedOfflineCount = filteredOffline.length;


//     // --------------------
//     // RETURN MERGED RESULT
//     // --------------------
//     return {
//       message: "User List Data",
//       onlineFunctionList: functionlist,
//       onlineCount: functionCount[0]?.count || 0,

//       offlineFunctionList: filteredOffline,
//       offlineCount: adjustedOfflineCount
//     };

//   } catch (err) {
//     throw Boom.conflict(err.message);
//   } finally {
//     if (client) client.release();
//     if (existClient) existClient.release();
//   }
// };


export const userListBasedFunction = async (query, loggedUser) => {
  const { limit = 20, page = 1, search } = query;

  const limitN = Number(limit) || 20;
  const pageN = Number(page) || 1;
  const offset = (pageN - 1) * limitN;

  const client = await adminDbPool.connect();
  const existClient = await existDb.connect();

  try {
    // ---------- FETCH ONLINE FUNCTION USERS ----------
    const { rows: onlineList } = await existClient.query(`
      select distinct f.user_id as id, u.name, u.mobile
      from function f 
      join users u on u.id = f.user_id
      where (
        $3::text IS NULL OR 
        $3::text = '' OR 
        u.name ILIKE '%' || $3::text || '%' OR 
        u.mobile ILIKE '%' || $3::text || '%'
      )
      ORDER BY f.user_id, u.name, u.mobile DESC
      LIMIT $1 OFFSET $2
    `, [limitN, offset, search]);

    const { rows: onlineCount } = await existClient.query(`
      select count(distinct f.user_id)
      from function f 
      join users u on u.id = f.user_id
      where (
        $1::text IS NULL OR 
        $1::text = '' OR 
        u.name ILIKE '%' || $1::text || '%' OR 
        u.mobile ILIKE '%' || $1::text || '%'
      )
    `, [search]);


    // ---------- FETCH OFFLINE FUNCTION USERS ----------
    const { rows: offlineList } = await existClient.query(`
      select distinct f.created_by as id, u.name, u.mobile
      from offline_function f 
      join users u on u.id = f.created_by
      where (
        $3::text IS NULL OR 
        $3::text = '' OR 
        u.name ILIKE '%' || $3::text || '%' OR 
        u.mobile ILIKE '%' || $3::text || '%'
      )
      ORDER BY f.created_by, u.name, u.mobile DESC
      LIMIT $1 OFFSET $2
    `, [limitN, offset, search]);

    const { rows: offlineCount } = await existClient.query(`
      select count(distinct f.created_by)
      from offline_function f 
      join users u on u.id = f.created_by
      where (
        $1::text IS NULL OR 
        $1::text = '' OR 
        u.name ILIKE '%' || $1::text || '%' OR 
        u.mobile ILIKE '%' || $1::text || '%'
      )
    `, [search]);


    // ---------- MERGE ONLINE & OFFLINE ----------
    const combinedMap = new Map();

    // 1) Add online users
    onlineList.forEach(u => {
      combinedMap.set(u.id, {
        id: u.id,
        name: u.name,
        mobile: u.mobile,
        function: ["online"]
      });
    });

    // 2) Add offline users
    offlineList.forEach(u => {
      if (combinedMap.has(u.id)) {
        // Already exists → push only if not duplicate
        const entry = combinedMap.get(u.id);
        if (!entry.function.includes("offline")) {
          entry.function.push("offline");
        }
      } else {
        // New user
        combinedMap.set(u.id, {
          id: u.id,
          name: u.name,
          mobile: u.mobile,
          function: ["offline"]
        });
      }
    });

    const mergedList = Array.from(combinedMap.values());


    // --------- FIX COUNT (UNIQUE USERS ONLY) ----------
    const totalUniqueCount = mergedList.length;


    // --------- PAGINATION (APPLY AFTER MERGED) ----------
    const paginated = mergedList.slice(offset, offset + limitN);


    // --------- FINAL RESPONSE ----------
    return {
      message: "User List Data",
      data: paginated,
      count: totalUniqueCount,
      page: pageN,
      limit: limitN
    };

  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    if (client) client.release();
    if (existClient) existClient.release();
  }
};


export const functionDetailsByUserId = async (query, loggedUser) => {
  const { limit = 20, page = 1, search, userId } = query;

  const client = await adminDbPool.connect();
  const existClient = await existDb.connect();

  try {
    const limitN = parseInt(limit) || 10;
    const pageN = parseInt(page) || 1;
    const offset = (pageN - 1) * limitN;
     const { rows: userDetails } = await existClient.query(`
      SELECT 
        u.id,
        u.name,
        u.last_name,
        u.mobile,
        COUNT(DISTINCT f.id) AS total_online_function,
        COUNT(DISTINCT ofn.id) AS total_offline_function
      FROM users u
      LEFT JOIN function f 
        ON f.user_id = u.id
      LEFT JOIN offline_function ofn 
        ON ofn.created_by = u.id
      WHERE u.id = $1
      GROUP BY 
        u.id, u.name, u.last_name, u.mobile;
      `,
      [userId])
    /* ---------- 1. Fetch Online Functions WITH SEARCH ---------- */
    const { rows: onlineRows } = await existClient.query(`
      SELECT 
        f.id as functionId,
        f.user_id,
        u.name,
        u.mobile,
        'online' AS function_type,
        f.function_name,
        f.created_at
      FROM function f 
      JOIN users u ON u.id = f.user_id
      WHERE f.user_id = $2
      AND (
        $1::text IS NULL OR
        $1::text = '' OR
        u.name ILIKE '%' || $1::text || '%' OR
        u.mobile ILIKE '%' || $1::text || '%' OR
        f.function_name ILIKE '%' || $1::text || '%'
      )
      ORDER BY f.created_at DESC
    `, [search, userId]);

    /* ---------- 2. Fetch Offline Functions WITH SEARCH ---------- */
    const { rows: offlineRows } = await existClient.query(`
      SELECT 
        f.id as functionId,
        f.created_by AS user_id,
        u.name,
        u.mobile,
        'offline' AS function_type,
        f.function_name,
        f.created_at
      FROM offline_function f 
      JOIN users u ON u.id = f.created_by
      WHERE f.created_by = $2
      AND (
        $1::text IS NULL OR
        $1::text = '' OR
        u.name ILIKE '%' || $1::text || '%' OR
        u.mobile ILIKE '%' || $1::text || '%' OR
        f.function_name ILIKE '%' || $1::text || '%'
      )
      ORDER BY f.created_at DESC
    `, [search, userId]);

    /* ---------- 3. Merge both lists ---------- */
    let combinedList = [...onlineRows, ...offlineRows];

    /* ---------- 4. Sort by created_at DESC ---------- */
    combinedList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    /* ---------- 5. Total Count ---------- */
    const totalCount = combinedList.length;

    /* ---------- 6. Pagination ---------- */
    const paginatedData = combinedList.slice(offset, offset + limitN);

    /* ---------- 7. Final Output Format ---------- */
    // console.log(paginatedData)
    const formatted = paginatedData.map(row => ({
      user_id: row.user_id,
      name: row.name,
      mobile: row.mobile,
      function: row.function_type,
      function_name: row.function_name,
      functionid:row.functionid
    }));

    return {
      message: "User Function List",
      totalFunction: totalCount,
      page: pageN,
      limit: limitN,
      data: formatted,
      userDetails,
    };

  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    if (client) client.release();
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
      `SELECT * FROM function WHERE user_id = $1 AND id = $2`,
      [userId, functionId]
    );

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
    type
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

    if (type === "event") eventQuery = `SELECT *,event_name AS title FROM event WHERE id = $1`;
    else if (type === "accommodation") eventQuery = `SELECT * FROM accommodation WHERE id = $1`;
    else if (type === "transportation") eventQuery = `SELECT * FROM transportation WHERE id = $1`;
    else eventQuery = `SELECT *,info_name AS title FROM otherInfo WHERE id = $1`;

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
        c.created_at
      FROM contacts c
      WHERE c.id = ANY($1)
      ${searchSQL}
      ORDER BY ${orderBy}
      LIMIT ${limitN} OFFSET ${offset}
    `;
    const { rows: contacts } = await existClient.query(dataQuery, [contactIds]);

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