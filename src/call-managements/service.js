import { adminDb } from "../../config/adminDb.js";
import Boom from '@hapi/boom';

export const saveTemplate = async (functionId, fields,tempalte_name,loggedUser) => {
  const client = await adminDb.connect();

  try {
        const { rows: findRoleType } = await client.query(
          `SELECT role, is_restricted FROM users WHERE id = $1`,
          [loggedUser.id]
        );
    
        if (findRoleType.length === 0) throw Boom.notFound("Logged user not found");
        if (findRoleType[0].is_restricted) throw Boom.conflict("User is restricted.");
        if (loggedUser.role !== 'main' && loggedUser.role !== 'super-admin') throw Boom.conflict("User is restricted.");

    const insertQuery = `
      INSERT INTO call_history_templates (function_id, fields,tempalte_name)
      VALUES ($1, $2,$3)
      RETURNING *;
    `;

    const { rows } = await client.query(insertQuery, [
      functionId,
      JSON.stringify(fields),
      tempalte_name
    ]);

    return rows[0];

  } finally {
    client.release();
  }
};
