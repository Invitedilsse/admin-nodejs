import Boom from '@hapi/boom';
import { adminDb as adminDbPool } from "../../config/adminDb.js";
import {  existingPool as pool  } from '../../config/dbExisiting.js';

const ALLOWED_OPENAI_MODELS = ["gpt-4.1-nano", "gpt-4o-mini", "gpt-4.1-mini", "o1-mini", "o4-mini", "gpt-4.1", "gpt-4o", "gpt-4.5", "o1", "o3", "gpt-5"];
const ALLOWED_ANTHROPIC_MODELS = ["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "claude-opus-4-8"];
const ALLOWED_GEMINI_MODELS = ["gemini-flash-lite-latest", "gemini-2.5-flash-lite", "gemini-flash-latest", "gemini-2.5-flash"];
const ALLOWED_MODELS = [...ALLOWED_OPENAI_MODELS, ...ALLOWED_ANTHROPIC_MODELS, ...ALLOWED_GEMINI_MODELS];
const ALLOWED_COMPRESS_PX = [500, 1000, 1500, 2000, 2500];
const ALL_MODEL_INFO = [
  // ── OpenAI vision-capable models ──────────────────────────────
  { id: 'gpt-4.1-nano',              name: 'GPT-4.1 Nano',       provider: 'OpenAI',    inputPer1M: 0.10,   outputPer1M: 0.40,   note: 'Ultra cheap, basic extraction' },
  { id: 'gpt-4o-mini',               name: 'GPT-4o Mini',        provider: 'OpenAI',    inputPer1M: 0.15,   outputPer1M: 0.60,   note: 'Fast & affordable — recommended' },
  { id: 'gpt-4.1-mini',              name: 'GPT-4.1 Mini',       provider: 'OpenAI',    inputPer1M: 0.40,   outputPer1M: 1.60,   note: 'Good balance of speed and quality' },
  { id: 'o1-mini',                   name: 'o1-mini',            provider: 'OpenAI',    inputPer1M: 1.10,   outputPer1M: 4.40,   note: 'Compact reasoning model' },
  { id: 'o4-mini',                   name: 'o4-mini',            provider: 'OpenAI',    inputPer1M: 1.10,   outputPer1M: 4.40,   note: 'Fast reasoning — good for complex layouts' },
  { id: 'gpt-4.1',                   name: 'GPT-4.1',            provider: 'OpenAI',    inputPer1M: 2.00,   outputPer1M: 8.00,   note: 'High quality extraction' },
  { id: 'gpt-4o',                    name: 'GPT-4o',             provider: 'OpenAI',    inputPer1M: 2.50,   outputPer1M: 10.00,  note: 'High accuracy, proven model' },
  { id: 'gpt-5',                     name: 'GPT-5',              provider: 'OpenAI',    inputPer1M: 2.50,   outputPer1M: 10.00,  note: 'Latest OpenAI flagship — 2025' },
  { id: 'o1',                        name: 'o1',                 provider: 'OpenAI',    inputPer1M: 15.00,  outputPer1M: 60.00,  note: 'Advanced reasoning model' },
  { id: 'o3',                        name: 'o3',                 provider: 'OpenAI',    inputPer1M: 10.00,  outputPer1M: 40.00,  note: 'Deep reasoning — slowest & most expensive' },
  { id: 'gpt-4.5',                   name: 'GPT-4.5',            provider: 'OpenAI',    inputPer1M: 75.00,  outputPer1M: 150.00, note: 'Research preview — very expensive' },
  // ── Anthropic vision-capable models ───────────────────────────
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5',   provider: 'Anthropic', inputPer1M: 0.80,   outputPer1M: 4.00,   note: 'Fast Anthropic — needs credits' },
  { id: 'claude-sonnet-4-6',         name: 'Claude Sonnet 4.6',  provider: 'Anthropic', inputPer1M: 3.00,   outputPer1M: 15.00,  note: 'Best quality/speed balance — needs credits' },
  { id: 'claude-opus-4-8',           name: 'Claude Opus 4.8',    provider: 'Anthropic', inputPer1M: 15.00,  outputPer1M: 75.00,  note: 'Premium Anthropic — needs credits' },
  // Google Gemini — needs GEMINI_API_KEY in the backend env
  { id: 'gemini-flash-lite-latest',  name: 'Gemini Flash-Lite (latest)', provider: 'Google', inputPer1M: 0.10, outputPer1M: 0.40, note: 'Cheapest, auto-updates — recommended' },
  { id: 'gemini-2.5-flash-lite',     name: 'Gemini 2.5 Flash-Lite',      provider: 'Google', inputPer1M: 0.10, outputPer1M: 0.40, note: 'Cheap, pinned version' },
  { id: 'gemini-flash-latest',       name: 'Gemini Flash (latest)',      provider: 'Google', inputPer1M: 0.30, outputPer1M: 2.50, note: 'Stronger flash, auto-updates' },
  { id: 'gemini-2.5-flash',          name: 'Gemini 2.5 Flash',           provider: 'Google', inputPer1M: 0.30, outputPer1M: 2.50, note: 'Strong multilingual, pinned' },
];
const KEYWORD_FIELDS = ['occasion', 'host_name', 'venue', 'event_type', 'bride', 'groom'];


const findSuperUserorNot = async (user_id)=>{
        const { rows: roleDetail } = await adminDbPool.query(
    `SELECT role FROM users WHERE id = $1`,
    [user_id]
  );
  console.log("roleDetail",roleDetail)
  if (roleDetail.length === 0) {
    throw Boom.conflict("User Not Found");
  }
  if (roleDetail[0].role !== "super-admin"&&roleDetail[0].role !== "admin" && roleDetail[0].role !== "main") {
    throw Boom.forbidden("User Access Not Found");
  }
 return 
}

// export async function getOcrUsageLogsService(query,user_id) {
//   try {
// //     const { rows: roleDetail } = await pool.query(
// //     `SELECT role FROM users WHERE id = $1`,
// //     [user_id]
// //   );
// //   if (roleDetail.length === 0) {
// //     throw Boom.conflict("User Not Found");
// //   }
// //   if (roleDetail[0].role !== "super-admin"&&roleDetail[0].role !== "admin" ) {
// //     throw Boom.forbidden("User Access Not Found");
// //   }
 
// await findSuperUserorNot(user_id)

//   const page = parseInt(query.page || "1");
//   const limit = parseInt(query.limit || "25");
//   const offset = (page - 1) * limit;

//   const { rows } = await pool.query(
//     `SELECT
//         l.id, l.file_name, l.model, l.image_width, l.image_height,
//         l.prompt_tokens, l.completion_tokens,
//         COALESCE(l.cache_read_tokens, 0)     AS cache_read_tokens,
//         COALESCE(l.cache_creation_tokens, 0) AS cache_creation_tokens,
//         l.total_tokens,
//         l.cost_usd, l.cost_inr,
//         l.raw_result,
//         l.created_at,
//         u.name AS uploaded_by_name, u.mobile AS uploaded_by_mobile
//      FROM ocr_usage_logs l
//      LEFT JOIN users u ON u.id = l.user_id
//      ORDER BY l.created_at DESC
//      LIMIT $1 OFFSET $2`,
//     [limit, offset]
//   );

//   const { rows: countRows } = await pool.query(
//     `SELECT COUNT(*),
//             SUM(prompt_tokens)             AS total_prompt_tokens,
//             SUM(completion_tokens)         AS total_completion_tokens,
//             SUM(COALESCE(cache_read_tokens,0))     AS total_cache_read_tokens,
//             SUM(COALESCE(cache_creation_tokens,0)) AS total_cache_creation_tokens,
//             SUM(total_tokens)              AS total_all_tokens,
//             SUM(cost_usd)                  AS total_cost_usd,
//             SUM(cost_inr)                  AS total_cost_inr
//      FROM ocr_usage_logs`
//   );
//   const totals = countRows[0];

//   return {
//     status: true,
//     data: rows,
//     page,
//     limit,
//     total: Number(totals.count),
//     summary: {
//       totalPromptTokens:        Number(totals.total_prompt_tokens        || 0),
//       totalCompletionTokens:    Number(totals.total_completion_tokens    || 0),
//       totalCacheReadTokens:     Number(totals.total_cache_read_tokens    || 0),
//       totalCacheCreationTokens: Number(totals.total_cache_creation_tokens || 0),
//       totalTokens:              Number(totals.total_all_tokens           || 0),
//       totalCostUsd:             Number(totals.total_cost_usd             || 0),
//       totalCostInr:             Number(totals.total_cost_inr             || 0),
//     },
//   };
//   } catch (error) {
//     console.error("Error ocr usage log service:", error.message);
//     throw Boom.badRequest(error.message) ;
//   } 
// }

export async function getOcrUsageLogsService(query, user_id) {
  try {
    await findSuperUserorNot(user_id)

    const page = parseInt(query.page || "1")
    const limit = parseInt(query.limit || "25") // paginates USERS now, not raw rows

    const { mobile, fromDate, toDate, fromMonth, toMonth } = query
    // exact date wins over month if both given
    const effectiveFrom = fromDate || (fromMonth ? `${fromMonth}-01` : null)

    const conditions = []
    const params = []
    let idx = 1

    if (mobile) {
      conditions.push(`u.mobile ILIKE $${idx}`)
      params.push(`%${mobile}%`)
      idx++
    }
    if (effectiveFrom) {
      conditions.push(`l.created_at >= $${idx}::date`)
      params.push(effectiveFrom)
      idx++
    }
    if (toDate) {
      conditions.push(`l.created_at < ($${idx}::date + interval '1 day')`) // inclusive of whole toDate
      params.push(toDate)
      idx++
    } else if (toMonth) {
      conditions.push(`l.created_at < (date_trunc('month', $${idx}::date) + interval '1 month')`)
      params.push(`${toMonth}-01`)
      idx++
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""

    // 1) Global totals for the top summary cards (scoped to current filters)
    const { rows: summaryRows } = await pool.query(
      `SELECT COUNT(*) AS request_count,
              COUNT(DISTINCT l.user_id)                AS user_count,
              SUM(l.prompt_tokens)                     AS total_prompt_tokens,
              SUM(l.completion_tokens)                 AS total_completion_tokens,
              SUM(COALESCE(l.cache_read_tokens,0))     AS total_cache_read_tokens,
              SUM(COALESCE(l.cache_creation_tokens,0)) AS total_cache_creation_tokens,
              SUM(l.total_tokens)                      AS total_all_tokens,
              SUM(l.cost_usd)                          AS total_cost_usd,
              SUM(l.cost_inr)                          AS total_cost_inr
       FROM ocr_usage_logs l
       LEFT JOIN users u ON u.id = l.user_id
       ${whereClause}`,
      params
    )
    const totals = summaryRows[0]

    // 2) Distinct user count -> drives pagination of the grouped table
    const { rows: userCountRows } = await pool.query(
      `SELECT COUNT(*) FROM (
         SELECT u.id FROM ocr_usage_logs l
         LEFT JOIN users u ON u.id = l.user_id
         ${whereClause}
         GROUP BY u.id
       ) t`,
      params
    )
    const totalUsers = Number(userCountRows[0].count)

    // 3) One page of user groups, heaviest usage first
    const { rows: userGroups } = await pool.query(
      `SELECT u.id AS user_id, u.name AS uploaded_by_name, u.mobile AS uploaded_by_mobile,
              COUNT(l.id)                              AS request_count,
              SUM(l.prompt_tokens)                     AS prompt_tokens,
              SUM(l.completion_tokens)                 AS completion_tokens,
              SUM(COALESCE(l.cache_read_tokens,0))     AS cache_read_tokens,
              SUM(COALESCE(l.cache_creation_tokens,0)) AS cache_creation_tokens,
              SUM(l.total_tokens)                      AS total_tokens,
              SUM(l.cost_usd)                          AS cost_usd,
              SUM(l.cost_inr)                          AS cost_inr
       FROM ocr_usage_logs l
       LEFT JOIN users u ON u.id = l.user_id
       ${whereClause}
       GROUP BY u.id, u.name, u.mobile
       ORDER BY SUM(l.total_tokens) DESC NULLS LAST
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, (page - 1) * limit]
    )

    // 4) Individual entries for exactly these users, same filters, bucketed in JS
    const userIds = userGroups.map(g => g.user_id).filter(Boolean)
    let logsByUser = {}
    if (userIds.length) {
      const logConditions = [...conditions, `l.user_id = ANY($${params.length + 1})`]
      const { rows: logRows } = await pool.query(
        `SELECT l.id, l.file_name, l.model, l.image_width, l.image_height,
                l.prompt_tokens, l.completion_tokens,
                COALESCE(l.cache_read_tokens, 0)     AS cache_read_tokens,
                COALESCE(l.cache_creation_tokens, 0) AS cache_creation_tokens,
                l.total_tokens, l.cost_usd, l.cost_inr, l.raw_result, l.created_at, l.user_id
         FROM ocr_usage_logs l
         LEFT JOIN users u ON u.id = l.user_id
         WHERE ${logConditions.join(" AND ")}
         ORDER BY l.created_at DESC`,
        [...params, userIds]
      )
      logsByUser = logRows.reduce((acc, row) => {
        (acc[row.user_id] ||= []).push(row)
        return acc
      }, {})
    }

    const data = userGroups.map(g => ({
      user_id: g.user_id,
      uploaded_by_name: g.uploaded_by_name,
      uploaded_by_mobile: g.uploaded_by_mobile,
      request_count: Number(g.request_count),
      prompt_tokens: Number(g.prompt_tokens || 0),
      completion_tokens: Number(g.completion_tokens || 0),
      cache_read_tokens: Number(g.cache_read_tokens || 0),
      cache_creation_tokens: Number(g.cache_creation_tokens || 0),
      total_tokens: Number(g.total_tokens || 0),
      cost_usd: Number(g.cost_usd || 0),
      cost_inr: Number(g.cost_inr || 0),
      logs: logsByUser[g.user_id] || [],
    }))

    return {
      status: true,
      data,
      page,
      limit,
      total: totalUsers,
      summary: {
        requestCount:             Number(totals.request_count || 0),
        userCount:                Number(totals.user_count || 0),
        totalPromptTokens:        Number(totals.total_prompt_tokens || 0),
        totalCompletionTokens:    Number(totals.total_completion_tokens || 0),
        totalCacheReadTokens:     Number(totals.total_cache_read_tokens || 0),
        totalCacheCreationTokens: Number(totals.total_cache_creation_tokens || 0),
        totalTokens:              Number(totals.total_all_tokens || 0),
        totalCostUsd:             Number(totals.total_cost_usd || 0),
        totalCostInr:             Number(totals.total_cost_inr || 0),
      },
    }
  } catch (error) {
    console.error("Error ocr usage log service:", error.message)
    throw Boom.badRequest(error.message)
  }
}
export const getOcrUserQuotaListService = async (query, user_id) => {
await findSuperUserorNot(user_id)


  const { rows } = await pool.query(`
    SELECT
      u.id, u.name, u.last_name, u.mobile, u.email,
      u.created_at AS registered_at,
      COALESCE(q.attempts_used, 0)    AS attempts_used,
      COALESCE(q.attempts_allowed, 50) AS attempts_allowed,
      q.updated_at AS quota_updated_at,
      q.custom_plan,q.custom_color
    FROM users u
    LEFT JOIN ocr_user_quota q ON u.id = q.user_id
    WHERE u.is_delete = false
    ORDER BY COALESCE(q.attempts_used, 0) DESC, u.created_at DESC
  `);
  return rows;
};

// export const updateUserOcrQuotaService = async (params, body, user_id) => {
//   const { userId } = params;
//   const { addAttempts, setAllowed } = body;

//    await findSuperUserorNot(user_id)

//   if (addAttempts != null) {
//     await pool.query(`
//       INSERT INTO ocr_user_quota (user_id, attempts_used, attempts_allowed)
//       VALUES ($1, 0, 5 + $2)
//       ON CONFLICT (user_id) DO UPDATE
//         SET attempts_allowed = ocr_user_quota.attempts_allowed + $2, updated_at = NOW()
//     `, [userId, parseInt(addAttempts)]);
//   } else if (setAllowed != null) {
//     await pool.query(`
//       INSERT INTO ocr_user_quota (user_id, attempts_used, attempts_allowed)
//       VALUES ($1, 0, $2)
//       ON CONFLICT (user_id) DO UPDATE
//         SET attempts_allowed = $2, updated_at = NOW()
//     `, [userId, parseInt(setAllowed)]);
//   } else {
//     throw Boom.badRequest("Provide addAttempts or setAllowed");
//   }

//   const { rows } = await pool.query(
//     `SELECT attempts_used, attempts_allowed FROM ocr_user_quota WHERE user_id = $1`, [userId]
//   );
//   return { success: true, ...rows[0] };
// };

// Increases (or sets) a user's attempts_allowed and records every change in
// attempt_added_history. refreshed_attempts is reset to 0 on every change.
// new_allowed in the history row always equals the resulting attempts_allowed.
export const updateUserOcrQuotaService = async (params, body, user_id) => {
  const { userId } = params;
  const { addAttempts, setAllowed,custom_plan,custom_color } = body;

  await findSuperUserorNot(user_id);

  if (addAttempts == null && setAllowed == null) {
    throw Boom.badRequest("Provide addAttempts or setAllowed");
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the row (if any) so concurrent quota updates for the same user
    // can't race each other while we compute the new totals.
    const { rows: existingRows } = await client.query(
      `SELECT attempts_used, attempts_allowed, refreshed_attempts,remaining_attempt,custom_color
       FROM ocr_user_quota WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );
    const rowExists = existingRows.length > 0;
    const previousAllowed = rowExists ? Number(existingRows[0].attempts_allowed) : 0;

    let newAllowed;
    let attemptsAdded;

    if (addAttempts != null) {
      const addValue = parseInt(addAttempts);
      if (!Number.isFinite(addValue) || addValue < 0) {
        throw Boom.badRequest("addAttempts must be a positive number");
      }

      // attempts_allowed always increases by addValue on top of whatever it
      // currently is (0 if the user has no row yet).
      newAllowed = previousAllowed + addValue;

      if (rowExists) {
        let  incRemaining = existingRows[0].attempts_allowed + addValue
        let remainingAttempts = incRemaining - existingRows[0].attempts_used
        await client.query(
          `UPDATE ocr_user_quota
              SET attempts_allowed = $2,
                  refreshed_attempts = 0,
                  remaining_attempt =  $3,
                  custom_plan = COALESCE($4, ocr_user_quota.custom_plan),
                  custom_color = COALESCE($5,ocr_user_quota.custom_color),
                  updated_at = NOW()
            WHERE user_id = $1`,
          [userId, newAllowed,remainingAttempts,custom_plan,custom_color]
        );
      } else {
        await client.query(
          `INSERT INTO ocr_user_quota (user_id, attempts_used, attempts_allowed, refreshed_attempts,remaining_attempt)
           VALUES ($1, 0, $2, 0,$2)`,
          [userId, newAllowed]
        );
      }
      attemptsAdded = addValue;
    } else {
      // const setValue = parseInt(setAllowed);
      // if (!Number.isFinite(setValue) || setValue < 0) {
      //   throw Boom.badRequest("setAllowed must be a non-negative number");
      // }

      // newAllowed = setValue;
      // if (rowExists) {
      //   await client.query(
      //     `UPDATE ocr_user_quota
      //         SET attempts_allowed = $2,
      //             refreshed_attempts = 0,
      //             updated_at = NOW()
      //       WHERE user_id = $1`,
      //     [userId, newAllowed]
      //   );
      // } else {
      //   await client.query(
      //     `INSERT INTO ocr_user_quota (user_id, attempts_used, attempts_allowed, refreshed_attempts)
      //      VALUES ($1, 0, $2, 0)`,
      //     [userId, newAllowed]
      //   );
      // }
      // // setAllowed only counts as an "addition" worth logging if it actually
      // // raised the ceiling; lowering or leaving it unchanged is not.
      // attemptsAdded = newAllowed - previousAllowed;
    }

    if (attemptsAdded > 0) {
      await client.query(
        `INSERT INTO attempt_added_history
           (user_id, previous_allowed, new_allowed, attempts_added, added_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, previousAllowed, newAllowed, attemptsAdded, user_id]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const { rows } = await pool.query(
    `SELECT attempts_used, attempts_allowed, refreshed_attempts
     FROM ocr_user_quota WHERE user_id = $1`,
    [userId]
  );
  return { success: true, ...rows[0] };
};

// Retrieves the audit trail of every attempts_allowed increase, optionally
// filtered to a single user and/or a date range. Paginated like the other
// admin listing endpoints in this file.
export const getOcrQuotaHistoryService = async (query, user_id) => {
  await findSuperUserorNot(user_id);

  const page = parseInt(query.page || "1");
  const limit = parseInt(query.limit || "25");
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];
  let idx = 1;

  if (query.userId) {
    conditions.push(`h.user_id = $${idx}`);
    params.push(query.userId);
    idx++;
  }
  if (query.fromDate) {
    conditions.push(`h.created_at >= $${idx}::date`);
    params.push(query.fromDate);
    idx++;
  }
  if (query.toDate) {
    conditions.push(`h.created_at < ($${idx}::date + interval '1 day')`);
    params.push(query.toDate);
    idx++;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows } = await pool.query(
    `SELECT
        h.id, h.user_id, h.previous_allowed, h.new_allowed, h.attempts_added,
        h.added_by, h.created_at,
        u.name AS user_name, u.mobile AS user_mobile,
        a.name AS added_by_name
     FROM attempt_added_history h
     LEFT JOIN users u ON u.id = h.user_id
     LEFT JOIN users a ON a.id = h.added_by
     ${whereClause}
     ORDER BY h.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FROM attempt_added_history h ${whereClause}`,
    params
  );

  return {
    status: true,
    data: rows,
    page,
    limit,
    total: Number(countRows[0].count),
  };
};


export const getOcrModelConfigservice = async (query, user_id) => {
  await findSuperUserorNot(user_id)
  const activeModel = await getActiveModel();
  return { activeModel, models: ALL_MODEL_INFO };
};


async function getActiveModel() {
  const { rows } = await pool.query(
    `SELECT value FROM ocr_settings WHERE key = 'active_model'`
  );
  return rows[0]?.value || 'gpt-4o-mini';
}

export const setOcrModelConfigApiservice = async (body, user_id) => {
  await findSuperUserorNot(user_id)
  const { model } = body;
  if (!model || !ALLOWED_MODELS.includes(model)) {
    throw Boom.badRequest(`Invalid model. Allowed: ${ALLOWED_MODELS.join(', ')}`);
  }
  const active = await setActiveModel(model);
  return { success: true, activeModel: active };
};

async function setActiveModel(model) {
  const safe = ALLOWED_MODELS.includes(model) ? model : 'gpt-4o-mini';
  await pool.query(
    `INSERT INTO ocr_settings (key, value, updated_at)
     VALUES ('active_model', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [safe]
  );
  return safe;
}


export const getRawPageSettingService = async (query, user_id) => {
    await findSuperUserorNot(user_id)
  const enabled = await isSaveRawPagesEnabled();
  return { saveRawPages: enabled };
};

export const setRawPageSettingService = async (body, user_id) => {
    await findSuperUserorNot(user_id)

  const enabled = !!body.saveRawPages;
  await setSaveRawPages(enabled);
  return { saveRawPages: enabled };
};

async function isSaveRawPagesEnabled() {
  const { rows } = await pool.query(`SELECT value FROM ocr_settings WHERE key = 'save_raw_pages'`);
  return rows[0]?.value === 'true';
}

async function setSaveRawPages(enabled) {
  await pool.query(
    `INSERT INTO ocr_settings (key, value, updated_at) VALUES ('save_raw_pages', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [enabled ? 'true' : 'false']
  );
}

export const getRawPageDataService = async (query, user_id) => {
    await findSuperUserorNot(user_id)
  const limit = Math.min(parseInt(query.limit) || 20, 100);
  const offset = parseInt(query.offset) || 0;
  const search = (query.search || '').trim();
  const searchParam = search ? `%${search}%` : null;
  const { rows } = await pool.query(
    `SELECT r.id, r.user_id, r.session_id, r.file_name, r.page_index, r.raw_ai_json,
            r.model, r.cost_usd, r.total_tokens, r.created_at,
            u.name as user_name, u.mobile as user_mobile
     FROM ocr_raw_page_data r
     LEFT JOIN users u ON u.id = r.user_id
     ${searchParam ? "WHERE r.file_name ILIKE $3 OR u.name ILIKE $3" : ""}
     ORDER BY r.created_at DESC
     LIMIT $1 OFFSET $2`,
    searchParam ? [limit, offset, searchParam] : [limit, offset]
  );
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FROM ocr_raw_page_data r LEFT JOIN users u ON u.id = r.user_id ${searchParam ? "WHERE r.file_name ILIKE $1 OR u.name ILIKE $1" : ""}`,
    searchParam ? [searchParam] : []
  );
  return { total: parseInt(countRows[0].count), data: rows };
};



export const getCompressSettingService = async (query, user_id) => {
  await findSuperUserorNot(user_id)
  const enabled = await isCompressEnabled();
  const maxPx = await getCompressMaxPx();
  return { compressImages: enabled, compressMaxPx: maxPx, allowedPx: ALLOWED_COMPRESS_PX };
};

export const setCompressSettingService = async (body, user_id) => {
  await findSuperUserorNot(user_id)

  const result = {};
  // Only touch each setting if the client actually sent it (allows partial updates)
  if (typeof body.compressImages !== 'undefined') {
    result.compressImages = body.compressImages !== false;
    await setCompressImages(result.compressImages);
  } else {
    result.compressImages = await isCompressEnabled();
  }
  if (typeof body.compressMaxPx !== 'undefined') {
    result.compressMaxPx = await setCompressMaxPx(body.compressMaxPx);
  } else {
    result.compressMaxPx = await getCompressMaxPx();
  }
  result.allowedPx = ALLOWED_COMPRESS_PX;
  return result;
};

async function isCompressEnabled() {
  const { rows } = await pool.query(`SELECT value FROM ocr_settings WHERE key = 'compress_images'`);
  return rows[0]?.value !== 'false'; // default true
}


async function getCompressMaxPx() {
  const { rows } = await pool.query(`SELECT value FROM ocr_settings WHERE key = 'compress_max_px'`);
  const px = parseInt(rows[0]?.value);
  return ALLOWED_COMPRESS_PX.includes(px) ? px : 1500; // default 1500
}


async function setCompressImages(enabled) {
  await pool.query(
    `INSERT INTO ocr_settings (key, value, updated_at) VALUES ('compress_images', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [enabled ? 'true' : 'false']
  );
}

async function setCompressMaxPx(px) {
  const safe = ALLOWED_COMPRESS_PX.includes(Number(px)) ? Number(px) : 1500;
  await pool.query(
    `INSERT INTO ocr_settings (key, value, updated_at) VALUES ('compress_max_px', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [String(safe)]
  );
  return safe;
}

export const getFuzzyThresholdSettingService = async (query, user_id) => {
   await findSuperUserorNot(user_id)
  return { fuzzyThreshold: await getFuzzyThreshold() };
};

export const setFuzzyThresholdSettingService = async (body, user_id) => {
    await findSuperUserorNot(user_id)

  const t = await setFuzzyThreshold(body.fuzzyThreshold);
  _etCache = null; // not strictly needed, but keeps related caches fresh
  return { fuzzyThreshold: t };
};

async function getFuzzyThreshold() {
  const { rows } = await pool.query(`SELECT value FROM ocr_settings WHERE key = 'fuzzy_threshold'`);
  const t = parseFloat(rows[0]?.value);
  return (!isNaN(t) && t >= 0 && t <= 1) ? t : 0.40; // default 0.40
}

async function setFuzzyThreshold(t) {
  let val = parseFloat(t);
  if (isNaN(val) || val < 0 || val > 1) val = 0.40;
  val = Math.round(val * 100) / 100; // keep 2 decimals
  await pool.query(
    `INSERT INTO ocr_settings (key, value, updated_at) VALUES ('fuzzy_threshold', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [String(val)]
  );
  return val;
}

export const getOcrKeywordsService = async (query, user) => {
  const { rows } = await pool.query(
    `SELECT id, field_name, keyword, type, created_at FROM ocr_keywords ORDER BY field_name, type, keyword`
  );
  const grouped = {};
  for (const field of KEYWORD_FIELDS) grouped[field] = { match: [], ignore: [] };
  for (const row of rows) {
    if (!grouped[row.field_name]) grouped[row.field_name] = { match: [], ignore: [] };
    grouped[row.field_name][row.type].push({ id: row.id, keyword: row.keyword });
  }
  return { status: true, fields: KEYWORD_FIELDS, keywords: grouped };
};

export const addOcrKeywordService = async (body, user) => {
  const { field_name, keyword, type } = body;
  console.log('[OCR-KEYWORDS] addOcrKeyword called:', { field_name, keyword, type, user_id: user?.id });
  if (!KEYWORD_FIELDS.includes(field_name)) throw Boom.badRequest(`Invalid field_name: ${field_name}. Allowed: ${KEYWORD_FIELDS.join(', ')}`);
  if (!['match', 'ignore'].includes(type)) throw Boom.badRequest('type must be match or ignore');
  if (!keyword || !keyword.trim()) throw Boom.badRequest('keyword is required');
  const res = await pool.query(
    `INSERT INTO ocr_keywords (field_name, keyword, type) VALUES ($1, $2, $3) ON CONFLICT (field_name, keyword, type) DO NOTHING RETURNING id`,
    [field_name, keyword.trim(), type]
  );
  const inserted = res.rowCount > 0;
  console.log('[OCR-KEYWORDS] insert result: rowCount=', res.rowCount, 'inserted=', inserted);
  return { status: true, inserted };
};

export const deleteOcrKeywordService = async (params, user) => {
  await pool.query(`DELETE FROM ocr_keywords WHERE id = $1`, [params.id]);
  return { status: true };
};

export const getEventTypesService = async (query, user) => {
  const { rows } = await pool.query(
    `SELECT id, name FROM ocr_event_types ORDER BY name`
  );
  return { status: true, eventTypes: rows, total: rows.length };
};

export const addEventTypeService = async (body, user) => {
  const { name } = body;
  if (!name || !name.trim()) throw Boom.badRequest('name is required');
  const res = await pool.query(
    `INSERT INTO ocr_event_types (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id`,
    [name.trim()]
  );
  _etCache = null; // invalidate cache
  return { status: true, inserted: res.rowCount > 0 };
};

export const deleteEventTypeService = async (params, user) => {
  await pool.query(`DELETE FROM ocr_event_types WHERE id = $1`, [params.id]);
  _etCache = null; // invalidate cache
  return { status: true };
};


export const getTypeMatchesService = async (query, user_id) => {
  await findSuperUserorNot(user_id)

  const exportAll = query.all === 'true' || query.all === true;
  const limit = exportAll ? 50000 : Math.min(parseInt(query.limit) || 50, 200);
  const offset = exportAll ? 0 : (parseInt(query.offset) || 0);
  const search = (query.search || '').trim();
  const onlyChanged = query.changed === 'true' || query.changed === true;

  const conds = [];
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    conds.push(`(t.raw_type ILIKE $${params.length} OR t.matched_type ILIKE $${params.length} OR t.top_candidate ILIKE $${params.length})`);
  }
  if (onlyChanged) conds.push(`t.changed = true`);
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT t.id, t.file_name, t.raw_type, t.matched_type, t.top_candidate,
            t.score, t.changed, t.threshold, t.created_at, u.name AS user_name
     FROM ocr_type_matches t
     LEFT JOIN users u ON u.id = t.user_id
     ${where}
     ORDER BY t.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const { rows: cnt } = await pool.query(`SELECT COUNT(*) FROM ocr_type_matches t ${where}`, params);
  const { rows: summ } = await pool.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE changed)::int AS changed_count,
            COUNT(*) FILTER (WHERE NOT changed)::int AS kept_count,
            COUNT(*) FILTER (WHERE score >= 0.999)::int AS exact_count,
            COUNT(*) FILTER (WHERE changed AND score < 0.6)::int AS risky_count
     FROM ocr_type_matches`
  );
  return { status: true, data: rows, total: Number(cnt[0].count), summary: summ[0] };
};

export const clearTypeMatchesService = async (user_id) => {
    await findSuperUserorNot(user_id)
  await pool.query(`TRUNCATE ocr_type_matches`);
  return { status: true };
};

export const getNewVenues = async (query, user_id) => {
    await findSuperUserorNot(user_id)

  const search = (query.search || '').trim();
  const params = [];
  let where = '';
  if (search) { params.push(`%${search}%`); where = `WHERE venue_name ILIKE $1`; }
  const { rows } = await pool.query(
    `SELECT id, venue_name, source_file, lat, long, created_at
     FROM ocr_new_venues ${where}
     ORDER BY created_at DESC`,
    params
  );
  return { status: true, data: rows, total: rows.length };
};

// Export selected new venues into offline_maptemplate (the master list),
// geocoding each via Google Maps, then remove them from the new-venues queue.
export const exportNewVenues = async (body, user_id) => {
    await findSuperUserorNot(user_id)

  const ids = Array.isArray(body.ids) ? body.ids : [];
  if (!ids.length) throw Boom.badRequest('No venues selected');

  const { rows: venues } = await pool.query(
    `SELECT id, venue_name FROM ocr_new_venues WHERE id = ANY($1::uuid[])`,
    [ids]
  );

  const results = [];
  for (const v of venues) {
    let lat = '', lng = '', geocoded = false;
    try {
      const loc = await fetchVenueLocation({ venueName: v.venue_name });
      if (loc && loc.lat != null && loc.lng != null) {
        lat = String(loc.lat); lng = String(loc.lng); geocoded = true;
      }
    } catch (e) {
      console.error('export geocode error:', e.message);
    }

    // Avoid duplicating an existing master entry
    const { rows: exists } = await pool.query(
      `SELECT 1 FROM offline_maptemplate WHERE lower(location_title) = lower($1) LIMIT 1`,
      [v.venue_name]
    );
    if (!exists.length) {
      await pool.query(
        `INSERT INTO offline_maptemplate (location_title, group_type, lat, long)
         VALUES ($1, 'AI Extracted', $2, $3)`,
        [v.venue_name, lat, lng]
      );
    }
    // Remove from the queue (exported → must not reappear)
    await pool.query(`DELETE FROM ocr_new_venues WHERE id = $1`, [v.id]);
    results.push({ id: v.id, venue_name: v.venue_name, geocoded });
  }

  return {
    status: true,
    exported: results.length,
    geocodeFailed: results.filter(r => !r.geocoded).map(r => r.venue_name),
    results,
  };
};


export const getOcrLeaderboard = async (query, user_id) => {
    await findSuperUserorNot(user_id)


  const { provider, from_date, to_date } = query;

  const conditions = [];
  const params = [];

  if (provider && (provider === 'OpenAI' || provider === 'Anthropic')) {
    const ids = ALL_MODEL_INFO.filter(m => m.provider === provider).map(m => m.id);
    conditions.push(`r.model = ANY($${params.length + 1})`);
    params.push(ids);
  }
  if (from_date) {
    conditions.push(`r.created_at >= $${params.length + 1}`);
    params.push(from_date);
  }
  if (to_date) {
    conditions.push(`r.created_at <= $${params.length + 1}::date + interval '1 day'`);
    params.push(to_date);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(`
    SELECT
      r.model,
      COUNT(r.id)::int                                         AS test_count,
      ROUND(AVG(r.score)::numeric, 2)                         AS avg_score,
      ROUND(AVG(l.cost_usd)::numeric, 6)                      AS avg_cost_usd,
      ROUND(AVG(l.total_tokens)::numeric, 0)                  AS avg_tokens,
      ROUND(AVG(l.prompt_tokens)::numeric, 0)                 AS avg_prompt_tokens,
      ROUND(AVG(l.completion_tokens)::numeric, 0)             AS avg_completion_tokens,
      SUM(l.cost_usd)::numeric                                AS total_cost_usd,
      MAX(r.score)::int                                        AS best_score,
      MIN(r.score)::int                                        AS worst_score,
      ROUND(AVG(r.duration_ms)::numeric, 0)::int              AS avg_duration_ms,
      MIN(r.duration_ms)::int                                  AS best_duration_ms
    FROM ocr_model_reviews r
    LEFT JOIN ocr_usage_logs l ON l.id = r.ocr_log_id
    ${where}
    GROUP BY r.model
    ORDER BY avg_score DESC NULLS LAST, test_count DESC
  `, params);

  // Enrich with static model info
  const enriched = rows.map(row => {
    const info = ALL_MODEL_INFO.find(m => m.id === row.model) || {};
    return {
      ...row,
      name: info.name || row.model,
      provider: info.provider || 'Unknown',
      note: info.note || '',
      inputPer1M: info.inputPer1M || null,
      outputPer1M: info.outputPer1M || null,
    };
  });

  return { leaderboard: enriched };
};


export const getOcrMainPrompt = async ({promptKey = 'main_extraction_prompt'}) => {
  try {
    console.log(promptKey)
    const query = `
      SELECT id, prompt_key, prompt_text, updated_by, updated_at
      FROM ocr_main_promt
      WHERE prompt_key = $1
      LIMIT 1;
    `;
    const { rows } = await pool.query(query, [promptKey]);

    if (!rows.length) {
      throw Boom.notFound("Prompt not found");
    }

    return rows[0];
  } catch (err) {
    console.log("get ocr main prompt error ❌", err);
    throw Boom.badRequest(err.message);
  }
};

export const upsertOcrMainPrompt = async (body, userid) => {
  try {
     await findSuperUserorNot(userid)

    const { prompt_text, prompt_key = 'main_extraction_prompt' } = body;

    if (!prompt_text || !prompt_text.trim()) {
      throw Boom.badRequest("Prompt text is required");
    }

    const query = `
      INSERT INTO ocr_main_promt (prompt_key, prompt_text, updated_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (prompt_key)
      DO UPDATE SET
        prompt_text = EXCLUDED.prompt_text,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, prompt_key, prompt_text, updated_by, updated_at;
    `;

    const { rows } = await pool.query(query, [prompt_key, prompt_text.trim(), userid]);

    return rows[0];
  } catch (err) {
    console.log("upsert ocr main prompt error ❌", err);
    throw Boom.badRequest(err.message);
  }
};