import { Joi as joi } from "celebrate";

export const options = {
  abortEarly: false,
  convert: true,
  stripUnknown: true,
};

const dateRange = {
  start_date: joi.string().allow(null, "").optional(),
  end_date: joi.string().allow(null, "").optional(),
};

export const summarySchema = {
  query: joi.object().keys({ ...dateRange }),
};

export const listSchema = {
  query: joi.object().keys({
    ...dateRange,
    search: joi.string().allow(null, "").optional(),
    priority: joi.string().valid("high", "medium", "low", "").optional(),
    status: joi.string().valid("active", "completed", "").optional(),
    limit: joi.number().integer().min(1).max(200).optional(),
    page: joi.number().integer().min(1).optional(),
  }),
};

export const userListSchema = {
  query: joi.object().keys({
    ...dateRange,
    search: joi.string().allow(null, "").optional(),
    limit: joi.number().integer().min(1).max(200).optional(),
    page: joi.number().integer().min(1).optional(),
  }),
};

export const appUsersSchema = {
  query: joi.object().keys({
    search: joi.string().allow(null, "").optional(),
    limit: joi.number().integer().min(1).max(200).optional(),
  }),
};

export const exportSchema = {
  query: joi.object().keys({
    ...dateRange,
    search: joi.string().allow(null, "").optional(),
    priority: joi.string().valid("high", "medium", "low", "").optional(),
    status: joi.string().valid("active", "completed", "").optional(),
  }),
};

/** Super-admin reminder creation: for chosen users, or for every app user. */
export const createReminderSchema = {
  body: joi.object().keys({
    title: joi.string().trim().min(1).max(255).required(),
    description: joi.string().trim().min(1).required(),
    remind_at: joi.date().iso().required(),
    venue_name: joi.string().allow(null, "").optional(),
    venue_address: joi.string().allow(null, "").optional(),
    priority: joi.string().valid("high", "medium", "low").default("medium"),
    comment_mode: joi
      .string()
      .valid("everyone", "selected", "disabled")
      .default("everyone"),
    schedules: joi
      .array()
      .items(
        joi.object().keys({
          offset_minutes: joi.number().integer().min(0).max(525600).required(),
          label: joi.string().allow(null, "").optional(),
        })
      )
      .min(1)
      .required(),
    target: joi.string().valid("selected", "all").required(),
    // Required only when targeting specific users.
    user_ids: joi
      .array()
      .items(joi.string().uuid())
      .when("target", {
        is: "selected",
        then: joi.array().min(1).required(),
        otherwise: joi.array().optional(),
      }),
  }),
};

export const idParamSchema = {
  params: joi.object().keys({
    id: joi.string().uuid().required(),
  }),
};

export const userParamSchema = {
  params: joi.object().keys({
    userId: joi.string().uuid().required(),
  }),
  query: joi.object().keys({ ...dateRange }),
};
