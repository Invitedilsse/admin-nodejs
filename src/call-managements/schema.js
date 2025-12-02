import { Joi as joi } from "celebrate";
import { removeArrayEmptyValues, removeEmptyObject } from "../../helpers/joi-schema-helpers.js";

const MAX_FILE_SIZE = 110 * 1024 * 1024;

export const upsertCallrecord = {
  body: joi.object().keys({
    id: joi.string().uuid().optional().allow(null),
    call_history_id:joi.string().uuid().required(),
    msg: joi.string().required(),
    response: joi.string().required()
  }),
};