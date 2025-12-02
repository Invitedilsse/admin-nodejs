
import  express  from "express";
import { upload } from "../helpers/multer.js";
import { celebrate } from "celebrate";
import { loginVerifySchema, options } from "../src/otp/schema.js";
import { verifyOtpLogin } from "../src/otp/controller.js";
import { controllerHandler } from "../helpers/controller-handeller";
const router = express.Router();



router.post('/verify-login',celebrate(loginVerifySchema,options),controllerHandler(verifyOtpLogin,(req, res, next) => [req.body]));
// router.post('/admin/login',celebrate(create,options),loginUsers);

// router.post('/admin/register-web',celebrate(create,options),createUserFromWeb);


// router.post(
//   "/upload-doc",
//   upload.single("file"),
//   celebrate(schema.upload, schema.options),
//   c(controller.uploadFile, (req, res, next) => [req.file])
// );

export default router;