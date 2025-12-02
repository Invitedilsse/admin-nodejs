import express from 'express';
import dotenv from 'dotenv';
import { readdirSync } from "fs";
import cors from 'cors';
import morgan from 'morgan';
import dayjs from 'dayjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createUsersTable } from './src/admin/index.js';
import errorHandler from './helpers/errors.js'
import { adminDb } from './config/adminDb.js';
import { createOtpTable } from './src/otp/index.js';
import { createmappedContactcallersTable } from './src/assign-task/index.js';
import { createCallManagements } from './src/call-managements/index.js';
dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

app.use(cors({
  origin: '*',
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
}));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS, PUT, PATCH, DELETE"
    );
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept ,authorization"
    );
    return res.status(200).json({});
  }
  next();
});

morgan.token('date', () => {
  return dayjs().format('DD-MM-YYYY hh:mm:ss A'); // e.g., 16-05-2025 04:15:23 PM
});

// Create a custom format with the date
const customFormat = ':date :method :url :status :res[content-length] - :response-time ms';

// Use custom format in morgan
app.use(morgan(customFormat));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.get('/', (req, res) => {
  res.send('Server running...');
});

process.on("SIGINT", () => {
  console.log(
    "SIGINT signal received. Shutting down server (gracefully; maybe.)."
  );
  // const cleanUp = () => {
  //   mongo.closeDbConn();
  // };

  app.close(async() => {
    console.log("Server shut down.");
    // cleanUp();
     await adminDb.end();
    process.exit();
  });
  // Force close server after 4secs
  setTimeout((e) => {
    console.log("Forcing server to shut down.", e);
    // cleanUp();
    process.exit(1);
  }, 4000);
});

// app.use('/api/existing', existingRoutes);
// app.use('/api/admin', adminRoutes);
// readdirSync('./routes').map((r) => app.use('/api', require(`./routes/${r}`)));
createUsersTable()
createOtpTable()
createmappedContactcallersTable()
createCallManagements()
const routeFiles = readdirSync(path.join(__dirname, './routes'));
for (const file of routeFiles) {
    let baseName = path.basename(file, path.extname(file));
    console.log(file,baseName)
  const routeModule = await import(`./routes/${file}`);
  app.use(`/api/${baseName}`, routeModule.default);
}
app.use(errorHandler.schemavalidation);
app.use(errorHandler.all);
app.use(errorHandler.token);



export default app;
