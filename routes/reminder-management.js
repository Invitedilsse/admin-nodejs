import express from "express";
import { celebrate } from "celebrate";
import { controllerHandler } from "../helpers/controller-handeller";
import { authenticateJWT } from "../helpers/auth.js";
import {
  reminderSummaryController,
  reminderListController,
  reminderDetailController,
  reminderUserListController,
  reminderUserDetailController,
  reminderAppUsersController,
  reminderCreateController,
  reminderExportController
} from "../src/reminder-management/controller.js";
import {
  summarySchema,
  listSchema,
  userListSchema,
  idParamSchema,
  userParamSchema,
  appUsersSchema,
  exportSchema,
  createReminderSchema,
  options
} from "../src/reminder-management/schema.js";

const router = express.Router();

// Dashboard counters + daily trend for a date range.
router.get(
  "/summary",
  authenticateJWT,
  celebrate(summarySchema, options),
  controllerHandler(reminderSummaryController, (req, res, next) => [req.query, req.user])
);

// Paginated reminders, filterable by range / priority / status and searchable.
router.get(
  "/list",
  authenticateJWT,
  celebrate(listSchema, options),
  controllerHandler(reminderListController, (req, res, next) => [req.query, req.user])
);

// Excel export of everything behind the current filters.
router.get(
  "/export",
  authenticateJWT,
  celebrate(exportSchema, options),
  controllerHandler(reminderExportController, (req, res, next) => [req.query, req.user])
);

// App users for the target picker on the create form.
router.get(
  "/app-users",
  authenticateJWT,
  celebrate(appUsersSchema, options),
  controllerHandler(reminderAppUsersController, (req, res, next) => [req.query, req.user])
);

// Super admin pushes a reminder to selected users, or to everyone.
router.post(
  "/create",
  authenticateJWT,
  celebrate(createReminderSchema, options),
  controllerHandler(reminderCreateController, (req, res, next) => [req.body, req.user])
);

// Per-user rollup. Declared before "/:id"-style routes to avoid shadowing.
router.get(
  "/users",
  authenticateJWT,
  celebrate(userListSchema, options),
  controllerHandler(reminderUserListController, (req, res, next) => [req.query, req.user])
);

router.get(
  "/user/:userId",
  authenticateJWT,
  celebrate(userParamSchema, options),
  controllerHandler(reminderUserDetailController, (req, res, next) => [
    req.params,
    req.query,
    req.user
  ])
);

router.get(
  "/details/:id",
  authenticateJWT,
  celebrate(idParamSchema, options),
  controllerHandler(reminderDetailController, (req, res, next) => [req.params, req.user])
);

export default router;
