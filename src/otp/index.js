import { adminDb } from "../../config/adminDb.js";

export const createOtpTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS otp (
        id uuid DEFAULT uuid_generate_v4 (),
        mobile VARCHAR(20) NOT NULL,
        mobile_otp VARCHAR(6),
        email VARCHAR(255),
        email_otp VARCHAR(6),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {

    await adminDb.query(createTableQuery);
    console.log("✅ otp table created successfully");
  } catch (error) {
    console.error("❌ Error creating otp table:", error);
  } 
//   finally {
//     await adminDb.end();
//   }
};
