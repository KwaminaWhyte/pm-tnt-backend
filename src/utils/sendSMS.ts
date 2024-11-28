import axios from "axios";

// Normalize phone number
function normalizePhoneNumber(phoneNumber: string): string | false {
  // If the phone number contains a slash, use the first number
  if (phoneNumber.includes("/")) {
    phoneNumber = phoneNumber.split("/")[0];
  }

  // If the phone number contains a backslash, use the first number
  if (phoneNumber.includes("\\")) {
    phoneNumber = phoneNumber.split("\\")[0];
  }

  // Remove any spaces from the phone number
  phoneNumber = phoneNumber.replace(/\s+/g, "");

  // Remove any non-numeric characters from the phone number
  phoneNumber = phoneNumber.replace(/[^0-9]/g, "");

  // If the phone number starts with 0, replace it with 233
  if (phoneNumber.startsWith("0")) {
    phoneNumber = "233" + phoneNumber.slice(1);
  }

  // Check if the phone number is less than 9 digits or empty
  if (phoneNumber.length < 9 || !phoneNumber) {
    return false;
  }

  return phoneNumber;
}

// HTTP POST request
async function httpPost(data: any): Promise<any> {
  const url = "https://clicksmsgateway.com";
  const headers = {
    Authorization:
      "Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiIzODgiLCJvaWQiOjM4OCwidWlkIjoiZGRmOTNjYjMtZjdhOS00N2RlLWEwMzQtYmU1ZWJkZjAwYjczIiwiYXBpZCI6MTMzLCJpYXQiOjE2NjE0MjI3NzMsImV4cCI6MjAwMTQyMjc3M30.VVNlncvnk2_GNXtiX5xvulPEHH0sJ76AQPQdqKV4jFUXddnH67IiA2uOG66zK2N0hBmtICAwP4b-h2X_1heKDA",
    "Content-Type": "application/json",
  };

  try {
    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    const errorMsg = (error as Error).message;

    return errorMsg;
  }
}

// Send SMS
async function sendSMS({
  smsText,
  recipient,
}: {
  smsText: string;
  recipient: string;
}): Promise<any> {
  const phone = normalizePhoneNumber(recipient);

  console.info("formatted phone", phone);

  if (!phone) {
    return false;
  }

  const data = {
    from: "Adamus LTD",
    to: phone,
    message: smsText,
    refId: `ref_${Date.now()}`,
  };

  const response = await httpPost(data);

  return response;
}

export default sendSMS;
