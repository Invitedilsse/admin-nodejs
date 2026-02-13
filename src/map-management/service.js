
import { existingPool as pool } from '../../config/dbExisiting.js';
import Boom from '@hapi/boom';

export const createMapTemplate = async (body) => {
  try {
    const { location_title, venuname,group_type, lat, long, keywords = [] } = body;

    // Normalize & dedupe keywords
    const normalizedKeywords = [
      ...new Set(
        keywords.filter((k) => k?.key).map((k) => k.key.toLowerCase().trim())
      ),
    ].map((k) => ({ key: k }));

    const query = `
      INSERT INTO offline_maptemplate
      (location_title, group_type, lat, long, keywords,venuname)
      VALUES ($1, $2, $3, $4, $5,$6)
      RETURNING *;
    `;

    const values = [
      location_title,
      group_type,
      lat,
      long,
      JSON.stringify(normalizedKeywords),
      venuname,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (err) {
    console.log("offline map template error ❌", err);
    throw Boom.badRequest(err.message);
  }
};

export const listTemplates = async (queryParams) => {
  try {
    const { search, page = 1, limit = 10 } = queryParams;

    const offset = (page - 1) * limit;

    let whereClause = "";
    let values = [];
    let idx = 1;

    if (search) {
      whereClause = `
      WHERE (
        location_title ILIKE $${idx}
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(keywords) elem
          WHERE elem ->> 'key' ILIKE $${idx}
        )
      )
    `;
      values.push(`%${search}%`);
      idx++;
    }

    const dataQuery = `
    SELECT *
    FROM offline_maptemplate
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${idx} OFFSET $${idx + 1}
  `;

    values.push(limit, offset);

    const countQuery = `
    SELECT COUNT(*)
    FROM offline_maptemplate
    ${whereClause}
  `;

   const groptypeDrop = `
    select distinct group_type
    from offline_maptemplate
   `

    const [{ rows }, countResult,{rows:groupType}] = await Promise.all([
      pool.query(dataQuery, values),
      pool.query(countQuery, values.slice(0, values.length - 2)),
      pool.query(groptypeDrop),
    ]);

    const mappedGroup = groupType.map(d=>d.group_type)

    return {
      data: rows,
      page: Number(page),
      limit: Number(limit),
      total: Number(countResult.rows[0].count),
      groupDrop: mappedGroup
    };
  } catch (err) {
    console.log("offline List map template error ❌", err);
    throw Boom.badRequest(err.message);
  }
};

export const updateMapTemplateById = async (body) => {
  try {
    const { id, location_title, group_type, lat, long, keywords,venuname } = body;

    let normalizedKeywords;

    if (!id) {
      throw Boom.conflict("Template Id Required To Edit");
    }

    // Normalize keywords ONLY if provided
    if (Array.isArray(keywords)) {
      normalizedKeywords = [
        ...new Set(
          keywords.filter((k) => k?.key).map((k) => k.key.toLowerCase().trim())
        ),
      ].map((k) => ({ key: k }));
    }

    const query = `
      UPDATE offline_maptemplate
      SET
        location_title = COALESCE($2, location_title),
        group_type = COALESCE($3, group_type),
        lat = COALESCE($4, lat),
        long = COALESCE($5, long),
        keywords = COALESCE($6, keywords),
        venuname = COALESCE($7, venuname),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;

    const values = [
      id,
      location_title,
      group_type,
      lat,
      long,
      normalizedKeywords ? JSON.stringify(normalizedKeywords) : null,
      venuname,
    ];

    const { rows } = await pool.query(query, values);

    // ❌ If ID not found
    if (!rows.length) {
      throw Boom.notFound("Map template not found");
    }

    return rows[0];
  } catch (err) {
    console.log("offline map template update error ❌", err);
    // throw err.isBoom ? err : Boom.badRequest(err.message);
    throw Boom.badRequest(err.message);
  }
};

export const deleteMapTemplateById = async (id) => {
  try {
    const query = `
      DELETE FROM offline_maptemplate
      WHERE id = $1
      RETURNING id;
    `;

    const { rows } = await pool.query(query, [id]);

    if (!rows.length) {
      throw Boom.notFound("Map template not found");
    }

    return {
      message: "Map template permanently deleted",
    };
  } catch (err) {
    console.log("offline map template delete error ❌", err);
    throw err.isBoom ? err : Boom.badRequest(err.message);
  }
};

export const createOfflineEvent = async (body) => {
  try {
    const { event_name,occasion_name } = body;

    if (!event_name?.trim()) {
      throw Boom.badRequest("Event name is required");
    }

    const query = `
      INSERT INTO offline_eventlist (event_name,occasion_name)
      VALUES ($1,$2)
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [event_name.trim(),occasion_name.trim()]);
    return rows[0];
  } catch (err) {
    console.log("create offline event error ❌", err);
    throw err.isBoom ? err : Boom.badRequest(err.message);
  }
};

export const updateOfflineEventById = async (body) => {
  try {
    const { id, event_name,occasion_name } = body;

    if (event_name !== undefined && !event_name.trim()) {
      throw Boom.badRequest("Event name cannot be empty");
    }

    const query = `
      UPDATE offline_eventlist
      SET
        event_name = COALESCE($2, event_name),
        occasion_name = coalesce($2,occasion_name)
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND is_deleted = FALSE
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [id, event_name?.trim(),occasion_name?.trim()]);

    if (!rows.length) {
      throw Boom.notFound("Event not found");
    }

    return rows[0];
  } catch (err) {
    console.log("update offline event error ❌", err);
    throw err.isBoom ? err : Boom.badRequest(err.message);
  }
};

export const deleteOfflineEventById = async (id) => {
  try {
    const query = `
      UPDATE offline_eventlist
      SET
        is_deleted = TRUE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND is_deleted = FALSE
      RETURNING id;
    `;

    const { rows } = await pool.query(query, [id]);

    if (!rows.length) {
      throw Boom.notFound("Event not found or already deleted");
    }

    return { message: "Event deleted successfully" };
  } catch (err) {
    console.log("delete offline event error ❌", err);
    throw err.isBoom ? err : Boom.badRequest(err.message);
  }
};

export const listOfflineEvents = async (queryParams,userid) => {
  try {
    const { search, page = 1, limit = 10 } = queryParams;

    const offset = (page - 1) * limit;

    let whereClause = `WHERE is_deleted = FALSE`;
    let values = [];
    let idx = 1;

    if (search) {
      whereClause += ` AND event_name ILIKE $${idx}`;
      values.push(`%${search}%`);
      idx++;
    }

    const dataQuery = `
      SELECT *
      FROM offline_eventlist
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;

    values.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*)
      FROM offline_eventlist
      ${whereClause};
    `;

    const [{ rows }, countResult] = await Promise.all([
      pool.query(dataQuery, values),
      pool.query(countQuery, values.slice(0, idx - 1)),
    ]);

    const { rows: listByUser } = await pool.query(
      `
      select event_name from offline_event where created_by=$1
      `,
      [userid]
    );
    let formatedRows = rows.map((d) =>({event_name: d.event_name , id:d.id}));
    let formatedData = listByUser.map((d) => ({event_name: d.event_name,id:null}));
    return {
      data: [...formatedRows, ...formatedData],
      page: Number(page),
      limit: Number(limit),
      total: Number(countResult.rows[0].count),
    };
  } catch (err) {
    console.log("list offline events error ❌", err);
    throw Boom.badRequest(err.message);
  }
};

export const listOfflineEventsMob = async (queryParams) => {
  try {
    const { search, page = 1, limit = 10,userid } = queryParams;

    const offset = (page - 1) * limit;

    let whereClause = `WHERE is_deleted = FALSE`;
    let values = [];
    let idx = 1;

    if (search) {
      whereClause += ` AND event_name ILIKE $${idx}`;
      values.push(`%${search}%`);
      idx++;
    }

    const dataQuery = `
      SELECT *
      FROM offline_eventlist
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;

    values.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*)
      FROM offline_eventlist
      ${whereClause};
    `;

    const [{ rows }, countResult] = await Promise.all([
      pool.query(dataQuery, values),
      pool.query(countQuery, values.slice(0, idx - 1)),
    ]);

    const { rows: listByUser } = await pool.query(
      `
      select event_name from offline_event where created_by=$1
      `,
      [userid]
    );
    let formatedRows = rows.map((d) =>({event_name: d.event_name , id:d.id}));
    let formatedData = listByUser.map((d) => ({event_name: d.event_name,id:null}));
    return {
      data: [...formatedRows, ...formatedData],
      page: Number(page),
      limit: Number(limit),
      total: Number(countResult.rows[0].count),
    };
  } catch (err) {
    console.log("list offline events error ❌", err);
    throw Boom.badRequest(err.message);
  }
};

export const createOfflineOccasion = async (body) => {
  try {
    const { occasion_name } = body;

    if (!occasion_name?.trim()) {
      throw Boom.badRequest("Occasion name is required");
    }

    const query = `
      INSERT INTO offline_occasion (occasion_name)
      VALUES ($1)
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [occasion_name.trim()]);
    return rows[0];
  } catch (err) {
    console.log("create offline occasion error ❌", err);
    throw err.isBoom ? err : Boom.badRequest(err.message);
  }
};

export const updateOfflineOccasionById = async (body) => {
  try {
    const { id, occasion_name,is_deleted } = body;

    if (!id) {
      throw Boom.badRequest("Occasion id is required");
    }

    if (occasion_name !== undefined && !occasion_name.trim()) {
      throw Boom.badRequest("Occasion name cannot be empty");
    }

    const query = `
      UPDATE offline_occasion
      SET
        occasion_name = COALESCE($2, occasion_name),
        is_deleted =  COALESCE($3, is_deleted),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        -- AND is_deleted = FALSE
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [id, occasion_name?.trim(),is_deleted]);

    if (!rows.length) {
      throw Boom.notFound("Occasion not found");
    }

    return rows[0];
  } catch (err) {
    console.log("update offline occasion error ❌", err);
    throw err.isBoom ? err : Boom.badRequest(err.message);
  }
};

export const deleteOfflineOccasionById = async (id) => {
  try {
    if (!id) {
      throw Boom.badRequest("Occasion id is required");
    }

    const query = `
      UPDATE offline_occasion
      SET
        is_deleted = TRUE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND is_deleted = FALSE
      RETURNING id;
    `;

    const { rows } = await pool.query(query, [id]);

    if (!rows.length) {
      throw Boom.notFound("Occasion not found or already deleted");
    }

    return { message: "Occasion deleted successfully" };
  } catch (err) {
    console.log("delete offline occasion error ❌", err);
    throw err.isBoom ? err : Boom.badRequest(err.message);
  }
};

export const listOfflineOccasions = async (queryParams) => {
  try {
    const { search, page = 1, limit = 10 } = queryParams;

    const offset = (page - 1) * limit;

    let whereClause = `WHERE is_deleted = FALSE`;
    let values = [];
    let idx = 1;

    if (search) {
      whereClause += ` AND occasion_name ILIKE $${idx}`;
      values.push(`%${search}%`);
      idx++;
    }

    const dataQuery = `
      SELECT *
      FROM offline_occasion
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;

    values.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*)
      FROM offline_occasion
      ${whereClause};
    `;

    const [{ rows }, countResult] = await Promise.all([
      pool.query(dataQuery, values),
      pool.query(countQuery, values.slice(0, idx - 1))
    ]);

    return {
      data: rows,
      page: Number(page),
      limit: Number(limit),
      total: Number(countResult.rows[0].count)
    };
  } catch (err) {
    console.log("list offline occasions error ❌", err);
    throw Boom.badRequest(err.message);
  }
};

export const listOfflineOccasionsMob = async (queryParams) => {
  try {
    const { search, page = 1, limit = 10 } = queryParams;

    const offset = (page - 1) * limit;

    let whereClause = `WHERE is_deleted = FALSE`;
    let values = [];
    let idx = 1;

    if (search) {
      whereClause += ` AND occasion_name ILIKE $${idx}`;
      values.push(`%${search}%`);
      idx++;
    }

    const dataQuery = `
      SELECT *
      FROM offline_occasion
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;

    values.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*)
      FROM offline_occasion
      ${whereClause};
    `;

    const [{ rows }, countResult] = await Promise.all([
      pool.query(dataQuery, values),
      pool.query(countQuery, values.slice(0, idx - 1))
    ]);

    return {
      data: rows,
      page: Number(page),
      limit: Number(limit),
      total: Number(countResult.rows[0].count)
    };
  } catch (err) {
    console.log("list offline occasions error ❌", err);
    throw Boom.badRequest(err.message);
  }
};
