/* eslint-disable no-unused-vars */
import pkg from '@hapi/boom';
const { boom } = pkg;
// const boom = require('@hapi/boom');
import {errors} from 'celebrate'
// const validationErrorHandler = require('celebrate').errors;

async function tokenErrorHandler(err, req, res, next) {
    if (err.status === 401) {
        next(boom.unauthorized(err.name));
    } else {
        next(err);
    }
}

function allErrorHandler(err, req, res, next) {
    if (err.output) {
        return res.status(err.output.statusCode).json(err.output.payload);
    }
    return res.status(500).json('Internal Server Error');
}

export default {
    token: tokenErrorHandler,
    schemavalidation: errors(),
    all: allErrorHandler,
};