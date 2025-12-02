import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const USER = process.env.EXISTING_DB_USER;
const HOST = process.env.EXISTING_DB_HOST;
const DATABASE = process.env.EXISTING_DB_NAME;
const DB_PASSWORD = process.env.EXISTING_DB_PASSWORD;
const DB_PORT = process.env.DB_PORT;

export const existingPool = new Pool({
  host: HOST,
  port: DB_PORT,
  user: USER,
  password: DB_PASSWORD,
  database: DATABASE,
  ssl: { rejectUnauthorized: false }

});

existingPool.on('connect', () => {
  console.log('✅ Connected to Existing Database');
});
