import Boom from '@hapi/boom';
import { adminDb as adminDbPool } from "../../config/adminDb.js";


const getByIdQuery = async (params) => {
  const mobileCheckQuery = "SELECT * FROM users WHERE id = $1";
  const result = await adminDbPool.query(mobileCheckQuery, [params.id]);
  return result.rows.length > 0 ? result.rows : false;
};

export const checkMobileNumberExist = async (params) => {
  console.log("params---------------------------", params);
  const mobileCheckQuery = "SELECT * FROM otp WHERE mobile = $1";
  const mobileCheckResult = await adminDbPool.query(mobileCheckQuery, [params.mobile]);

  return mobileCheckResult.rows.length > 0 ? mobileCheckResult.rows : false;
};

export const deleteByMobileNumber = async (params) => {
  const deleteQuery = "DELETE FROM otp WHERE mobile = $1 RETURNING *";
  const deleteResult = await adminDbPool.query(deleteQuery, [params.mobile]);

  return deleteResult.rows.length > 0 ? deleteResult.rows : false;
};

export const createOtp = async (params) => {
  const mobile_otp = generateUniqueNumericOTP(4)
  console.log("otp=========>",mobile_otp)
  const query = `
      INSERT INTO otp (
        mobile, mobile_otp
      ) VALUES (
        $1, $2
      ) RETURNING *;
    `;

  const values = [params, mobile_otp];

  const result = await adminDbPool.query(query, values);
  return result.rows;
};

const usedOTPs = new Set();
function generateUniqueNumericOTP(length) {
  const digits = "0123456789";
  let otp = "";

  do {
    otp = "";
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
  } while (usedOTPs.has(otp));

  usedOTPs.add(otp);

  return otp;
}

export const getUserByMobileNumber = async (params) => {
  console.log('params====', params);
  const getUserQuery = "SELECT * FROM users WHERE mobile = $1 and country_code=$2";
  const getUserResult = await adminDbPool.query(getUserQuery, [params.mobile,params.country_code]);
  console.log('params==== getUserResult.rows', getUserResult.rows);
  return getUserResult.rows.length > 0 ? getUserResult.rows : [];
};

export const updateUserByMobileNumber = async (params) => {
  const updateQuery = `
    UPDATE users
    SET 
      is_verified = $1
    WHERE mobile = $2
    RETURNING *;
  `;

  const updateResult = await adminDbPool.query(updateQuery, [
    params.is_verified,
    params.mobile,
  ]);

  return updateResult.rows.length > 0 ? updateResult.rows : false;
};