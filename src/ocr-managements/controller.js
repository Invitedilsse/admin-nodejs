import Boom from '@hapi/boom';
import { adminDb as adminDbPool } from "../../config/adminDb.js";
import { existingPool } from '../../config/dbExisiting.js';
import { addEventTypeService, addOcrKeywordService, clearTypeMatchesService, deleteEventTypeService, deleteOcrKeywordService, exportNewVenues, getCompressSettingService, getEventTypesService, getFuzzyThresholdSettingService, getNewVenues, getOcrKeywordsService, getOcrLeaderboard, getOcrMainPrompt, getOcrModelConfigservice, getOcrQuotaHistoryService, getOcrUsageLogsService, getOcrUserQuotaListService, getRawPageDataService, getRawPageSettingService, getTypeMatchesService, setCompressSettingService, setFuzzyThresholdSettingService, setOcrModelConfigApiservice, setRawPageSettingService, updateUserOcrQuotaService, upsertOcrMainPrompt } from './service.js';


export async function getOcrUsageLogsController(query,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await getOcrUsageLogsService(query,user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}

export async function getOcrUserQuotaListController(query,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await getOcrUserQuotaListService(query,user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}

export async function updateUserOcrQuotaController(query,body,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await updateUserOcrQuotaService(query,body,user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}

export async function getOcrQuotaHistoryController(query,user) {
  const user_id = user.id
  try {
     const responseDetail = await getOcrQuotaHistoryService(query,user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr quota history controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}


export async function getOcrModelConfigController(query,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await getOcrModelConfigservice(query,user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}

export async function setOcrModelConfigApiController(body,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await setOcrModelConfigApiservice(body,user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}



export async function getRawPageSettingController(query,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await getRawPageSettingService(query,user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}


export async function setRawPageSettingController(body,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await setRawPageSettingService(body,user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}



export async function getRawPageDataController(params,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await getRawPageDataService(params,user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}

export async function getCompressSettingController(params,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await getCompressSettingService(params,user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}

export async function setCompressSettingController(body,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await setCompressSettingService(body,user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}

export async function getFuzzyThresholdSettingController(params,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await getFuzzyThresholdSettingService(params,user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}

export async function setFuzzyThresholdSettingController(body,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await setFuzzyThresholdSettingService(body,user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}


export async function getOcrKeywordsController(params,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await getOcrKeywordsService(params,user_id);


    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}
export async function addOcrKeywordController(body,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await addOcrKeywordService(body,user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}
export async function deleteOcrKeywordController(params,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await deleteOcrKeywordService(params,user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}





export async function getEventTypesController(params,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await getEventTypesService(params,user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}
export async function addEventTypeController(body,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await addEventTypeService(body,user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}
export async function deleteEventTypeController(params,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await deleteEventTypeService(params,user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}



export async function getTypeMatchesController(params,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await getTypeMatchesService(params,user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}

export async function clearTypeMatchesController(user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await clearTypeMatchesService(user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}


export async function getNewVenuesController(params,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await getNewVenues(params,user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}

export async function exportNewVenuesController(b,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await exportNewVenues(b,user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}


export async function getOcrLeaderboardController(query,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await getOcrLeaderboard(query,user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}

export async function getOcrMainPromptController(query,user) {
  // const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await getOcrMainPrompt(query);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}

export async function upsertOcrMainPromptController(body,user) {
  const user_id = user.id
  try {
    //  const responseDetail = await service.getQuickListService(user_id);
     const responseDetail = await upsertOcrMainPrompt(body,user_id);

    return responseDetail;
  } catch (error) {
    console.error("Error ocr usage log controller:", error.message);
    throw Boom.badRequest(error.message) ;
  } 
}

