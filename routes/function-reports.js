
import  express  from "express";
import { upload } from "../helpers/multer.js";
import { celebrate } from "celebrate";
import { controllerHandler } from "../helpers/controller-handeller";
import { AdminOnly, authenticateJWT } from "../helpers/auth.js";
import { contactListByEventId, functionDetailsByFunctionId, functionDetailsByUserId, userListBasedFunction } from "../src/function-reports/controller.js";

const router = express.Router();



// router.post('/register',celebrate(create,options),controllerHandler(createUser,(req, res, next) => [req.body]));
// router.post('/login',celebrate(loginWithOtpSchema,options),controllerHandler(loginUsers,(req, res, next) => [req.body]));

// router.post('/register-web',authenticateJWT,celebrate(create,options),controllerHandler(createUserFromWeb,(req, res, next) => [req.body,req.user]));
// router.patch('/update-web',authenticateJWT,celebrate(update,options),controllerHandler(updateUserFromWeb,(req, res, next) => [req.body,req.user]));
// router.get('/restrict-user',authenticateJWT,controllerHandler(restrictUserFromWeb,(req, res, next) => [req.query,req.user]));
// router.get('/profile',authenticateJWT,controllerHandler(profileDataWeb,(req, res, next) => [req.user]));
// router.get('/user-list',authenticateJWT,controllerHandler(userlist,(req, res, next) => [req.user]));
// router.post(
//   "/upload-doc",
//   authenticateJWT,
//   upload.single("file"),
//   celebrate(uploadFileSchema, options),
//   controllerHandler(uploadFile, (req, res, next) => [req.file])
// );
// router.get('/dashboard-list',authenticateJWT,AdminOnly,controllerHandler(dashboardlist,(req, res, next) => [req.user]));
// router.get('/dashboard-list',celebrate(loginWithOtpSchema,options),authenticateJWT,AdminOnly,controllerHandler(callHistoryListById,(req, res, next) => [req.user]));
router.get('/user-list',authenticateJWT,AdminOnly,controllerHandler(userListBasedFunction,(req, res, next) => [req.query,req.user]));
router.get('/function-list',authenticateJWT,AdminOnly,controllerHandler(functionDetailsByUserId,(req, res, next) => [req.query,req.user]));
router.get('/function-detail',authenticateJWT,AdminOnly,controllerHandler(functionDetailsByFunctionId,(req, res, next) => [req.query,req.user]));
router.get('/event-detail',authenticateJWT,AdminOnly,controllerHandler(contactListByEventId,(req, res, next) => [req.query,req.user]));





export default router;