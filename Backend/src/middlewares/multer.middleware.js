import multer from "multer";
import fs from "fs";
import path from "path";

// Ensure temp directory exists with better error handling
const tempDir = path.join(process.cwd(), "public", "temp");

console.log('Configuring multer middleware...');
console.log('Temp directory path:', tempDir);

try {
  if (!fs.existsSync(tempDir)) {
    // Create the directory recursively
    fs.mkdirSync(tempDir, { recursive: true });
    console.log('Created temp directory:', tempDir);
  } else {
    console.log('Temp directory already exists:', tempDir);
  }
} catch (error) {
  console.error('Error creating temp directory:', error);
  // If we can't create the directory, we'll let multer handle the error
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('Multer destination called with file:', file);
    // Check if directory exists before using it
    if (!fs.existsSync(tempDir)) {
      console.error('Temp directory does not exist:', tempDir);
      cb(new Error('Temp directory does not exist: ' + tempDir));
    } else {
      console.log('Using temp directory:', tempDir);
      cb(null, tempDir);
    }
  },
  filename: function (req, file, cb) {
    console.log('Multer filename called with file:', file);
    const timestamp = Date.now();
    const sanitizedOriginalname = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    const truncatedFilename = sanitizedOriginalname.substring(0, 50); // Limit filename length
    const uniqueFilename = `${timestamp}-${truncatedFilename}`;
    console.log('Generated filename:', uniqueFilename);
    cb(null, uniqueFilename);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit to 5MB
  },
  fileFilter: (req, file, cb) => {
    console.log('Multer fileFilter called with file:', file);
    // Allow common image types
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif"];
    if (allowedTypes.includes(file.mimetype)) {
      console.log('File type accepted:', file.mimetype);
      cb(null, true);
    } else {
      console.error('Invalid file type:', file.mimetype);
      cb(new Error("Invalid file type. Only JPEG, PNG, JPG, and GIF are allowed."));
    }
  },
});

export default upload;