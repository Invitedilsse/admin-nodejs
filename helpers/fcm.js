import { sendNotification  } from "./firebsenotification.js";


export const sendNotificationNew = async (params, user) => {
  const { title, body,user_id, device_id, data,silent,fcm_token } = params;
  // const user_id = user.id;
//   const fcm_token = await service.getToken({ user_id, device_id });
  console.log("fcm---->✅",fcm_token)
  if (!fcm_token) {
    throw new Error("FCM token not found for this device");
  }
  return  sendNotification({ title, body, device_id, data, user_id,fcm_token,silent });
};