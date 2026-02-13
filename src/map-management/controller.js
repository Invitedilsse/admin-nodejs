import Boom from '@hapi/boom';
import { adminDb as adminDbPool } from "../../config/adminDb.js";
import { hashPassword } from "../../helpers/auth.js";
import { resendOtp } from '../otp/controller.js';
import aws from "aws-sdk"
import { existingPool } from '../../config/dbExisiting.js';
import { assignedContactList } from '../call-managements/controller.js';
import { createMapTemplate, createOfflineEvent, createOfflineOccasion, deleteMapTemplateById, deleteOfflineEventById, deleteOfflineOccasionById, listOfflineEvents, listOfflineEventsMob, listOfflineOccasions, listTemplates, updateMapTemplateById, updateOfflineEventById, updateOfflineOccasionById } from './service.js';



export const createUser = async (body, res) => {
  const {
    first_name, last_name, user_name, mobile, email,
    password, profile_pic, role, address,
    country_code, country, city, state,
    pin_code, dob, gender, created_by
  } = body;

  let client = await adminDbPool.connect();
  try {
    await client.query("BEGIN");
    const {rows:findExisting} = await client.query(`
            select email from users where email =$1
        `,[email])
    
     if(findExisting.length > 0){
        throw Boom.conflict("Email Already Registered")
     }
        const {rows:findExistingMob} = await client.query(`
            select mobile from users where mobile =$1
        `,[mobile])
    
     if(findExistingMob.length > 0){
        throw Boom.conflict("Mobile Number Already Registered")
     }

    const hashedPassword = password ? await hashPassword(password) : null;

    const result = await client.query(
      `INSERT INTO users (
        first_name, last_name, user_name, mobile, email, password,
        profile_pic, role, address, country_code, country, city, state,
        pin_code, dob, gender, created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *`,
      [
        first_name, last_name, user_name, mobile, email, hashedPassword,
        profile_pic, role || 'main', address, country_code, country,
        city, state, pin_code, dob, gender, created_by
      ]
    );
        await client.query("COMMIT");

    return { message: 'User created successfully', user: result.rows[0] };
  } catch (err) {
    console.error('Error creating user:', err);
    await client.query("ROLLBACK"); 
    // if (err.code === '23505') {
    //   return res.status(409).json({ error: 'Email already exists' });
    // }
    throw Boom.conflict("Err");
  }finally {
    console.log("client reelase---->")
    if(client) client.release();
  }
};


export async function createMapTemplateController(body,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await createMapTemplate(body,user_id);

    return {
      message: "Map template added successfully.",
      data: responseDetail,
    };
  } catch (error) {
    console.error("Error Map template add controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}



export async function listTemplatesController(params,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await listTemplates(params,user_id);

    return {
      message: "Map template Fetched successfully.",
      data: responseDetail,
    };
  } catch (error) {
    console.error("Error Map template Fetch controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}


export async function updateMapTemplateByIdController(body,user) {
  const user_id = user.id
  // const id = params.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await updateMapTemplateById(body,user_id);

    return {
      message: "Edit Map template  successfully.",
      data: responseDetail,
    };
  } catch (error) {
    console.error("Error Map template EDIT controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}


export async function deleteMapTemplateByIdController(params,user) {
  const user_id = user.id
  const id = params.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await deleteMapTemplateById(id,user_id);

    return {
      message: "DELETE Map template  successfully.",
      data: responseDetail,
    };
  } catch (error) {
    console.error("Error Map template DELETE controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}


export async function createOfflineEventController(body,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await createOfflineEvent(body,user_id);

    return {
      message: "Offline Event added successfully.",
      data: responseDetail,
    };
  } catch (error) {
    console.error("Error event template add controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}



export async function listOfflineEventsController(params,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await listOfflineEvents(params,user_id);

    return {
      message: "event template Fetched successfully.",
      data: responseDetail,
    };
  } catch (error) {
    console.error("Error event template Fetch controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}

export async function listOfflineEventsMobController(params) {
  // const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await listOfflineEventsMob(params);

    return {
      message: "event template Fetched successfully.",
      data: responseDetail,
    };
  } catch (error) {
    console.error("Error event template Fetch controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}



export async function updateOfflineEventByIdController(body,user) {
  const user_id = user.id
  // const id = params.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await updateOfflineEventById(body,user_id);

    return {
      message: "Edit event template  successfully.",
      data: responseDetail,
    };
  } catch (error) {
    console.error("Error evnt template EDIT controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}


export async function deleteOfflineEventByIdController(params,user) {
  const user_id = user.id
  const id = params.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await deleteOfflineEventById(id,user_id);

    return {
      message: "DELETE event template  successfully.",
      data: responseDetail,
    };
  } catch (error) {
    console.error("Error event template DELETE controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}


export async function createOfflineoccasionController(body,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await createOfflineOccasion(body,user_id);

    return {
      message: "Offline occasion added successfully.",
      data: responseDetail,
    };
  } catch (error) {
    console.error("Error occasion template add controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}



export async function listOfflineoccasionController(params,user) {
  // const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await listOfflineOccasions(params);

    return {
      message: "occasion template Fetched successfully.",
      data: responseDetail,
    };
  } catch (error) {
    console.error("Error occasion template Fetch controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}


export async function listOfflineoccasionControllerMob(params,user) {
  // const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await listOfflineOccasionsMob(params);

    return {
      message: "occasion template Fetched successfully.",
      data: responseDetail,
    };
  } catch (error) {
    console.error("Error occasion template Fetch controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}

export async function updateOfflineoccasionByIdController(body,user) {
  const user_id = user.id
  // const id = params.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await updateOfflineOccasionById(body,user_id);

    return {
      message: "Edit occasion template  successfully.",
      data: responseDetail,
    };
  } catch (error) {
    console.error("Error occasion template EDIT controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}


export async function deleteOfflineoccasionByIdController(params,user) {
  const user_id = user.id
  const id = params.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await deleteOfflineOccasionById(id,user_id);

    return {
      message: "DELETE occasion template  successfully.",
      data: responseDetail,
    };
  } catch (error) {
    console.error("Error event template DELETE controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}