
import  express  from "express";
import { upload } from "../helpers/multer.js";
import { celebrate } from "celebrate";
import { controllerHandler } from "../helpers/controller-handeller";
import { AdminOnly, authenticateJWT } from "../helpers/auth.js";
import { assignCallers, assignCallersBulk, assignedfunctionlist, callerContactlist, callHistoryExcelById, callHistoryListById, functionContactlist, functionlist, getOidList } from "../src/assign-task/controller.js";
import { callerHistorySchema, options } from "../src/assign-task/schema.js";

const router = express.Router();

router.get('/function-list',authenticateJWT,controllerHandler(functionlist,(req, res, next) => [req.query,req.user]));
router.get('/function-contact-list',authenticateJWT,controllerHandler(functionContactlist,(req, res, next) => [req.query,req.user]));
router.get('/filter-by-events/:functionId',authenticateJWT,controllerHandler(getOidList,(req, res, next) => [req.params,req.user]));
router.patch('/assign-callers/:functionId',authenticateJWT,controllerHandler(assignCallers,(req, res, next) => [req.params,req.body,req.user]));
router.patch('/assign-callers-bulk/:functionId',authenticateJWT,controllerHandler(assignCallersBulk,(req, res, next) => [req.params,req.body,req.user]));

router.get('/assigned-function-list',authenticateJWT,controllerHandler(assignedfunctionlist,(req, res, next) => [req.query,req.user]));

router.get('/function-assigned-caller-list',authenticateJWT,AdminOnly,controllerHandler(callerContactlist,(req, res, next) => [req.query,req.user]));
router.get('/callhistory',celebrate(callerHistorySchema,options),authenticateJWT,AdminOnly,controllerHandler(callHistoryListById,(req, res, next) => [req.query,req.user,res]));
router.get('/callhistory-excel',celebrate(callerHistorySchema,options),authenticateJWT,AdminOnly,controllerHandler(callHistoryExcelById,(req, res, next) => [req.query,req.user,res]));




// router.post('/admin/register',celebrate(create,options),controllerHandler(createUser,(req, res, next) => [req.body]));
// router.post('/admin/login',celebrate(loginWithOtpSchema,options),controllerHandler(loginUsers,(req, res, next) => [req.body]));

// router.post('/admin/register-web',authenticateJWT,celebrate(create,options),controllerHandler(createUserFromWeb,(req, res, next) => [req.body,req.user]));
// router.patch('/admin/update-web',authenticateJWT,celebrate(update,options),controllerHandler(updateUserFromWeb,(req, res, next) => [req.body,req.user]));
// router.get('/admin/profile',authenticateJWT,controllerHandler(profileDataWeb,(req, res, next) => [req.user]));
// router.get('/admin/user-list',authenticateJWT,controllerHandler(userlist,(req, res, next) => [req.user]));
// router.post(
//   "/admin/upload-doc",
//   authenticateJWT,
//   upload.single("file"),
//   celebrate(uploadFileSchema, options),
//   controllerHandler(uploadFile, (req, res, next) => [req.file])
// );

export default router;