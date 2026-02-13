import Boom from '@hapi/boom';
import { adminDb as adminDbPool } from "../../config/adminDb.js";
import {  existingPool as existDb } from '../../config/dbExisiting.js';
import { assignedContactList } from '../call-managements/controller.js';
import ExcelJS from"exceljs";





export const functionlist = async (query,loggedUser) => {
   const { limit = 20, page = 1,search } = query;

const limitN = Number(limit) || 1; 
const pageN = Number(page) || 10;  
const offset = (pageN - 1) * limit;
  const client = await adminDbPool.connect();
  const existClient = await existDb.connect();
//   const userId = loggedUser.id
  try {

    const { rows: findRoleType } = await client.query(
      `SELECT role, is_restricted FROM users WHERE id = $1`,
      [loggedUser.id]
    );

    if (findRoleType.length === 0) throw Boom.notFound("Logged user not found");
    if (findRoleType[0].is_restricted) throw Boom.conflict("User is restricted.");
    if (loggedUser.role !== 'main' && loggedUser.role !== 'super-admin') throw Boom.conflict("User is restricted.");
    // if (targetUser.length === 0) throw Boom.notFound("User not found");
    
    const {rows: functionlist} = await existClient.query(`select f.*, u.name,u.mobile
        from function f join users u on u.id = f.user_id
        where  (
        $3::text IS NULL
        OR $3::text = ''
        OR u.name ILIKE '%' || $3::text || '%'
        OR u.mobile ILIKE '%' || $3::text || '%'
         OR f.function_name ILIKE '%' || $3::text || '%'
      )
        ORDER BY f.created_at DESC
         LIMIT $1 OFFSET $2
      `,[limitN,offset,search])

       const {rows: functionCount} = await existClient.query(`
        select count(*)
        from function f join users u on u.id = f.user_id
        where  (
        $1::text IS NULL
        OR $1::text = ''
        OR u.name ILIKE '%' || $1::text || '%'
        OR u.mobile ILIKE '%' || $1::text || '%'
         OR f.function_name ILIKE '%' || $1::text || '%'
      )
      `,[search])
    return {
      message: "Function List Data",
      data: functionlist,
      count:functionCount[0].count || 0
    };
  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    if(client)client.release();
    if(existClient) existClient.release();
  }
};



export const functionContactlist = async (query, loggedUser) => {
  const { limit = 20, page = 1, functionId, oid,search } = query;

  const limitN = Number(limit) || 20;
  const pageN = Number(page) || 1;
  const offset = (pageN - 1) * limitN;

  const client = await adminDbPool.connect();
  const existClient = await existDb.connect();

  try {

    const { rows: findRoleType } = await client.query(
      `SELECT role, is_restricted FROM users WHERE id = $1`,
      [loggedUser.id]
    );

    if (findRoleType.length === 0) throw Boom.notFound("Logged user not found");
    if (findRoleType[0].is_restricted)
      throw Boom.conflict("User is restricted.");
    if (loggedUser.role !== "main" && loggedUser.role !== "super-admin")
      throw Boom.conflict("User is restricted.");


    const allOid = await getOidList({ functionId });
    const filterOid = oid ? [oid] : allOid.data.map((o) => o.id);


    const listQuery = `
      SELECT DISTINCT 
        c.id,
        c.name,
        c.mobile,
        c.created_at
      FROM mappedContact mc
      JOIN LATERAL unnest(mc.contact_id) AS contact_id(id) ON true
      JOIN contacts c ON c.id = contact_id.id
      WHERE mc.oid = ANY($1::uuid[])
        and (
        $4::text IS NULL
        OR $4::text = ''
        OR c.name ILIKE '%' || $4::text || '%'
        OR c.mobile ILIKE '%' || $4::text || '%'
        )
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3;
    `;

    const { rows: mappedContactList } = await existClient.query(listQuery, [
      filterOid,
      limitN,
      offset,
      search
    ]);

      const callerMappedQuery = `
      SELECT DISTINCT u.id , mcc.contact_id , u.first_name , u.last_name from 
      users u
      left join  mappedContact_callers mcc on mcc.callers_id = u.id 
      where  u.role = 'support'
      order by u.first_name, u.last_name ASC
    `;

    const { rows: callerMapped } = await client.query(callerMappedQuery
    //   [
    //   functionId
    // ]
  );

    console.log("callerMapped--------->",callerMapped)
    let count = 0;
   const mergedData = mappedContactList.map(contact => {
  const found = callerMapped.find(cm => cm.contact_id?.includes(contact.id));

  if (found) {
    return {
      ...contact,
      assignedTo: found.id
    };
  }

  return {
    ...contact,
    assignedTo: null

  };
});


    console.log("merggedData--------->",mergedData)

    const countQuery = `
      SELECT COUNT(DISTINCT c.id) AS total_count
      FROM mappedContact mc
      JOIN LATERAL unnest(mc.contact_id) AS contact_id(id) ON true
      JOIN contacts c ON c.id = contact_id.id
      WHERE mc.oid = ANY($1::uuid[])
       and (
        $2::text IS NULL
        OR $2::text = ''
        OR c.name ILIKE '%' || $2::text || '%'
        OR c.mobile ILIKE '%' || $2::text || '%'
        );
    `;

    const {
      rows: [{ total_count }],
    } = await existClient.query(countQuery, [filterOid,search]);

    // ------------------------------
    // 5. Return response
    // ------------------------------
    return {
      message: "Contact List Data",
      pagination: {
        page: pageN,
        limit: limitN,
        total: Number(total_count),
        totalPages: Math.ceil(total_count / limitN),
      },
      data: mergedData,
      dynamiccolumn: callerMapped
    };
  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    client?.release();
    existClient?.release();
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


export const assignCallers = async (params, body, loggedUser) => {
  const { functionId } = params;
  const { contactId, userId, checked } = body;

  const client = await adminDbPool.connect();
  const existClient = await existDb.connect();

  try {

    const { rows: findRoleType } = await client.query(
      `SELECT role, is_restricted FROM users WHERE id = $1`,
      [loggedUser.id]
    );

    if (findRoleType.length === 0) throw Boom.notFound("Logged user not found");
    if (findRoleType[0].is_restricted)
      throw Boom.conflict("User is restricted.");
    if (loggedUser.role !== "main" && loggedUser.role !== "super-admin")
      throw Boom.conflict("User is restricted.");


    await client.query("BEGIN");


    const checkQuery = `
      SELECT callers_id
      FROM mappedContact_callers
      WHERE $1 = ANY(contact_id)
    `;
    const { rows: alreadyMapped } = await client.query(checkQuery, [contactId]);

    if (checked === true) {
      if (alreadyMapped.length > 0 && alreadyMapped[0].callers_id !== userId) {
        await client.query("ROLLBACK");
        throw Boom.conflict("Contact already mapped to another user.");
      }
    }


    if (checked === true) {
      const existsQuery = `
        SELECT id, contact_id
        FROM mappedContact_callers
        WHERE callers_id = $1 AND function_id = $2
      `;
      const { rows: existing } = await client.query(existsQuery, [userId, functionId]);

      if (existing.length > 0) {
        // UPDATE ARRAY ONLY IF CONTACT NOT PRESENT
        const updateQuery = `
          UPDATE mappedContact_callers
          SET contact_id = array_append(contact_id, $1),
              updated_at = NOW()
          WHERE callers_id = $2
            AND function_id = $3
            AND NOT ($1 = ANY(contact_id))
        `;
        await client.query(updateQuery, [contactId, userId, functionId]);

      } else {
        // INSERT NEW ROW
        const insertQuery = `
          INSERT INTO mappedContact_callers (callers_id, contact_id, function_id, created_by)
          VALUES ($1, ARRAY[$2]::uuid[], $3, $4)
        `;
        await client.query(insertQuery, [
          userId,
          contactId,
          functionId,
          loggedUser.id,
        ]);
      }
    }


    if (checked === false) {
      const removeQuery = `
        UPDATE mappedContact_callers
        SET contact_id = array_remove(contact_id, $1),
            updated_at = NOW()
        WHERE callers_id = $2 AND function_id = $3
        RETURNING contact_id;
      `;
      const { rows: result } = await client.query(removeQuery, [
        contactId,
        userId,
        functionId,
      ]);

      if (result.length === 0) {
        await client.query("ROLLBACK");
        throw Boom.conflict("Contact not mapped to this user.");
      }

   
      if (result[0].contact_id.length === 0) {
        await client.query(
          `DELETE FROM mappedContact_callers WHERE callers_id = $1 AND function_id = $2`,
          [userId, functionId]
        );
      }
    }

    await client.query("COMMIT");

    return {
      message: checked ? "Contact assigned" : "Contact removed",
    };

  } catch (err) {
    await client.query("ROLLBACK");
    throw Boom.conflict(err.message);
  } finally {
    client.release();
    existClient.release();
  }
};


export const assignCallersBulk = async (params, body, loggedUser) => {
  const { functionId } = params;
  const { contactId = [], userId, checked } = body;

  if (!Array.isArray(contactId) || contactId.length === 0)
    throw Boom.badRequest("contactId must be a non-empty array");

  const client = await adminDbPool.connect();
  const existClient = await existDb.connect();

  try {
    console.log("contactId----->", contactId);
    const { rows: findRoleType } = await client.query(
      `SELECT role, is_restricted FROM users WHERE id = $1`,
      [loggedUser.id]
    );
    console.log("contactId----->2", contactId);

    if (findRoleType.length === 0) throw Boom.notFound("Logged user not found");
    if (findRoleType[0].is_restricted)
      throw Boom.conflict("User is restricted.");
    if (loggedUser.role !== "main" && loggedUser.role !== "super-admin")
      throw Boom.conflict("User is restricted.");

    await client.query("BEGIN");


    const conflictQuery = `
      SELECT mc.callers_id, cid
      FROM mappedContact_callers mc,
      LATERAL unnest(mc.contact_id) AS cid
      WHERE mc.function_id = $1
      AND cid = ANY($2::uuid[]);
    `;

    const { rows: conflicts } = await client.query(conflictQuery, [
      functionId,
      contactId,
    ]);
    console.log("conflicts---->", conflicts);

    if (checked === true && conflicts.length > 0) {
      for (const row of conflicts) {
        if (row.callers_id !== userId) {
          await client.query("ROLLBACK");
          throw Boom.conflict(
            `Contact ${row.cid} already mapped to another user`
          );
        }
      }
    }

    const existsQuery = `
      SELECT id, contact_id
      FROM mappedContact_callers
      WHERE callers_id = $1 AND function_id = $2
    `;

    const { rows: existing } = await client.query(existsQuery, [
      userId,
      functionId,
    ]);

    if (checked === true) {
      if (existing.length > 0) {
        // UPDATE: merge arrays (avoid duplicates)
        console.log("innnnnnnnnnnnn")
        const updateQuery = `
          UPDATE mappedContact_callers
          SET contact_id = (
            SELECT ARRAY(SELECT DISTINCT unnest(contact_id || $1::uuid[]))
          ), 
          updated_at = NOW()
          WHERE callers_id = $2 AND function_id = $3
        `;
        await client.query(updateQuery, [contactId, userId, functionId]);
      } else {
        // INSERT
        console.log("innnnnnnnnnnnnsert")

        const insertQuery = `
          INSERT INTO mappedContact_callers (callers_id, contact_id, function_id, created_by)
          VALUES ($1, $2::uuid[], $3, $4)
        `;
        await client.query(insertQuery, [
          userId,
          contactId,
          functionId,
          loggedUser.id,
        ]);
      }
    }

    if (checked === false) {
      const removeQuery = `
        UPDATE mappedContact_callers
        SET contact_id = (
          SELECT ARRAY(
            SELECT cid FROM unnest(contact_id) AS cid
            WHERE cid <> ALL($1::uuid[])
          )
        ),
        updated_at = NOW()
        WHERE callers_id = $2 AND function_id = $3
        RETURNING contact_id;
      `;

      const { rows: removed } = await client.query(removeQuery, [
        contactId,
        userId,
        functionId,
      ]);

      if (removed.length === 0) {
        await client.query("ROLLBACK");
        throw Boom.conflict("No contacts mapped to this user for removal.");
      }

      // Delete row if empty
      if (removed[0].contact_id.length === 0) {
        await client.query(
          `DELETE FROM mappedContact_callers WHERE callers_id = $1 AND function_id = $2`,
          [userId, functionId]
        );
      }
    }

    await client.query("COMMIT");

    return {
      message: checked ? "Contacts assigned successfully" : "Contacts removed successfully",
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw Boom.conflict(err.message);
  } finally {
    client.release();
    existClient.release();
  }
};



export const assignedfunctionlist = async (query,loggedUser) => {
   const { limit = 20, page = 1 } = query;

const limitN = Number(limit) || 1; 
const pageN = Number(page) || 10;  
const offset = (pageN - 1) * limit;
  const client = await adminDbPool.connect();
  const existClient = await existDb.connect();
//   const userId = loggedUser.id
  try {

    const { rows: findRoleType } = await client.query(
      `SELECT role, is_restricted FROM users WHERE id = $1`,
      [loggedUser.id]
    );

    if (findRoleType.length === 0) throw Boom.notFound("Logged user not found");
    if (findRoleType[0].is_restricted) throw Boom.conflict("User is restricted.");
    if (loggedUser.role === 'main' && loggedUser.role === 'super-admin') throw Boom.conflict("User is restricted.");
    // if (targetUser.length === 0) throw Boom.notFound("User not found");

    const {rows:functionIdlist} = await client.query(`
      select function_id from mappedContact_callers 
      where callers_id = $1
      `,[loggedUser.id])
    
      if(functionIdlist.length ===0){
        return{
          message:"Function List Data",
          data:[]
        }
      }
    const functionID = functionIdlist.map(fi=>fi.function_id)

    const {rows: functionlist} = await existClient.query(`
      select f.*, u.name,u.mobile
        from function f join users u on u.id = f.user_id
        where f.id = Any($3::uuid[])
        ORDER BY f.created_at DESC
         LIMIT $1 OFFSET $2
      `,[limitN,offset,functionID])

    return {
      message: "Function List Data",
      data: functionlist,
    };
  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    if(client)client.release();
    if(existClient) existClient.release();
  }
};

export const callerContactlist = async (query, loggedUser) => {
  const { limit = 20, page = 1, functionId,search } = query;

  const limitN = Number(limit) || 20;
  const pageN = Number(page) || 1;
  const offset = (pageN - 1) * limitN;

  const client = await adminDbPool.connect();
  try {

    const listQuery = `
      SELECT u.id,u.first_name,u.last_name,u.mobile,  
      cardinality(mc.contact_id) AS contact_count,
       COUNT(ch.id) AS total_calls 
      FROM mappedcontact_callers mc
      JOIN users u ON u.id = mc.callers_id
      left join call_history ch on ch.caller_id = mc.callers_id
      and ch.function_id = $4
      and u.role = 'support'
      where mc.function_id = $4
      and (
        $3::text IS NULL
        OR $3::text = ''
        OR u.first_name ILIKE '%' || $3::text || '%'
        OR u.mobile ILIKE '%' || $3::text || '%'
         OR u.last_name ILIKE '%' || $3::text || '%'
      )
       GROUP BY u.id, u.first_name, u.last_name, u.mobile, mc.contact_id
      ORDER BY u.first_name DESC
      LIMIT $1 OFFSET $2;
      `;
    console.log(   limitN,
      offset,
      search,
      functionId)
    const { rows: mappedContactList } = await client.query(listQuery, [
      limitN,
      offset,
      search,
      functionId
    ]);

        const countQuery = `
         SELECT u.id,u.first_name,u.last_name,u.mobile,  
      cardinality(mc.contact_id) AS contact_count,
       COUNT(ch.id) AS total_calls 
      FROM mappedcontact_callers mc
      JOIN users u ON u.id = mc.callers_id
      left join call_history ch on ch.caller_id = mc.callers_id
      and ch.function_id = $2
      and u.role = 'support'
      where mc.function_id = $2
      and (
        $1::text IS NULL
        OR $1::text = ''
        OR u.first_name ILIKE '%' || $1::text || '%'
        OR u.mobile ILIKE '%' || $1::text || '%'
         OR u.last_name ILIKE '%' || $1::text || '%'
      )
       GROUP BY u.id, u.first_name, u.last_name, u.mobile, mc.contact_id
      ORDER BY u.first_name DESC
      `;

    const { rows: total_count } = await client.query(countQuery, [
      search,
      functionId
    ]);
console.log(
      search,
      functionId,total_count)

    return {
      message: "Contact List Data",
      pagination: {
        page: pageN,
        limit: limitN,
        total: Number(total_count.length),
        totalPages: Math.ceil(total_count.length / limitN),
      },
      data: mappedContactList,
    };
  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    client?.release();
  }
};

export const callHistoryListById = async (params,user) => {
  const client = await adminDbPool.connect();
  const {functionId,callerID,page =1,limit=30,search,filterbyoid} = params
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
     const res = await assignedContactList({functionId,page,limit,search,filterbyoid},{id:callerID})
     console.log("res------>",res)

    return {
       message:'Caller History',
       callerDetails,
       data:res.data,
       pagination:res.pagination

      //  pagination: {
      //   page: pageN,
      //   limit: limitN,
      //   total: Number(total_count),
      //   totalPages: Math.ceil(total_count / limitN),
      // },
      // data: {callerCount,functionCount},
    };
  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};

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