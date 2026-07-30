import { AdminOnly, authenticateJWT } from "../helpers/auth.js";
import  express  from "express";
import { upload } from "../helpers/multer.js";
import { celebrate } from "celebrate";
import { controllerHandler } from "../helpers/controller-handeller";
import { addEventTypeController, addOcrKeywordController, clearTypeMatchesController, deleteEventTypeController, deleteOcrKeywordController, exportNewVenuesController, getCompressSettingController, getEventTypesController, getFuzzyThresholdSettingController, getNewVenuesController, getOcrKeywordsController, getOcrLeaderboardController, getOcrMainPromptController, getOcrModelConfigController, getOcrUsageLogsController, getOcrUserQuotaListController, getRawPageDataController, getRawPageSettingController, getTypeMatchesController, setCompressSettingController, setFuzzyThresholdSettingController, setOcrModelConfigApiController, setRawPageSettingController, updateUserOcrQuotaController, 
    upsertOcrMainPromptController } from "../src/ocr-managements/controller.js";
const router = express.Router();


router.get(
  "/leaderboard",
  authenticateJWT,
  controllerHandler(getOcrLeaderboardController, (req, res, next) => [req.query, req.user])
);

router.get(
  "/ocr-promt-api",
  authenticateJWT,
  controllerHandler(getOcrMainPromptController, (req, res, next) => [req.query])
);


router.post(
  "/ocr-promt-api",
  authenticateJWT,
  controllerHandler(upsertOcrMainPromptController, (req, res, next) => [req.body,req.user])
);

// router.post(
//   "/review",
//   authenticateJWT,
//   controllerHandler(saveOcrReview, (req, res, next) => [req.body, req.user])
// );

router.get(
  "/new-venues",
  authenticateJWT,
  controllerHandler(getNewVenuesController, (req, res, next) => [req.query, req.user])
);
router.post(
  "/new-venues/export",
  authenticateJWT,
  controllerHandler(exportNewVenuesController, (req, res, next) => [req.body, req.user])
);


router.get(
  "/type-matches",
  authenticateJWT,
  controllerHandler(getTypeMatchesController, (req, res, next) => [req.query, req.user])
);
router.delete(
  "/type-matches",
  authenticateJWT,
  controllerHandler(clearTypeMatchesController, (req, res, next) => [req.body, req.user])
);

router.get(
  "/event-types",
  authenticateJWT,
  controllerHandler(getEventTypesController, (req, res, next) => [req.query, req.user])
);
router.post(
  "/event-types",
  authenticateJWT,
  controllerHandler(addEventTypeController, (req, res, next) => [req.body, req.user])
);
router.delete(
  "/event-types/:id",
  authenticateJWT,
  controllerHandler(deleteEventTypeController, (req, res, next) => [req.params, req.user])
);


router.get(
  "/keywords",
  authenticateJWT,
  controllerHandler(getOcrKeywordsController, (req, res, next) => [req.query, req.user])
);
router.post(
  "/keywords",
  authenticateJWT,
  controllerHandler(addOcrKeywordController, (req, res, next) => [req.body, req.user])
);
router.delete(
  "/keywords/:id",
  authenticateJWT,
  controllerHandler(deleteOcrKeywordController, (req, res, next) => [req.params, req.user])
);

router.get(
  "/fuzzy-threshold",
  authenticateJWT,
  controllerHandler(getFuzzyThresholdSettingController, (req, res, next) => [req.query, req.user])
);
router.put(
  "/fuzzy-threshold",
  authenticateJWT,
  controllerHandler(setFuzzyThresholdSettingController, (req, res, next) => [req.body, req.user])
);

router.get(
  "/compress-setting",
  authenticateJWT,
  controllerHandler(getCompressSettingController, (req, res, next) => [req.query, req.user])
);
router.put(
  "/compress-setting",
  authenticateJWT,
  controllerHandler(setCompressSettingController, (req, res, next) => [req.body, req.user])
);

router.get(
  "/raw-page-data",
  authenticateJWT,
  controllerHandler(getRawPageDataController, (req, res, next) => [req.query, req.user])
);

router.get(
  "/raw-page-setting",
  authenticateJWT,
  controllerHandler(getRawPageSettingController, (req, res, next) => [req.query, req.user])
);
router.put(
  "/raw-page-setting",
  authenticateJWT,
  controllerHandler(setRawPageSettingController, (req, res, next) => [req.body, req.user])
);

router.get(
  "/model-config",
  authenticateJWT,
  controllerHandler(getOcrModelConfigController, (req, res, next) => [req.query, req.user])
);

// Super-admin: set active model
router.put(
  "/model-config",
  authenticateJWT,
  controllerHandler(setOcrModelConfigApiController, (req, res, next) => [req.body, req.user])
);

router.get(
  "/user-quota-list",
  authenticateJWT,
  controllerHandler(getOcrUserQuotaListController, (req, res, next) => [req.query, req.user])
);

// Admin: update a user's allowed attempts
router.put(
  "/user-quota/:userId",
  authenticateJWT,
  controllerHandler(updateUserOcrQuotaController, (req, res, next) => [req.params, req.body, req.user])
);

router.get(
  "/usage-logs",
  authenticateJWT,
  controllerHandler(getOcrUsageLogsController, (req, res, next) => [req.query, req.user])
);







export default router;






// router.get(
//   "/my-quota",
//   authenticateJWT,
//   controllerHandler(getMyOcrQuota, (req, res, next) => [req.query, req.user])
// );

// router.post(
//   "/pdf-preview",
//   upload.single("file"),
//   authenticateJWT,
//   controllerHandler(previewPdfApi, (req, res, next) => [req.file, req.query, req.user])
// );

// router.post(
//   "/process-session",
//   authenticateJWT,
//   controllerHandler(processSessionApi, (req, res, next) => [req.body, req.user])
// );


// router.get(
//   "/check-quota",
//   authenticateJWT,
//   controllerHandler(checkQuota, (req, res, next) => [req.user])
// );

