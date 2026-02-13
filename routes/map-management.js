
import  express  from "express";
import { upload } from "../helpers/multer.js";
import { celebrate } from "celebrate";
import { controllerHandler } from "../helpers/controller-handeller";
import { AdminOnly, authenticateJWT } from "../helpers/auth.js";
import { createMapTemplateController, createOfflineEventController, createOfflineoccasionController, deleteMapTemplateByIdController, deleteOfflineEventByIdController, deleteOfflineoccasionByIdController, listOfflineEventsController, listOfflineEventsMobController, listOfflineoccasionController, listTemplatesController, updateMapTemplateByIdController, updateOfflineEventByIdController, updateOfflineoccasionByIdController } from "../src/map-management/controller.js";
import { addEventTemplateSchema, addMapTemplateSchema, addOccTemplateSchema, options } from "../src/map-management/schema.js";

const router = express.Router();


router.post(
  "/create-map-template",
  authenticateJWT,
  celebrate(addMapTemplateSchema, options),
  controllerHandler(createMapTemplateController, (req, res, next) => [req.body,req.user])
);

router.get(
  "/list-map",
  authenticateJWT,
  // celebrate(schema.addMapTemplateSchema, schema.options),
  controllerHandler(listTemplatesController, (req, res, next) => [req.query,req.user])
);

router.patch(
    "/edit-map",
  authenticateJWT,
  celebrate(addMapTemplateSchema, options),
  controllerHandler(updateMapTemplateByIdController, (req, res, next) => [req.body,req.user])
)


router.delete(
  "/delete-map/:id",
  authenticateJWT,
  // celebrate(schema.addMapTemplateSchema, schema.options),
  controllerHandler(deleteMapTemplateByIdController, (req, res, next) => [req.params,req.user])
);

router.post(
  "/create-event-template",
  authenticateJWT,
  celebrate(addEventTemplateSchema, options),
  controllerHandler(createOfflineEventController, (req, res, next) => [req.body,req.user])
);


router.get(
  "/list-event",
  authenticateJWT,
  // celebrate(schema.addMapTemplateSchema, schema.options),
  controllerHandler(listOfflineEventsController, (req, res, next) => [req.query,req.user])
);

router.get(
  "/list-event-mob",
  authenticateJWT,
  // celebrate(schema.addMapTemplateSchema, schema.options),
  controllerHandler(listOfflineEventsMobController, (req, res, next) => [req.query,req.user])
);

router.patch(
    "/edit-event",
  authenticateJWT,
  celebrate(addEventTemplateSchema, options),
  controllerHandler(updateOfflineEventByIdController, (req, res, next) => [req.body,req.user])
)


router.delete(
  "/delete-event/:id",
  authenticateJWT,
  // celebrate(schema.addMapTemplateSchema, schema.options),
  controllerHandler(deleteOfflineEventByIdController, (req, res, next) => [req.params,req.user])
);

router.post(
  "/create-occasion-template",
  authenticateJWT,
  celebrate(addOccTemplateSchema, options),
  controllerHandler(createOfflineoccasionController, (req, res, next) => [req.body,req.user])
);


router.get(
  "/list-occasion",
  authenticateJWT,
  // celebrate(schema.addMapTemplateSchema, schema.options),
  controllerHandler(listOfflineoccasionController, (req, res, next) => [req.query,req.user])
);

router.get(
  "/list-occasion-mob",
  authenticateJWT,
  // celebrate(schema.addMapTemplateSchema, schema.options),
  controllerHandler(listOfflineoccasionController, (req, res, next) => [req.query,req.user])
);

router.patch(
  "/edit-occasion",
  authenticateJWT,
  celebrate(addOccTemplateSchema, options),
  controllerHandler(updateOfflineoccasionByIdController, (req, res, next) => [req.body,req.user])
)


router.delete(
  "/delete-occasion/:id",
  authenticateJWT,
  // celebrate(schema.addMapTemplateSchema, schema.options),
  controllerHandler(deleteOfflineoccasionByIdController, (req, res, next) => [req.params,req.user])
);

export default router;
