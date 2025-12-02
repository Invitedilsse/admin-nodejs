
import { Joi as joi } from "celebrate";
import { removeArrayEmptyValues, removeEmptyObject } from "../../helpers/joi-schema-helpers.js";

export const options = {
  abortEarly: false,
  convert: true,
  stripUnknown: true,
};

export const loginVerifySchema = {
  body: joi.object().keys({
    mobile: joi.string().required(),
    mobile_otp: joi.string().required(),
    country_code: joi.string().required(),
  }),
};