import { Joi as joi } from "celebrate";
import { removeArrayEmptyValues, removeEmptyObject } from "../../helpers/joi-schema-helpers.js";

const MAX_FILE_SIZE = 110 * 1024 * 1024;

export const options = {
  abortEarly: false,
  convert: true,
  stripUnknown:false,
};

export const addMapTemplateSchema = {
  body: joi.object().keys({
      id: joi.string().uuid().optional(),
      location_title: joi.string().required(),
      venuname: joi.string().required(),
      group_type: joi.string().required(),
      lat: joi.string().required(),
      long: joi.string().required(),
      keywords: joi.array().items(
        joi.object({
          key:joi.string().required()
        })
      ).optional()
  }),
};

export const addEventTemplateSchema = {
  body: joi.object().keys({
      id: joi.string().uuid().optional(),
      is_deleted: joi.boolean().optional(),
      event_name: joi.string().required(),
      occasion_name: joi.string().required()
  }),
};

export const addOccTemplateSchema = {
  body: joi.object().keys({
      id: joi.string().uuid().optional(),
      is_deleted: joi.boolean().optional(),
      occasion_name: joi.string().required()
  }),
};