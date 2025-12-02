
import  express  from "express";

import { upload } from "../helpers/multer.js";
import { celebrate } from "celebrate";
import { controllerHandler } from "../helpers/controller-handeller";
import { authenticateJWT, mainAndSuperOnly, supportOnly } from "../helpers/auth.js";
import { assignedContactList, createCallHistoryTemplate, deleteWatriggerTemplate, getCallHistoryReasonById, getDropDownTemplate, getDropDownTemplateById, getFilterList, getUpdateMessageStatus, getWatriggerTemplate, triggerwanotification, updateCallHistoryTemplate, upsertCallHistoryReason } from "../src/call-managements/controller.js";
import { upsertCallrecord } from "../src/call-managements/schema.js";
import { options } from "../src/admin/schema.js";

const router = express.Router();



router.post('/create-template',authenticateJWT,controllerHandler(createCallHistoryTemplate,(req, res, next) => [req.body,req.user]));
router.patch('/update-template/:id',authenticateJWT,controllerHandler(updateCallHistoryTemplate,(req, res, next) => [req.params,req.body,req.user]));
router.get('/get-template/:functionId',authenticateJWT,controllerHandler(getWatriggerTemplate,(req, res, next) => [req.params,req.user]));
router.delete('/delete-template/:id',authenticateJWT,controllerHandler(deleteWatriggerTemplate,(req, res, next) => [req.params,req.user]));
router.get('/get-contact-list',authenticateJWT,supportOnly,controllerHandler(assignedContactList,(req, res, next) => [req.query,req.user]));
router.get(
  "/triggerwanotificationcaller",
  authenticateJWT,
//   celebrate(schema.triggerWAQuery, schema.options),
  controllerHandler(triggerwanotification, (req, res, next) => [req.query, req.user])
);
console.log("iiiiiiinnnn")
router.get(
  "/getTemplateDropList/:functionId",
  authenticateJWT,
  supportOnly,
  controllerHandler(getDropDownTemplate, (req, res, next) => [req.params, req.user])
);

router.get(
  "/getTemplateDropListById",
  authenticateJWT,
  supportOnly,
  controllerHandler(getDropDownTemplateById, (req, res, next) => [req.query, req.user])
);

router.get(
  "/getUpdateMessageStatus",
   authenticateJWT,
   supportOnly,
  // celebrate(schema.triggerWAQuery, schema.options),
  controllerHandler(getUpdateMessageStatus, (req, res, next) => [req.query, req.user])
);

router.post('/upsert-message',celebrate(upsertCallrecord,options),authenticateJWT,controllerHandler(upsertCallHistoryReason,(req, res, next) => [req.body,req.user]));

router.get(
  "/getMessageListById",
   authenticateJWT,
   supportOnly,
  // celebrate(schema.triggerWAQuery, schema.options),
  controllerHandler(getCallHistoryReasonById, (req, res, next) => [req.query, req.user])
);
router.get(
  "/getFilterList",
   authenticateJWT,
   supportOnly,
  // celebrate(schema.triggerWAQuery, schema.options),
  controllerHandler(getFilterList, (req, res, next) => [req.query, req.user])
);



export default router;