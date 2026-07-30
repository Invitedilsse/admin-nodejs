
// import  express  from "express";
// import { upload } from "../helpers/multer.js";
// import { celebrate } from "celebrate";
// import { controllerHandler } from "../helpers/controller-handeller";
// import { AdminOnly, authenticateJWT } from "../helpers/auth.js";
// import { deleteAdvertisment, deleteAdvertismentfile, incrementAdViewCount, listAdvertisment, upsertAdvertisment } from "../src/ad/controller.js";
// import { deleteAdvertismentFileSchema, incrementViewCountSchema, listAdvertismentSchema, options, upsertAdvertismentSchema } from "../src/ad/schema.js";

// const router = express.Router();



// router.post('/upsert-advertisment',celebrate(upsertAdvertismentSchema,options),authenticateJWT,AdminOnly,controllerHandler(upsertAdvertisment,(req, res, next) => [req.body,req.user]));
// router.delete('/delete-advertisment/:id',celebrate(deleteAdvertismentFileSchema,options),authenticateJWT,AdminOnly,controllerHandler(deleteAdvertisment,(req, res, next) => [req.params,req.user]));
// router.delete('/delete-advertisment-file/:id',celebrate(deleteAdvertismentFileSchema,options),authenticateJWT,AdminOnly,controllerHandler(deleteAdvertismentfile,(req, res, next) => [req.params,req.user]));
// router.get('/list-advertisment',celebrate(listAdvertismentSchema,options),controllerHandler(listAdvertisment,(req, res, next) => [req.query,req.user]));
// router.get('/inc-view/:id',celebrate(incrementViewCountSchema,options),controllerHandler(incrementAdViewCount,(req, res, next) => [req.params,req.user]));




// // router.get('/dashboard-list',celebrate(loginWithOtpSchema,options),authenticateJWT,AdminOnly,controllerHandler(callHistoryListById,(req, res, next) => [req.user]));



// export default router;

import { celebrate }        from "celebrate";
import { Router }           from "express";
import { controllerHandler } from "../helpers/controller-handeller";
import { AdminOnly, authenticateJWT } from "../helpers/auth.js";

// ── Services ──────────────────────────────────────────────────────────────────
import {
  // original
  upsertAdvertisment,
  incrementAdViewCount,
  listAdvertisment,
  deleteAdvertisment,
  deleteAdvertismentfile,
  // rules
  upsertAdvertismentRule,
  listAdvertismentRules,
  getAdvertismentRuleById,
  deleteAdvertismentRule,
  // impressions
  recordImpression,
  recordClick,
  listImpressions,
  getImpressionStats,
  // serving
  getEligibleAds,
  getActiveAd,
  getAdNotifications,
  addAdNotification,
  updateAdNotification,
  deleteAdNotification,
  pushadnotificationForallusers,
  getActiveWesiteRedirect,
  upsertwesiteredirect,
  listWesiteRedirect,
  recordWesiteRedirectClick,
} from "../src/ad/controller.js";

// ── Schemas ───────────────────────────────────────────────────────────────────
import {
  options,
  // original
  upsertAdvertismentSchema,
  incrementViewCountSchema,
  deleteAdvertismentFileSchema,
  listAdvertismentSchema,
  // rules
  upsertAdvertismentRuleSchema,
  listAdvertismentRulesSchema,
  ruleByIdSchema,
  deleteAdvertismentRuleSchema,
  // impressions
  recordImpressionSchema,
  recordClickSchema,
  listImpressionsSchema,
  impressionStatsSchema,
  // serving
  getEligibleAdsSchema,
  getActiveAdSchema,
  putAdNotifiSchema,
  AdIdNotiIdfiSchema,
  getAdIdNotifiSchema,
  postAdNotifiSchema,
  websiteByDateSchema,
  upsertWebRecordSchema,
  upsertWebisteSchema,
} from "../src/ad/schema.js";

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
//  ADVERTISEMENT  (original routes — unchanged)
// ═══════════════════════════════════════════════════════════════════════════════

router.post(
  "/upsert-advertisment",
  celebrate(upsertAdvertismentSchema, options),
  authenticateJWT,
  AdminOnly,
  controllerHandler(upsertAdvertisment, (req) => [req.body, req.user])
);

router.delete(
  "/delete-advertisment/:id",
  celebrate(deleteAdvertismentFileSchema, options),
  authenticateJWT,
  AdminOnly,
  controllerHandler(deleteAdvertisment, (req) => [req.params, req.user])
);

router.delete(
  "/delete-advertisment-file/:id",
  celebrate(deleteAdvertismentFileSchema, options),
  authenticateJWT,
  AdminOnly,
  controllerHandler(deleteAdvertismentfile, (req) => [req.params, req.user])
);

router.get(
  "/list-advertisment",
  celebrate(listAdvertismentSchema, options),
  controllerHandler(listAdvertisment, (req) => [req.query])
);

router.get(
  "/inc-view/:id",
  celebrate(incrementViewCountSchema, options),
  controllerHandler(incrementAdViewCount, (req) => [req.params.id])
);

// ═══════════════════════════════════════════════════════════════════════════════
//  ADVERTISEMENT RULES  (admin-only)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /upsert-advertisment-rule
 * Create or update a targeting rule for an advertisement.
 * Body: { id?, ad_id, page_name, slot_name, priority, start_at, end_at, ... }
 */
router.post(
  "/upsert-advertisment-rule",
  celebrate(upsertAdvertismentRuleSchema, options),
  authenticateJWT,
  AdminOnly,
  controllerHandler(upsertAdvertismentRule, (req) => [req.body])
);

/**
 * GET /list-advertisment-rules
 * Paginated rule list. Filters: ?ad_id=&page_name=&slot_name=&is_enabled=&page=&limit=
 */
router.get(
  "/list-advertisment-rules",
  celebrate(listAdvertismentRulesSchema, options),
  authenticateJWT,
  AdminOnly,
  controllerHandler(listAdvertismentRules, (req) => [req.query])
);

/**
 * GET /advertisment-rule/:id
 * Fetch a single rule by id.
 */
router.get(
  "/advertisment-rule/:id",
  celebrate(ruleByIdSchema, options),
  authenticateJWT,
  AdminOnly,
  controllerHandler(getAdvertismentRuleById, (req) => [req.params])
);

/**
 * DELETE /delete-advertisment-rule/:id
 * Delete a rule. Cascades safely — does not touch the parent advertisement.
 */
router.delete(
  "/delete-advertisment-rule/:id",
  celebrate(deleteAdvertismentRuleSchema, options),
  authenticateJWT,
  AdminOnly,
  controllerHandler(deleteAdvertismentRule, (req) => [req.params])
);

// ═══════════════════════════════════════════════════════════════════════════════
//  ADVERTISEMENT IMPRESSIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /record-impression
 * Called by the client each time an ad is rendered on screen.
 * Also atomically bumps view_count on the parent advertisement.
 * Body: { ad_id, page_name, slot_name, user_id?, session_id? }
 * Auth: optional — works for both logged-in and anonymous users.
 */
router.post(
  "/record-impression",
  celebrate(recordImpressionSchema, options),
  controllerHandler(recordImpression, (req) => [req.body])
);

/**
 * PATCH /record-click/:id
 * Mark an impression as clicked. :id is the impression row UUID
 * returned by POST /record-impression. Guards against double-clicks.
 * Auth: optional — client calls this on ad click.
 */
router.patch(
  "/record-click/:id",
  celebrate(recordClickSchema, options),
  controllerHandler(recordClick, (req) => [req.params])
);

/**
 * GET /list-impressions
 * Paginated raw impression log (admin only).
 * Filters: ?ad_id=&user_id=&session_id=&page_name=&slot_name=
 *          &from_date=&to_date=&clicked_only=&page=&limit=
 */
router.get(
  "/list-impressions",
  celebrate(listImpressionsSchema, options),
  authenticateJWT,
  AdminOnly,
  controllerHandler(listImpressions, (req) => [req.query])
);

/**
 * GET /impression-stats
 * Aggregated stats per ad: total impressions, clicks, CTR,
 * and a breakdown by page_name + slot_name.
 * Filters: ?ad_id=&from_date=&to_date=
 */
router.get(
  "/impression-stats",
  celebrate(impressionStatsSchema, options),
  authenticateJWT,
  AdminOnly,
  controllerHandler(getImpressionStats, (req) => [req.query])
);

// ═══════════════════════════════════════════════════════════════════════════════
//  AD SERVING  (public — called by the frontend before rendering a slot)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /eligible-ads
 * Returns ads that are allowed to show for the given page + slot,
 * filtered by all rule constraints (frequency caps, intervals, schedules).
 * Query: ?page_name=home&slot_name=top_banner&user_id=<uuid>&session_id=<string>
 *
 * Typical client flow:
 *   1. GET /eligible-ads?page_name=home&slot_name=top_banner&session_id=abc
 *   2. Pick first result (highest priority), render it
 *   3. POST /record-impression  { ad_id, page_name, slot_name, session_id }
 *   4. On click → PATCH /record-click/:impressionId
 */
router.get(
  "/eligible-ads",
  // authenticateJWT,
  celebrate(getEligibleAdsSchema, options),
  controllerHandler(getEligibleAds, (req) => [req.query])
);

router.post(
  "/active-ad",
  celebrate(getActiveAdSchema, options),
  controllerHandler(getActiveAd, (req) => [req.body])
);


 router.get(
  "/:ad_id/notifications",
  celebrate(getAdIdNotifiSchema, options),
  controllerHandler(getAdNotifications, (req) => [req.params])
);
router.post(
  "/:ad_id/notifications",
  celebrate(postAdNotifiSchema, options),
  controllerHandler(addAdNotification, (req) => [req.params,req.body])
);
router.put(
  "/notifications/:id",
  celebrate(putAdNotifiSchema, options),
  controllerHandler(updateAdNotification, (req) => [req.params,req.body])
);
router.delete(
  "/notifications/:id",
  celebrate(AdIdNotiIdfiSchema, options),
  controllerHandler(deleteAdNotification, (req) => [req.params])
);


router.get(
  "/trigger-notifications/:id",
  celebrate(AdIdNotiIdfiSchema, options),
  controllerHandler(pushadnotificationForallusers, (req) => [req.params])
);



router.get(
  "/getactive-redirectlink",
  celebrate(websiteByDateSchema, options),
  controllerHandler(getActiveWesiteRedirect, (req) => [req.query])
);

router.post(
  "/upsert-websiteredirect",
  authenticateJWT,
  celebrate(upsertWebisteSchema, options),
  controllerHandler(upsertwesiteredirect, (req) => [req.body,req.user])
);

router.get(
  "/getall-redirectlink",
  // celebrate(AdIdNotiIdfiSchema, options),
  controllerHandler(listWesiteRedirect, (req) => [])
);

router.post(
  "/upsert-recordhistory",
  // authenticateJWT,
  celebrate(upsertWebRecordSchema, options),
  controllerHandler(recordWesiteRedirectClick, (req) => [req.body,req.user])
);



export default router;