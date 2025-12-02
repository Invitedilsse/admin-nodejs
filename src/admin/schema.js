import { Joi as joi } from "celebrate";
import { removeArrayEmptyValues, removeEmptyObject } from "../../helpers/joi-schema-helpers.js";

const MAX_FILE_SIZE = 110 * 1024 * 1024;

export const options = {
  abortEarly: false,
  convert: true,
  stripUnknown:false,
};

export const create = {
  body: joi.object().keys({
    first_name: joi.string().required().min(3).max(50),
    last_name: joi.string().optional().empty(""),
    address: joi.string().optional().empty(""),
    country: joi.string().optional().empty(""),
     user_name: joi.string().optional().empty(""),
    city: joi.string().optional().empty(""),
    state: joi.string().optional().empty(""),
    pin_code: joi.string().optional().empty(""),
    country_code: joi
      .string()
      .required()
      .min(1)
      .max(4),
    mobile: joi
      .string()
      .required()
      .min(8)
      .max(15),
    // password: joi.string().required().min(6).max(15),
    email: joi.string().email().optional().empty(""),
    profile_pic: joi
      .object({
        file_name: joi.string().optional().empty(""),
        url: joi.string().optional().empty(""),
        key: joi.string().optional().empty(""),
      })
      .optional()
      .custom(removeEmptyObject),
    dob: joi.string().optional().empty(""),
    gender: joi.string().optional().empty(""),
    role:joi.string().valid('main', 'admin', 'super-admin','support').required()
  }),
};

export const update = {
  body: joi.object().keys({
    id: joi.string().uuid(),
    first_name: joi.string().required().min(3).max(50),
    last_name: joi.string().optional().empty(""),
    user_name: joi.string().optional().empty(""),
    // password: joi.string().optional().empty(""),
    address: joi.string().optional().empty(""),
    country: joi.string().optional().empty(""),
    city: joi.string().optional().empty(""),
    state: joi.string().optional().empty(""),
    pin_code: joi.string().optional().empty(""),
    country_code: joi
      .string()
      .required()
      .min(1)
      .max(4),
    mobile: joi
      .string()
      .required()
      .min(8)
      .max(15),
    // password: joi.string().required().min(6).max(15),
    email: joi.string().email().optional().empty(""),
    profile_pic: joi
      .object({
        file_name: joi.string().optional().empty(""),
        url: joi.string().optional().empty(""),
        key: joi.string().optional().empty(""),
      })
      .optional()
      .custom(removeEmptyObject),
    dob: joi.string().optional().empty(""),
    gender: joi.string().optional().empty(""),
    role:joi.string().valid('main', 'admin', 'super-admin','support').required()
  }),
};

export const uploadFileSchema = {
  body: joi.object({
    file: joi.object({
      mimetype: joi.string().valid("image/jpeg", "image/png").required(),
      size: joi.number().max(MAX_FILE_SIZE).required(), // 5MB in bytes
    }),
  }),
};

export const loginWithOtpSchema = {
  body: joi.object().keys({
    mobile: joi.string().required(),
    country_code: joi.string().required()
  }),
};

