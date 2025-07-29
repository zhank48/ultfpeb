import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directories exist
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const complaintsDir = path.join(uploadsDir, 'complaints');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(complaintsDir)) {
  fs.mkdirSync(complaintsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Route to appropriate directory based on file field name
    if (file.fieldname === 'complaint_photo' || file.fieldname === 'complaint_photos') {
      cb(null, complaintsDir);
    } else {
      cb(null, uploadsDir);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 5 // Maximum 5 files
  }
});

// Middleware specifically for complaint photo uploads (single)
export const uploadComplaintPhoto = upload.single('complaint_photo');

// Middleware for multiple complaint photos
export const uploadComplaintPhotos = upload.array('complaint_photos', 5);

// Middleware for handling multer errors
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB per file.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 5 photos allowed.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name. Use "complaint_photo" or "complaint_photos" field name.'
      });
    }
  }
  
  if (error && error.message === 'Only image files are allowed') {
    return res.status(400).json({
      success: false,
      message: 'Only image files (JPEG, PNG, GIF, WebP) are allowed.'
    });
  }
  
  next(error);
};

// Utility function to delete uploaded file
export const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};
