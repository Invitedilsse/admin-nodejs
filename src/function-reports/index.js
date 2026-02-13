// import { adminDb } from "../../config/adminDb.js";

// export const createmappedContactcallersTable = async () => {

//   const query = `
//   CREATE TABLE IF NOT EXISTS mappedContact_callers (
//    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
//     function_id uuid, 
//     callers_id uuid,
//      contact_id UUID[], 
//      created_by UUID,
//       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//          );
//   `;

//   try {
//     await adminDb.query(query);
//     console.log("✅ mappedContact_callers table created successfully");
//   } catch (error) {
//     console.error("❌ Error creating users table:", error);
//   } 
// //   finally {
// //     await adminDb.end();
// //   }
// };
