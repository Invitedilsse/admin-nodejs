import Boom from '@hapi/boom';
import { saveTemplate } from "./service.js";
import { adminDb } from '../../config/adminDb.js';
import { existingPool } from '../../config/dbExisiting.js';
import { sendWhatsappNotification } from '../../helpers/send-wa-msg.js';
import axios from 'axios';

const API_BASE_URL = process.env.BLUEWABA_API_URL || "https://bluewaba.com/api";
const VENDOR_UID =
  process.env.BLUEWABA_VENDOR_UID || "0abdbef0-9794-4d24-bee7-3e622384b828";
const WHATSAPP_TOKEN =
  process.env.BLUEWABA_TOKEN ||
  "rKtJWpLDgi79nGyoRmKhzhyCEOiVO6gJT8c8UoPvR0oF2vwhU6dHthmySL1lPhzx";


export const createCallHistoryTemplate = async (body, loggedUser) => {
  try {
    const { functionId, tempalte_name,...rest } = body;
    
    if (!functionId) {
       throw Boom.notFound("FunctionId not found");
    }

    // Extract only dynamic field keys: field_0, field_1, etc.
    const fields = {};
    Object.keys(rest).forEach((key) => {
      if (key.startsWith("field_")) {
        fields[key] = rest[key];
      }
    });

    const saved = await saveTemplate(functionId, fields,tempalte_name,loggedUser);

    return {
      message: "Template saved successfully",
      data: saved,
    }

  } catch (error) {
    console.error(error);
    throw Boom.conflict(err.message);
  }
};

export const updateCallHistoryTemplate = async (params,body, loggedUser) => {
  const { id } = params;
  const { functionId,tempalte_name, ...rest } = body;

  try {
            const { rows: findRoleType } = await adminDb.query(
              `SELECT role, is_restricted FROM users WHERE id = $1`,
              [loggedUser.id]
            );
        
            if (findRoleType.length === 0) throw Boom.notFound("Logged user not found");
            if (findRoleType[0].is_restricted) throw Boom.conflict("User is restricted.");
            if (loggedUser.role !== 'main' && loggedUser.role !== 'super-admin') throw Boom.conflict("User is restricted.");
    const fields = {};
    Object.keys(rest).forEach((key) => {
      if (key.startsWith("field_")) {
        fields[key] = rest[key];
      }
    });

    const query = `
      UPDATE call_history_templates
      SET function_id = $1,
          fields = $2,
          tempalte_name = $4,
          updated_at = now()
      WHERE id = $3
      RETURNING *;
    `;

    const { rows } = await adminDb.query(query, [
      functionId,
      JSON.stringify(fields),
      id,
      tempalte_name
    ]);

    if (rows.length === 0) {
       throw Boom.notFound("Template not found");
    }

    return {
      message: "Template updated",
      data: rows[0]
    };

  } catch (err) {
    throw Boom.conflict(err.message);
  }
};


export async function getWatriggerTemplate( params, loggedUser) {
//   console.log(user);
  const {functionId} = params
  try {

      const { rows: findRoleType } = await adminDb.query(
              `SELECT role, is_restricted FROM users WHERE id = $1`,
              [loggedUser.id]
            );
        
            if (findRoleType.length === 0) throw Boom.notFound("Logged user not found");
            if (findRoleType[0].is_restricted) throw Boom.conflict("User is restricted.");
            if (loggedUser.role !== 'main' && loggedUser.role !== 'super-admin') throw Boom.conflict("User is restricted.");

    const { rows } = await adminDb.query(
      `
      select * from call_history_templates where function_id=$1
      `,
      [
      functionId
      ]
    );

    return { message: "get Watrigger list", data: rows };

  } catch (err) {
    console.error(err);
       throw Boom.conflict(err.message);
  }
}

export async function deleteWatriggerTemplate( params, loggedUser) {
//   console.log(user);
  const {id} = params
  try {

      const { rows: findRoleType } = await adminDb.query(
              `SELECT role, is_restricted FROM users WHERE id = $1`,
              [loggedUser.id]
            );
        
            if (findRoleType.length === 0) throw Boom.notFound("Logged user not found");
            if (findRoleType[0].is_restricted) throw Boom.conflict("User is restricted.");
            if (loggedUser.role !== 'main' && loggedUser.role !== 'super-admin') throw Boom.conflict("User is restricted.");

    const { rows } = await adminDb.query(
      `
      delete from call_history_templates where id=$1
      `,
      [
      id
      ]
    );

    return { message: "Template Input Deleted" };

  } catch (err) {
    console.error(err);
       throw Boom.conflict(err.message);
  }
}

//using this function in admin side too check admin controller
export async function assignedContactList( params, loggedUser) {
//   console.log(user);
  const {functionId} = params
  const client = await adminDb.connect();
  try {

const {rows:functionIdlist} = await client.query(`
      select contact_id from mappedContact_callers 
      where callers_id = $1
      and function_id = $2
      `,[loggedUser.id,functionId])
    
      if(functionIdlist.length ===0){
        return{
          message:"Function List Data",
          data:[]
        }
      }

      const res = await getmappedlist(params,functionIdlist[0])
      const data = res.data 
       for (const contact of data) {
        const { rows: callHistory } = await client.query(
          `
          SELECT ch.id,ch.no_of_calls, ch.no_of_notifications, ch.status, ch.retry,
          COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'msg', chr.msg,
                'response', chr.response,
                'created_at', chr.created_at
            )
            ) FILTER (WHERE chr.id IS NOT NULL),
            '[]'::jsonb
        ) AS reasons,
         COUNT(ch.id) AS maxLenResponse
          FROM call_history ch
          left join call_history_reasons chr on chr.call_history_id = ch.id
          WHERE ch.contact_id = $1 AND ch.oid = $2
          GROUP BY ch.id
          ORDER BY ch.created_at DESC
          LIMIT 1;
          `,
          [contact.contact_id, contact.oid]
        );
        console.log(callHistory)
        if (callHistory.length > 0) {
            contact.no_of_calls = callHistory[0].no_of_calls;
            contact.no_of_notifications = callHistory[0].no_of_notifications;
            contact.message_status = callHistory[0].status;
            contact.message_retry = callHistory[0].retry;
            contact.id = callHistory[0].id;
            contact.reasons = callHistory[0]?.reasons||[]
            contact.maxLenResponse = callHistory[0]?.maxLenResponse||0

        }else{
            contact.no_of_calls = 0;
            contact.no_of_notifications = 0;
            contact.message_status = 'not found';
            contact.message_retry = false;
            contact.id = null;
            contact.reasons = callHistory[0]?.reasons||[];
            contact.maxLenResponse = callHistory[0]?.maxLenResponse||0
        }

       }
    return { message: "test data", data: data , totalcount:res.totalcount , pagination:res.pagination};

  } catch (err) {
    console.error(err);
       throw Boom.conflict(err.message);
  }
}

async function getmappedlist(query,contactIds) {
  const {functionId,page =1,limit=30,search,filterbyoid} = query 
  console.log("id---------->", functionId);
  let client;
  try {
    client = await existingPool.connect();
    const { rows: functionDetails } = await client.query(
      `SELECT id,function_name as title FROM function WHERE id = $1`,
      [functionId]
    );
    console.log("functionDetails==========>", functionDetails);
    if (functionDetails.length === 0) {
      throw Boom.notFound("Function Not Found");
    }
    const [
      { rows: events },
      { rows: others },
      { rows: transports },
      { rows: accommodations },
    ] = await Promise.all([
      client.query(
        `SELECT id, event_name AS title FROM event WHERE function_id = $1`,
        [functionId]
      ),
      client.query(
        `SELECT id, info_name as title FROM otherInfo WHERE function_id = $1`,
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

       let oids = [
      ...events,
      ...others,
      ...transports,
      ...accommodations,
    ].map((d) => d.id);

    if (filterbyoid && filterbyoid !== "") {
      const filterArray = filterbyoid.split(",").map((id) => id.trim());
      oids = oids.filter((oid) => filterArray.includes(oid));
    }
    const { rows: report } = await client.query(
      `
     SELECT
    c.name,
    c.mobile,
    mc.oid,
    cid.contact_id,
    mc.type,
    COALESCE(e.event_name, t.title, a.title, o.info_name) AS title
    --COALESCE(ch.no_of_calls, 0) AS no_calls_done,
    --COALESCE(ch.no_of_notifications, 0) AS no_noti_triggered,
    --ch.id,
    --COALESCE(ch.status, 'not found') AS message_status,
    --COALESCE(ch.retry, false) AS message_retry
    FROM mappedContact mc
    JOIN LATERAL unnest(mc.contact_id) AS cid(contact_id) ON TRUE
    JOIN contacts c ON cid.contact_id = c.id
    LEFT JOIN otherInfo o ON mc.oid = o.id
    LEFT JOIN event e ON mc.oid = e.id
    LEFT JOIN transportation t ON mc.oid = t.id
    LEFT JOIN accommodation a ON mc.oid = a.id
    --LEFT JOIN call_history ch
    --ON cid.contact_id = ch.contact_id
    --AND mc.oid = ch.oid
    WHERE mc.oid = ANY($1::uuid[])
      AND (
        $2::text IS NULL
        OR $2::text = ''
        OR c.name ILIKE '%' || $2::text || '%'
        OR c.mobile ILIKE '%' || $2::text || '%'
      )
    and c.id = ANY($3::uuid[])
    GROUP BY
        c.name,
        c.mobile,
        mc.oid,
        cid.contact_id,
        mc.type,
        e.event_name,
        t.title,
        a.title,
        o.info_name
        --ch.no_of_calls,
        --ch.no_of_notifications,
        --ch.id
    ORDER BY c.name ASC
         ;
  `,
      [oids,search,contactIds.contact_id]
    );
        const offset = (page - 1) * limit;
        console.log("offset-------->",offset)
const { rows: newreport } = await client.query(
      `
    SELECT
    c.name,
    c.mobile,
    mc.oid,
    cid.contact_id,
    mc.type,
    COALESCE(e.event_name, t.title, a.title, o.info_name) AS title
    --COALESCE(ch.no_of_calls, 0) AS no_calls_done,
    --COALESCE(ch.no_of_notifications, 0) AS no_noti_triggered,
    --ch.id,
    --COALESCE(ch.status, 'not found') AS message_status,
    --COALESCE(ch.retry, false) AS message_retry
    FROM mappedContact mc
    JOIN LATERAL unnest(mc.contact_id) AS cid(contact_id) ON TRUE
    JOIN contacts c ON cid.contact_id = c.id
    LEFT JOIN otherInfo o ON mc.oid = o.id
    LEFT JOIN event e ON mc.oid = e.id
    LEFT JOIN transportation t ON mc.oid = t.id
    LEFT JOIN accommodation a ON mc.oid = a.id
    --LEFT JOIN call_history ch
    --ON cid.contact_id = ch.contact_id
    -- AND mc.oid = ch.oid
    WHERE mc.oid = ANY($1::uuid[])
      AND (
        $2::text IS NULL
        OR $2::text = ''
        OR c.name ILIKE '%' || $2::text || '%'
        OR c.mobile ILIKE '%' || $2::text || '%'
      )
    and c.id = ANY($5::uuid[])
    GROUP BY
        c.name,
        c.mobile,
        mc.oid,
        cid.contact_id,
        mc.type,
        e.event_name,
        t.title,
        a.title,
        o.info_name
       -- ch.no_of_calls,
        --ch.no_of_notifications,
       -- ch.id
    ORDER BY c.name ASC
    LIMIT $3 OFFSET $4;
  `,
      [oids,search,limit, offset,contactIds.contact_id]
    );
    //  pagination: {
      //   page: pageN,
      //   limit: limitN,
      //   total: Number(total_count),
      //   totalPages: Math.ceil(total_count / limitN),
      // },
    return {data:newreport || [] , totalcount:report.length,
     pagination: {
        page: page,
        limit: limit,
        total: Number(report.length),
        totalPages: Math.ceil(report.length / limit),
      },
    } ;
  } catch (error) {
    console.error("Error rsvp counts by functionId service:", error.message);
    throw error;
  } finally {
    client.release(); // Release the client
  }
}

export async function triggerwanotification(qery,loggedUser) {
    const {
      callId,
      oid,
      contactId,
      functionId,
      templateId
    } = qery
  console.log("id---------->", functionId,loggedUser.id);
  let client;
  let adminClient;
  try {
    client = await existingPool.connect();
    adminClient = await adminDb.connect();


   const { rows:TemplateList} = await adminClient.query(
      `
      select c.* from call_history_templates c
      where  c.id = $1::uuid
      `,
      [
        templateId
      ]
    );

    console.log("TemplateList----->",TemplateList,functionId,templateId,qery)
    if (TemplateList.length === 0) {
      throw Boom.notFound("Template Details Not Found");
    }
    

    const {rows:contactDetails} = await client.query(
        `SELECT * FROM contacts WHERE id = $1`,
        [contactId]
      )

      if(contactDetails.length === 0) {
        throw Boom.conflict("contact details not found")
      }
      
      const { field_0, field_1, field_2,field_3,field_4,field_5 } = TemplateList[0]?.fields;
      
      const country_code = contactDetails[0].country_code || "+91"
      const mobile = contactDetails[0].mobile
      const guestFulname =contactDetails[0].last_name ? contactDetails[0].name + ' ' + contactDetails[0].last_name:contactDetails[0].name
    // const family_name = TemplateList[0].family_name
    //     const occasion_name = TemplateList[0].occasion_name
    // const name = TemplateList[0].name


     const sanitizedCountryCode = country_code.replace(/\+/g, '');
     const phoneNumber = `${sanitizedCountryCode}${mobile}`;
        const mannualtrigger = await sendWhatsappNotification({
            "phone_number": phoneNumber,
            "type" : "template",
            "template_name" : "newone",
            "template_language" : "en",
            "fields" : {
                // "field_1": response[0].mobile_otp,
                // "button_0": response[0].mobile_otp
                "field_1":guestFulname,
                "field_2":field_0,
                "field_3":field_1,
                "field_4":field_2,
                "field_5":field_3,
                "field_6":field_4,
                "field_7": field_5
            }
        })
        console.log("mannualtrigger======>",mannualtrigger)

await new Promise((resolve) => setTimeout(resolve, 1000));

const confirmationUrl = `${API_BASE_URL}/${VENDOR_UID}/status/${mannualtrigger.wamid}`;

const { data: confirmationresponse } = await axios.get(
  confirmationUrl,
  {
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
  }
);

console.log("confirmationresponse.status=========>", confirmationresponse.status);

let isSuccess = (confirmationresponse.status === 'delivered' || confirmationresponse.status === 'read' || confirmationresponse.status === 'sent');

const { rows: callhisExist } = await adminClient.query(
  `
  INSERT INTO call_history (function_id, contact_id, oid,is_success,retry,wamid,template_id,template_name,status,no_of_calls,no_of_notifications,caller_id)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,1,$10)
  ON CONFLICT (contact_id, caller_id, function_id,template_id,oid)
  DO UPDATE SET
      is_success       = COALESCE(excluded.is_success, call_history.is_success),
      retry            = COALESCE(excluded.retry, call_history.retry),
      wamid            = COALESCE(excluded.wamid, call_history.wamid),
      template_id      = COALESCE(excluded.template_id, call_history.template_id),
      template_name    = COALESCE(excluded.template_name, call_history.template_name),
      status           = COALESCE(excluded.status, call_history.status),
      no_of_calls         = call_history.no_of_calls + 1,
      no_of_notifications = call_history.no_of_notifications + 1
  RETURNING *;
  `,
  [
    functionId,
    contactId,
    oid,
    isSuccess,
    !isSuccess,
    mannualtrigger.wamid,
    templateId,
    TemplateList[0].tempalte_name,
    confirmationresponse.status,
    loggedUser.id
  ]
);
return callhisExist;
  } catch (error) {
    console.error("Error Send WA Message service:", error.message);
    throw error;
  } finally {
    if(client) client.release(); // Release the client
    if(adminClient)adminClient.release();
  }
}

export async function getUpdateMessageStatus(query,user_id) {
  let client
  const {
      callId,
      // oid,
      // contactId,
      // functionId
    } = query
  try{
       client = await adminDb.connect();
       callId
       const{rows:wamiddata} = await  client.query(`
        select wamid,status from call_history where id = $1
        `,[callId])

        if(wamiddata.length === 0){
        throw Boom.conflict("Call History not found")
        }

       const confirmationUrl = `${API_BASE_URL}/${VENDOR_UID}/status/${wamiddata[0].wamid}`;

      const { data: confirmationresponse } = await axios.get(
        confirmationUrl,
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("confirmationresponse.status=======>",confirmationresponse.status)
      let isSuccess = (confirmationresponse.status === 'delivered' || confirmationresponse.status === 'read' || confirmationresponse.status === 'sent');
      const{rows:updateStatus} = await  client.query(`
        update call_history
        set status = COALESCE($2,call_history.status),
        is_success=COALESCE($3,call_history.is_success),
        retry=COALESCE($4,call_history.retry)
        where id = $1
        returning *;
        `,[callId,confirmationresponse.status, isSuccess,
    !isSuccess,])
    return{
      message:"updated Successfully",
      data: updateStatus[0]
    }
    } catch (error) {
    console.error("Error rsvp counts by functionId service:", error.message);
    throw error;
  } finally {
    client.release(); // Release the client
  }
}

export async function getFilterList(query,user_id) {
  const {functionId} = query 
  console.log("id---------->", functionId,user_id);
  let client;
  try {
    client = await existingPool.connect();
    const { rows: functionDetails } = await client.query(
      `SELECT id,function_name as title FROM function WHERE id = $1`,
      [functionId]
    );
    console.log("functionDetails==========>", functionDetails);
    if (functionDetails.length === 0) {
      throw Boom.notFound("Function Not Found");
    }
    const [
      { rows: events },
      { rows: others },
      { rows: transports },
      { rows: accommodations },
    ] = await Promise.all([
      client.query(
        `SELECT id as key, event_name AS value FROM event WHERE function_id = $1`,
        [functionId]
      ),
      client.query(
        `SELECT id as key, info_name as value FROM otherInfo WHERE function_id = $1`,
        [functionId]
      ),
      client.query(
        `SELECT id as key, title as value FROM  transportation WHERE function_id = $1`,
        [functionId]
      ),
      client.query(
        `SELECT id as key, title as value FROM accommodation WHERE function_id = $1`,
        [functionId]
      ),
    ]);
    const data = [
      // ...functionDetails.map(f => ({ ...f, type: 'function' })),
      ...events.map((e) => ({ ...e, type: "event" })),
      ...others.map((o) => ({ ...o, type: "otherInfo" })),
      ...transports.map((t) => ({ ...t, type: "transportation" })),
      ...accommodations.map((a) => ({ ...a, type: "accommodation" })),
    ];

    return {data:data} ;
  } catch (error) {
    console.error("Error rsvp counts by functionId service:", error.message);
    throw error;
  } finally {
    client.release(); // Release the client
  }
}

export async function getDropDownTemplate( params) {
  // console.log(user);
  const {functionId} = params
  try {

    const { rows:functionList} = await adminDb.query(
      `
      select c.* from call_history_templates c
      where c.function_id=$1
      `,
      [
      functionId
      ]
    );
    const {rows:functionName} = await existingPool.query(`select function_name from function where id=$1`,[functionId])
    
    const eventMap = functionList.map((e) => ({
      id: e.id,
      name: e.tempalte_name
    }));
    functionList.forEach((d)=>{
    const fieldArray = []
    const fields = d[0]?.fields || {}
    Object.keys(fields).forEach((key)=>{
      console.log("key values------>",key,fields[key])
      fieldArray.push({[key]:fields[key]})
    })
    d.fieldArray = fieldArray
    })
    
    console.log("function ======>",functionList,functionName)

    //   const eventMap = functionList.map((e) => ({
    //   id: e.id,
    //   name: e.family_name,
    //   host_name:e.function_name
    // }));

    return { message: "get Template Dropdown list",
      data:eventMap,
      functionName: functionName[0]
    };

  } catch (err) {
    console.error(err);
    throw new Error(err.message);
  }
}


export async function getDropDownTemplateById( params) {
  // console.log(user);
  const {functionId,id} = params
  try {

    const { rows:functionList} = await adminDb.query(
      `
      select c.* from call_history_templates c
      where c.function_id=$1
      and c.id=$2
      `,
      [
      functionId,
      id
      ]
    );
    const {rows:functionName} = await existingPool.query(`select function_name from function where id=$1`,[functionId])
    

    functionList.forEach((d)=>{
    const fieldArray = []
    const fields = d?.fields || {}
    console.log("fileds----->",fields)
    Object.keys(fields).forEach((key)=>{
        console.log("key values------>",key,fields[key])
        fieldArray.push({[key]:fields[key]})
      })
      d.fieldArray = fieldArray
    })
    
    console.log("function ======>",functionList,functionName)

    //   const eventMap = functionList.map((e) => ({
    //   id: e.id,
    //   name: e.family_name,
    //   host_name:e.function_name
    // }));

    return { message: "get Template Dropdown list",
      data:functionList,
      functionName: functionName[0]
    };

  } catch (err) {
    console.error(err);
    throw new Error(err.message);
  }
}


export async function upsertCallHistoryReason(body,user) {
  // console.log(user);
  try {

  const { id, call_history_id, msg, response } = body;
  const query = `
    INSERT INTO call_history_reasons (id, call_history_id, msg, response, updated_at)
    VALUES (
        COALESCE($1, gen_random_uuid()),
        $2,
        $3,
        $4,
        now()
    )
    ON CONFLICT (id)
    DO UPDATE SET
        msg = EXCLUDED.msg,
        response = EXCLUDED.response,
        updated_at = now()
    RETURNING *;
  `;

  const values = [id || null, call_history_id, msg, response];

  const { rows } = await adminDb.query(query, values);

    return { message: id ? "Updated message in records list":"Added message to records list",
      data:rows
    };

  } catch (err) {
    console.error(err);
    throw new Error(err.message);
  }
}

export async function getCallHistoryReasonById(params) {
  // console.log(user);
  try {

  const { callid } = params;
  const query = `
     select * from call_history_reasons
    where call_history_id=$1;
  `;

  const values = [ callid];

  const { rows } = await adminDb.query(query, values);

    return { message: "Fetched message from records list",
      data:rows
    };

  } catch (err) {
    console.error(err);
    throw new Error(err.message);
  }
}

