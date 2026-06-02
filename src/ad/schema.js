import { Joi as joi } from "celebrate";

export const options = {
  abortEarly: false,
  convert: true,
  stripUnknown: false,
};

const SOCIAL_LINKS = [
  "facebook", "instagram", "whatsapp", "telegram",
  "youtube", "x", "website", "google", "shop",
];

const logoSchema = joi.object({
  key:       joi.string().required(),
  url:       joi.string().uri().required(),
  file_name: joi.string().required(),
  type:      joi.string().allow(null,'').optional(),
});
 

const fileSchema = joi.object({
  id:        joi.string().uuid().optional(),
  key:       joi.string().required(),
  url:       joi.string().uri().required(),
  file_name: joi.string().required(),
  type:      joi.string().valid("image", "audio", "video", "document").required(),
});

const uuidParam = joi.object({ id: joi.string().uuid().required() });

// ═══════════════════════════════════════════════════════════════════════════════
//  ADVERTISEMENT (original)
// ═══════════════════════════════════════════════════════════════════════════════
const hexColorSchema = joi
  .string()
  .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/)
  .message('Color must be HEX format like #FFFFFF or #80FFFFFF');

  
export const upsertAdvertismentSchema = {
  body: joi.object({
    id:         joi.string().uuid().optional(),
    name:       joi.string().required().min(1).max(100),
    logo:       logoSchema.optional().allow(null),      // new
    header:     joi.string().optional().empty("").allow(null),
    subheader:  joi.string().optional().empty("").allow(null),  // new
    body:       joi.string().optional().empty("").allow(null),
    footer:     joi.string().optional().empty("").allow(null),
    is_active:  joi.boolean().optional(),
    contact_us: joi.string().optional().empty("").allow(null),
    linkname_1: joi.string().valid(...SOCIAL_LINKS).optional().allow(null),
    link_1:     joi.string().uri().optional().empty("").allow(null),
    linkname_2: joi.string().valid(...SOCIAL_LINKS).optional().allow(null),
    link_2:     joi.string().uri().optional().empty("").allow(null),
    linkname_3: joi.string().valid(...SOCIAL_LINKS).optional().allow(null),  // new
    link_3:     joi.string().uri().optional().empty("").allow(null),         // new
    files:      joi.array().items(fileSchema).optional(),
    ad_type:         joi.string().max(50).optional().empty("").allow(null),
    offer_header:    joi.string().max(200).optional().empty("").allow(null),
    offer_subheader: joi.string().max(200).optional().empty("").allow(null),
    offer_details:   joi.string().optional().empty("").allow(null),
    link_btn_text:  joi.string().optional().empty("").allow(null),
    ad_display_type: joi.string()
                       .valid("standard", "popup", "video", "banner", "fullscreen")
                       .optional()
                       .allow(null),
     btn_icon: joi.array().items(logoSchema).optional(), 
     ui_config: joi.object({
      text_color:       hexColorSchema.optional(),
      // body_color:        hexColorSchema.optional(),
      // footer_color:      hexColorSchema.optional(),
      button_bg_color:   hexColorSchema.optional(),
      button_text_color: hexColorSchema.optional(),
      // card_bg_color:     hexColorSchema.optional(),
      // border_color:      hexColorSchema.optional(),
    }).optional(),
  })
};

export const incrementViewCountSchema  = { params: uuidParam };
export const deleteAdvertismentFileSchema = { params: uuidParam };

export const listAdvertismentSchema = {
  query: joi.object({
    is_active: joi.boolean().allow('').optional(),
    page:      joi.number().integer().min(1).default(1),
    limit:     joi.number().integer().min(1).max(100).default(10),
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  ADVERTISEMENT RULES
// ═══════════════════════════════════════════════════════════════════════════════

export const upsertAdvertismentRuleSchema = {
  body: joi.object({
    id:                    joi.string().uuid().optional(),         // absent = create
    ad_id:                 joi.string().uuid().when("id", {
                             is:        joi.exist(),
                             then:      joi.optional(),            // update: ad_id optional
                             otherwise: joi.required(),            // insert: ad_id required
                           }),
    page_name:             joi.string().min(1).max(100).when("id", {
                             is: joi.exist(), then: joi.optional(), otherwise: joi.required(),
                           }),
    slot_name:             joi.string().min(1).max(100).when("id", {
                             is: joi.exist(), then: joi.optional(), otherwise: joi.required(),
                           }),
    min_interval_seconds:  joi.number().integer().min(0).optional(),
    max_shows_per_user:    joi.number().integer().min(0).optional(),
    max_shows_per_day:     joi.number().integer().min(0).optional(),
    max_shows_per_session: joi.number().integer().min(0).optional(),
    priority:              joi.number().integer().min(0).optional(),
    start_at:              joi.date().iso().allow(null).optional(),
    end_at:                joi.date().iso().min(joi.ref("start_at")).allow(null).optional(),
    is_enabled:            joi.boolean().optional(),
  }),
};

export const listAdvertismentRulesSchema = {
  query: joi.object({
    ad_id:      joi.string().uuid().optional(),
    page_name:  joi.string().optional(),
    slot_name:  joi.string().optional(),
    is_enabled: joi.boolean().optional(),
    page:       joi.number().integer().min(1).default(1),
    limit:      joi.number().integer().min(1).max(100).default(10),
  }),
};

export const ruleByIdSchema = { params: uuidParam };

export const deleteAdvertismentRuleSchema = { params: uuidParam };

// ═══════════════════════════════════════════════════════════════════════════════
//  ADVERTISEMENT IMPRESSIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const recordImpressionSchema = {
  body: joi.object({
    ad_id:      joi.string().uuid().required(),
    user_id:    joi.string().uuid().allow(null).optional(),
    session_id: joi.string().max(255).allow(null).optional(),
    page_name:  joi.string().min(1).max(100).required(),
    slot_name:  joi.string().min(1).max(100).required(),
  }),
};

export const recordClickSchema = { params: uuidParam };   // :id = impression id

export const listImpressionsSchema = {
  query: joi.object({
    ad_id:        joi.string().uuid().optional(),
    user_id:      joi.string().uuid().optional(),
    session_id:   joi.string().optional(),
    page_name:    joi.string().optional(),
    slot_name:    joi.string().optional(),
    from_date:    joi.date().iso().optional(),
    to_date:      joi.date().iso().min(joi.ref("from_date")).optional(),
    clicked_only: joi.boolean().optional(),
    page:         joi.number().integer().min(1).default(1),
    limit:        joi.number().integer().min(1).max(100).default(20),
  }),
};

export const impressionStatsSchema = {
  query: joi.object({
    ad_id:     joi.string().uuid().optional(),
    from_date: joi.date().iso().optional(),
    to_date:   joi.date().iso().min(joi.ref("from_date")).optional(),
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  AD SERVING
// ═══════════════════════════════════════════════════════════════════════════════

export const getEligibleAdsSchema = {
  query: joi.object({
    page_name:  joi.string().min(1).max(100).required(),
    slot_name:  joi.string().min(1).max(100).required(),
    user_id:    joi.string().uuid().allow(null, "").optional(),
    session_id: joi.string().max(255).allow(null, "").optional(),
  }),
};

export const getActiveAdSchema = {
  body: joi.object({
    device_id:joi.string().required() ,
    user_id:    joi.string().uuid().required(),
    fcm_token: joi.string().required(),
  }),
};