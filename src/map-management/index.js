// import { adminDb } from "../../config/adminDb.js";

// export const createUsersTable = async () => {
//   const creatEnumstatus = `DO $$
// BEGIN
//   IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
//     CREATE TYPE user_type AS ENUM ('main', 'admin', 'super-admin','support');
//   END IF;
// END$$;`;
//   const query = `
//     CREATE TABLE IF NOT EXISTS users (
//       id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
//       first_name TEXT NOT NULL,
//       last_name TEXT,
//       user_name Text,
//       mobile VARCHAR(20) NOT NULL,
//       email TEXT UNIQUE NOT NULL,
//       password TEXT,
//       profile_pic JSON,
//       role user_type  DEFAULT 'main',
//       address TEXT,
//       country_code TEXT,
//       country VARCHAR(100),
//       city VARCHAR(100),
//       state VARCHAR(100),
//       pin_code VARCHAR(20),
//       dob VARCHAR(20),
//       gender VARCHAR(50),
//       is_verified BOOL DEFAULT FALSE,
//       is_delete BOOL DEFAULT FALSE,
//       is_restricted BOOL DEFAULT FALSE,
//       created_by uuid,
//       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//     );
//   `;

//   try {
//     await adminDb.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
//     await adminDb.query(creatEnumstatus);
//     await adminDb.query(query);
//     console.log("✅ users table created successfully");
//   } catch (error) {
//     console.error("❌ Error creating users table:", error);
//   } 
// //   finally {
// //     await adminDb.end();
// //   }
// };
