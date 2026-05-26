import { v2 as cloudinary } from "cloudinary";
import path from "path";
import fs from "fs";

// Ensure Cloudinary is configured with environment variables
const configureCloudinary = () => {
  // Add safety checks for environment variables
  console.log('Checking Cloudinary environment variables...');
  console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
  console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '***REDACTED***' : 'NOT SET');
  console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '***REDACTED***' : 'NOT SET');

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary environment variables are not properly configured');
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  console.log('Cloudinary configured successfully');
};

export const uploadOnCloudinary = async (localPath, empId) => {
  try {
    console.log('Attempting to configure Cloudinary...');
    // Configure Cloudinary before each upload
    configureCloudinary();
  } catch (configError) {
    console.error("Cloudinary Configuration Error:", configError);
    throw new Error('Cloudinary is not properly configured: ' + configError.message);
  }

  try {
    console.log('Cloudinary upload called with:', { localPath, empId });

    if (!localPath) {
      throw new Error('No local path provided for upload');
    }

    // Check if file exists
    if (!fs.existsSync(localPath)) {
      throw new Error('File does not exist at the specified path: ' + localPath);
    }

    console.log('File exists, proceeding with upload...');

    const result = await cloudinary.uploader.upload(localPath, {
      public_id: `employee-profiles/${empId}`, // ✅ string path
      overwrite: true, // ✅ overwrite if exists
    });

    console.log('Cloudinary upload successful:', result);

    // Delete local file after upload
    try {
      fs.unlinkSync(localPath);
      console.log('Local file deleted successfully');
    } catch (unlinkError) {
      console.warn("Warning: Could not delete local file:", unlinkError.message);
    }

    return result;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw new Error('Failed to upload image to Cloudinary: ' + error.message);
  }
};

export const uploadPunchImageToCloudinary = async (localPath, public_id) => {
  try {
    console.log('Attempting to configure Cloudinary for punch image...');
    // Configure Cloudinary before each upload
    configureCloudinary();
  } catch (configError) {
    console.error("Cloudinary Configuration Error:", configError);
    throw new Error('Cloudinary is not properly configured: ' + configError.message);
  }

  try {
    console.log('Cloudinary punch image upload called with:', { localPath, public_id });

    if (!localPath) {
      throw new Error('No local path provided for upload');
    }

    // Check if file exists
    if (!fs.existsSync(localPath)) {
      throw new Error('File does not exist at the specified path: ' + localPath);
    }

    // Log file information
    const stats = fs.statSync(localPath);
    console.log('File exists, proceeding with upload...');
    console.log('File size:', stats.size, 'bytes');
    console.log('File last modified:', stats.mtime);

    // Read file content for debugging
    const fileBuffer = fs.readFileSync(localPath);
    console.log('File buffer length:', fileBuffer.length);

    // Validate that file has content
    if (fileBuffer.length === 0) {
      throw new Error('File is empty');
    }

    // Log first few bytes to verify it's an image
    console.log('First 20 bytes of file (hex):', fileBuffer.slice(0, 20).toString('hex'));

    const result = await cloudinary.uploader.upload(localPath, {
      public_id,
      overwrite: true,
    });

    console.log('Cloudinary punch image upload successful:', result);
    console.log('Secure URL:', result.secure_url);
    console.log('Public ID:', result.public_id);
    console.log('Resource type:', result.resource_type);
    console.log('Format:', result.format);
    console.log('Bytes:', result.bytes);

    // Delete local file after upload
    try {
      fs.unlinkSync(localPath);
      console.log('Local file deleted successfully');
    } catch (unlinkError) {
      console.warn("Warning: Could not delete local file:", unlinkError.message);
    }

    return result;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    console.error("Cloudinary Upload Error Details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      http_code: error.http_code
    });

    // Log additional Cloudinary-specific error information
    if (error.error) {
      console.error("Cloudinary API Error Details:", error.error);
    }

    throw new Error('Failed to upload image to Cloudinary: ' + error.message);
  }
};
