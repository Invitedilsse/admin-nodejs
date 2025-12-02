import axios from "axios";

const API_BASE_URL = process.env.BLUEWABA_API_URL || "https://bluewaba.com/api";
const VENDOR_UID =
  process.env.BLUEWABA_VENDOR_UID || "0abdbef0-9794-4d24-bee7-3e622384b828";
const WHATSAPP_TOKEN =
  process.env.BLUEWABA_TOKEN ||
  "rKtJWpLDgi79nGyoRmKhzhyCEOiVO6gJT8c8UoPvR0oF2vwhU6dHthmySL1lPhzx";

export const sendWhatsappNotification = async ({
  type = "template",
  phone_number,
  template_name,
  from_phone_number_id,
  template_language = "en",
  message_body,
  fields = {},
  contact = null,
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

    console.log("response------>",response.data.data,response.data.data.wamid)

    // setTimeout(async()=>{

    // }

    // console.log("confirmationUrl------>",confirmationUrl)

    if (response.data?.result !== "success") {
      return {
        message: response.data.message || "WhatsApp message failed to send",
        status: "failed",
        success: false,
        phone_number,
        type,
        "wamid":  response.data.data.wamid,
        // is_sent:confirmationresponse.data.status
      };
    }
// console.log("confirmationresponse.data.status------->",confirmationresponse.data.status,confirmationresponse.data.status)
    return {
      message: response.data.message || "WhatsApp message sent successfully",
      status:  "success" , //response.data.status
      success: true,
      phone_number,
      type,
      "wamid":  response.data.data.wamid,
      // is_sent:confirmationresponse.data.status
    };
    // },[1000])
    // if(response.data.wamid){
 
  } catch (error) {
    console.error("error", error.response.data);
    return { error :error.response.data, status: "error", success: false };
  }
};
