import multer from "multer";

const MAX_FILE_SIZE =  110 * 1024 * 1024

const storage = multer.memoryStorage();
export const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE } 
});