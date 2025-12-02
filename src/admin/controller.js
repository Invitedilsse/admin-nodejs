import Boom from '@hapi/boom';
import { adminDb as adminDbPool } from "../../config/adminDb.js";
import { hashPassword } from "../../helpers/auth.js";
import { resendOtp } from '../otp/controller.js';
import aws from "aws-sdk"
import { existingPool } from '../../config/dbExisiting.js';
import { assignedContactList } from '../call-managements/controller.js';


// export const register =async(req, res)=>{
//     try{
//         return "Hey its admin Register"
//     }catch(err){
//         console.log("err=====>",err)
//     }
// }

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

export const loginUsers = async (body, res) => {
  const {
    mobile,
    country_code
  } = body;

  let client = await adminDbPool.connect();
  try {
    await client.query("BEGIN");

        const {rows:findExistingMob} = await client.query(`
            select mobile,country_code,is_restricted from users where mobile =$1 and country_code = $2
        `,[mobile,country_code])

    
     if(findExistingMob.length ===  0){
        throw Boom.conflict("Mobile Number Not Registered. Contact Admin.")
     }
        if(findExistingMob[0].is_restricted){
         throw Boom.conflict("User Restricted. Contact Admin.")   
        }

     let result = await resendOtp(findExistingMob)

    return {message:result.message};
  } catch (err) {
    console.error('Error creating user:', err);
    await client.query("ROLLBACK"); 
    // if (err.code === '23505') {
    //   return res.status(409).json({ error: 'Email already exists' });
    // }
     throw Boom.conflict(err.message);
  }finally {
    console.log("client reelase---->")
    if(client) client.release();
  }
};

export const createUserFromWeb = async (body, user) => {
  const {
    first_name, last_name, user_name, mobile, email,
    password, profile_pic, role, address,
    country_code, country, city, state,
    pin_code, dob, gender
  } = body;
  console.log("creator========>",body,user)
  let creatorId = user.id
  let client = await adminDbPool.connect();
  try {
    await client.query("BEGIN");

    const {rows:findRoleType} = await client.query(`
            select role,is_restricted from users where id =$1
        `,[creatorId])

        if(findRoleType.length === 0){
             throw Boom.conflict("User Not Found")
        }

        if(user.role === 'super-admin' && role === 'main'){
             throw Boom.conflict("Super Admin Prohibited to add MAIN user role")
        }

        if(user.role === 'support' ){
             throw Boom.conflict("Support Users Prohibited to users")
        }
         if(findRoleType[0].is_restricted){
         throw Boom.conflict("User Restricted. Contact Admin.")   
        }

        // return user

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
        city, state, pin_code, dob, gender, creatorId
      ]
    );
        await client.query("COMMIT");

    return { message: 'User created successfully', user: result.rows[0] }
  } catch (err) {
    console.error('Error creating user:', err);
    await client.query("ROLLBACK"); 
    // if (err.code === '23505') {
    //   return res.status(409).json({ error: 'Email already exists' });
    // }
    throw Boom.conflict(err.message);
  }finally {
    console.log("client reelase---->")
    if(client) client.release();
  }
};

export const updateUserFromWeb = async (body, loggedUser) => {
  const {
    id,first_name, last_name, user_name, mobile, email,
    profile_pic, role, address, country_code, country,
    city, state, pin_code, dob, gender
  } = body;
  console.log(body,loggedUser)

  const userId = id

  const client = await adminDbPool.connect();
  try {
    await client.query("BEGIN");

    // 🔒 Role validation
    const { rows: findRoleType } = await client.query(
      `SELECT role, is_restricted FROM users WHERE id = $1`,
      [loggedUser.id]
    );

    if (findRoleType.length === 0) throw Boom.notFound("Logged user not found");
    if (findRoleType[0].is_restricted) throw Boom.conflict("User is restricted.");

    // Restrict who can edit whom
    if(loggedUser.id !== userId && loggedUser.role === "support")
    if (role !== "support") {
      throw Boom.conflict("Support user cannot edit user role");
    }

    if(loggedUser.id === userId && loggedUser.role === "main")
    if (loggedUser.role === "main" && role === "super-admin") {
      throw Boom.conflict("Main user cannot De-promote to super-admin");
    }

    if(loggedUser.id === userId && loggedUser.role === "super-admin")
    if (loggedUser.role === "super-admin" && role === "main") {
      throw Boom.conflict("Main user cannot promote to Main Users");
    }

    // 🔁 Check target user existence
    const { rows: findUser } = await client.query(
      `SELECT * FROM users WHERE id = $1`,
      [userId]
    );
    if (findUser.length === 0) throw Boom.notFound("User not found");

    // 🧠 Email & Mobile uniqueness check
    if (email) {
      const { rows: emailExists } = await client.query(
        `SELECT id FROM users WHERE email = $1 AND id <> $2`,
        [email, userId]
      );
      if (emailExists.length > 0) throw Boom.conflict("Email already in use");
    }

    if (mobile) {
      const { rows: mobileExists } = await client.query(
        `SELECT id FROM users WHERE mobile = $1 AND id <> $2`,
        [mobile, userId]
      );
      if (mobileExists.length > 0) throw Boom.conflict("Mobile number already in use");
    }

    // ✅ Perform update
    const updateQuery = `
      UPDATE users
      SET first_name=$1, last_name=$2, user_name=$3, mobile=$4, email=$5,
          profile_pic=$6, role=$7, address=$8, country_code=$9, country=$10,
          city=$11, state=$12, pin_code=$13, dob=$14, gender=$15, updated_at = NOW()
      WHERE id=$16
      RETURNING *;
    `;
console.log("user_name========>",user_name)
    const { rows: updatedUser } = await client.query(updateQuery, [
      first_name, last_name, user_name, mobile, email, profile_pic, role,
      address, country_code, country, city, state, pin_code, dob, gender, userId
    ]);

    await client.query("COMMIT");

    return { message: "User updated successfully", user: updatedUser[0] };
  } catch (err) {
    await client.query("ROLLBACK");
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};


export const deleteUserFromWeb = async (userId, loggedUser) => {
  const client = await adminDbPool.connect();
  try {
    await client.query("BEGIN");

    if (loggedUser.role === "support")
      throw Boom.conflict("Support users cannot delete users");

    const { rows: existingUser } = await client.query(
      `SELECT id, role, is_deleted FROM users WHERE id = $1`,
      [userId]
    );

    if (existingUser.length === 0) throw Boom.notFound("User not found");
    if (existingUser[0].is_deleted) throw Boom.conflict("User already deleted");

    // Prevent deleting super-admin by non-super-admin
    if (existingUser[0].role === "super-admin" && loggedUser.role !== "super-admin")
      throw Boom.conflict("Only super-admin can delete another super-admin");

    const { rows: deletedUser } = await client.query(
      `UPDATE users SET is_deleted = true, deleted_at = NOW() WHERE id = $1 RETURNING *`,
      [userId]
    );

    await client.query("COMMIT");

    return { message: "User deleted successfully", user: deletedUser[0] };
  } catch (err) {
    await client.query("ROLLBACK");
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};


export const restrictUserFromWeb = async (query, loggedUser) => {
  const client = await adminDbPool.connect();
  const userId = query.userId
  const restrict = query.restrict=== 'true' ? true:false
  try {
    await client.query("BEGIN");

    if (loggedUser.role === "support")
      throw Boom.conflict("Support user cannot restrict others");

    const { rows: targetUser } = await client.query(
      `SELECT id, role, is_restricted FROM users WHERE id = $1`,
      [userId]
    );
    if (targetUser.length === 0) throw Boom.notFound("User not found");

    // Prevent restricting same or higher roles
    if (
      loggedUser.role === "admin" &&
      ["admin", "super-admin"].includes(targetUser[0].role)
    ) {
      throw Boom.conflict("Cannot restrict same or higher-level user");
    }

    const { rows: updatedUser } = await client.query(
      `UPDATE users SET is_restricted = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [restrict, userId]
    );

    await client.query("COMMIT");

    return {
      message: restrict ? "User restricted successfully" : "User unrestricted successfully",
      user: updatedUser[0],
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};


export const profileDataWeb = async (loggedUser) => {
  const client = await adminDbPool.connect();
  const userId = loggedUser.id
  try {

    const { rows: targetUser } = await client.query(
      `SELECT * FROM users WHERE id = $1`,
      [userId]
    );
    if (targetUser.length === 0) throw Boom.notFound("User not found");

    return {
      message: "Profile Data",
      detail: targetUser,
    };
  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};


export const userlist = async (loggedUser) => {
  const client = await adminDbPool.connect();
//   const userId = loggedUser.id
  try {

    const { rows: targetUser } = await client.query(
      `SELECT * FROM users`,
      []
    );
    // if (targetUser.length === 0) throw Boom.notFound("User not found");

    return {
      message: "User List Data",
      data: targetUser,
    };
  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};

const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION, // e.g., 'us-east-1'
});


export const uploadFile = async (params) => {
  // return params;
  const param = {
    Bucket: process.env.AWS_BUCKET,
    Key: `user-section/${Date.now()}-${params.originalname}`,
    Body: params.buffer,
    ContentType: params.mimetype,
  };
  // return s3;

  const uploadResult = await s3.upload(param).promise();

  const formatedfile = {
    file_name: params.originalname,
    url: uploadResult.Location,
    key: uploadResult.Key,
  };
  const result = {
    detail: formatedfile,
    message: "File successfully uploaded",
  };
  return result;
};

export const dashboardlist = async (loggedUser) => {
  const client = await adminDbPool.connect();
//   const userId = loggedUser.id
  try {

     const [callerCount,functionCount] = await Promise.all([
      totalCallers(),
      totalFunction()
     ])
    return {
      message: "User List Data",
      data: {callerCount,functionCount},
    };
  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};

const totalCallers = async (loggedUser) => {
  const client = await adminDbPool.connect();
  try {

    const { rows: targetUser } = await client.query(
      `SELECT count(*) FROM users where role ='support'`,
      []
    );
    return {
      data: targetUser[0].count,
    };
  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};

const totalFunction = async (loggedUser) => {
  const client = await existingPool.connect();
  try {

    const { rows: targetUser } = await client.query(
      `SELECT count(*) FROM function`,
      []
    );
    return {
      data: targetUser[0].count,
    };
  } catch (err) {
    throw Boom.conflict(err.message);
  } finally {
    client.release();
  }
};


