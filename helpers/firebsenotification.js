// import * as serviceAccount from "../fire-base-service-account.json"
// import admin from "firebase-admin"


// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

import admin from "firebase-admin";
import serviceAccount from "../fire-base-service-account.json" with { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});


export const sendNotification = async ({
  title,
  body,
  device_id,
  data,
  user_id,
  fcm_token,
  silent = true,
}) => {
  try {
    let message = {
      token: fcm_token,
    };
    console.log("mmmmmmmssssssss--->✅",silent,title, body)
    if (!silent && title && body) {
      message.notification = { title, body };
      
      message.apns = {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            alert: {
              title,
              body,
            },
            sound: "default", // 🔔 play sound on iOS
            badge: 1,
          },
        },
      };

      message.android = {
        priority: "high",
        notification: {
          sound: "default", // 🔔 play sound on Android too
        },
      };
    }

    if (data) {
      if (typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Data must be a key-value object");
      }

      const restrictedKeys = ["from", "notification", "google"];
      message.data = Object.fromEntries(
        Object.entries(data).map(([key, value]) => {
          if (
            typeof key !== "string" ||
            restrictedKeys.some(
              (restricted) =>
                key.startsWith(restricted + ".") || key === restricted
            )
          ) {
            throw new Error(
              "Invalid data key: Reserved keywords are not allowed"
            );
          }
          return [key, String(value)];
        })
      );
    }

    if (silent) {
      message.android = {
        priority: "high",
      };
      message.apns = {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            "content-available": 1,
          },
        },
      };
    }

    console.log("fcm message---->",message)
    // console.log("pathparam---->",message?.data?.pathParameters||"not pathparam")
    // console.log("pathparam---->", JSON.stringify(message.data.pathParameters, null, 2));


    const messaging = admin.messaging();
    const response = await messaging.send(message);

    console.log("fcm respose--------->",{
      message: "Notification sent successfully",
      data: { response },
      response
    })
    return {
      message: "Notification sent successfully",
      data: { response },
    };
  } catch (error) {
    if (error.code === "messaging/registration-token-not-registered") {
    //   await service.deleteToken({ user_id, device_id,status : 'off' });
      const err = new Error("FCM token is invalid");
      err.code = "registration-token-not-registered";
      throw err;
    } else {
      console.error("Error sending notification:", error);
    }
    throw error;
  }
};