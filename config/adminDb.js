import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const USER = process.env.EXISTING_DB_USER_ADMIN;
const HOST = process.env.EXISTING_DB_HOST_ADMIN;
const DATABASE = process.env.EXISTING_DB_NAME_ADMIN;
const DB_PASSWORD = process.env.EXISTING_DB_PASSWORD_ADMIN;
const DB_PORT = process.env.DB_PORT;

export const adminDb = new Pool({
  host: HOST,
  port: DB_PORT,
  user: USER,
  password: DB_PASSWORD,
  database: DATABASE,
  ssl: process.env.NODE_ENV === 'local' ? false: { rejectUnauthorized: false }
});

adminDb.on('connect', () => {
  console.log('✅ Connected to New Database');
});
adminDb.on('error', (err) => console.error('❌ Unexpected error on admin DB', err));