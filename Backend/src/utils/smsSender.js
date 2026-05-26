import twilio from 'twilio';

/**
 * Format phone number with +91 prefix if not already present
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} Formatted phone number with +91 prefix
 */
const formatPhoneNumber = (phoneNumber) => {
  // Remove any non-digit characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // If it already starts with +91, return as is
  if (cleaned.startsWith('+91')) {
    return cleaned;
  }
  
  // If it starts with 91 (without +), add the +
  if (cleaned.startsWith('91')) {
    return '+' + cleaned;
  }
  
  // If it's a 10-digit Indian number, add +91 prefix
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    return '+91' + cleaned;
  }
  
  // If it's an 11-digit number starting with 0, remove the 0 and add +91
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return '+91' + cleaned.substring(1);
  }
  
  // Otherwise, return as is (might be an international number)
  return cleaned;
};

/**
 * Get Twilio client instance
 * @returns {Object|null} Twilio client or null if not configured
 */
const getTwilioClient = () => {
  // Get environment variables when needed
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

  // Initialize Twilio client only if credentials are provided
  if (accountSid && authToken && twilioPhoneNumber) {
    return twilio(accountSid, authToken);
  }
  
  return null;
};

/**
 * Send SMS using Twilio
 * @param {string} to - Recipient phone number
 * @param {string} message - Message content
 * @returns {Promise<boolean>} - Whether the SMS was sent successfully
 */
export const sendSMS = async (to, message) => {
  const client = getTwilioClient();
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  
  // If Twilio is not configured, log to console for development
  if (!client) {
    console.log('Twilio not configured. SMS would be sent to:', to, 'with message:', message);
    return true; // Return true for development
  }
  
  // Format the recipient phone number with +91 prefix
  const formattedTo = formatPhoneNumber(to);
  
  // Format the Twilio phone number with +91 prefix
  const formattedFrom = formatPhoneNumber(twilioPhoneNumber);
  
  // Check if 'To' and 'From' numbers are the same
  if (formattedTo === formattedFrom) {
    console.error(`Failed to send SMS: 'To' and 'From' number cannot be the same: ${formattedTo}`);
    throw new Error("Cannot send SMS to the same number configured as the sender. Please update your mobile number in your profile or use email for password recovery.");
  }

  try {
    const result = await client.messages.create({
      body: message,
      from: formattedFrom,
      to: formattedTo
    });
    
    console.log('SMS sent successfully:', result.sid);
    return true;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    // Check if it's a specific Twilio error about invalid phone number
    if (error.code === 21659) {
      throw new Error("The system's SMS configuration is invalid. Please contact the administrator to fix the SMS service configuration.");
    }
    // For other Twilio errors
    throw new Error("Failed to send SMS. Please try again later or use email for password recovery.");
  }
};

/**
 * Send OTP via SMS
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} otp - OTP to send
 * @returns {Promise<boolean>} - Whether the OTP was sent successfully
 */
export const sendOTPviaSMS = async (phoneNumber, otp) => {
  const message = `Your OTP for password reset is: ${otp}. This OTP is valid for 5 minutes.`;
  try {
    return await sendSMS(phoneNumber, message);
  } catch (error) {
    // Re-throw the error so it can be handled properly in the calling function
    throw error;
  }
};