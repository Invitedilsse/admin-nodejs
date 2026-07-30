import axios from "axios";

;

const API_BASE_URL = process.env.TTWAPI_API_URL || "https://app.ttwapi.com/api";
const VENDOR_UID =
  process.env.TTWAPI_VENDOR_UID || "d509554b-f59e-45b0-b957-e9a86ab4ce9f";
const WHATSAPP_TOKEN =
  process.env.TTWAPI_TOKEN || 
  "DuDmYQSb6WY46ncHbc81G5D5e8vfIpPdQMHNk8GzlvkYsxMXofwk7mYw2R4X9RcJ";
  // "tlG26Z8mxHl2O0HuQRCNkwEiOcFXbJVcrCM4J4WoroCvBo9OLCqsYMggAb7vqiIo";

export const  sendWhatsappNotificationttwapi = async ({
  type = "template",
  phone_number,
  template_name,
  from_phone_number_id,
  template_language = "en",
  message_body,
  fields = {},
  contact = null,
  header_image
}) => {
  try {
    let url = "";
    let payload = {
      phone_number,
      ...(contact && { contact }),
    };

    if (type === "template") {
      payload = {
        ...payload,
        template_name,
        template_language,
        ...(from_phone_number_id && { from_phone_number_id }),
        ...fields,
        header_image
      };
      url = `${API_BASE_URL}/${VENDOR_UID}/contact/send-template-message`;
    } else if (type === "message") {
      payload = {
        ...payload,
        message_body,
      };
      url = `${API_BASE_URL}/${VENDOR_UID}/contact/send-message`;
    }
    console.log("url------>",url,payload)

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    // console.log("response------>",response)

    // setTimeout(async()=>{

    // }

    // console.log("confirmationUrl------>",confirmationUrl)
      console.log("res test",response.data)

    if (response.data?.result !== "success") {
      console.log("innn false",response.data)
      return {
        message: response.data.message || "WhatsApp message failed to send",
        status: "failed",
        success: false,
        phone_number,
        type,
        "wamid":  response.data.data.wamid??null,
        // is_sent:confirmationresponse.data.status
      };
    }
      console.log("innn true")

// console.log("confirmationresponse.data.status------->",confirmationresponse.data.status,confirmationresponse.data.status)
    return {
      message: response?.data?.message || "WhatsApp message sent successfully",
      status:  "success" , //response.data.status
      success: true,
      phone_number,
      type,
      "wamid":  response?.data?.data?.wamid||null
      // is_sent:confirmationresponse.data.status
    };
    // },[1000])
    // if(response.data.wamid){
 
  } catch (error) {
    console.error("error", error.response.data);
    return { error :error.response.data, status: "error", success: false };
  }
};


