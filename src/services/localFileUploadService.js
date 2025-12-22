const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer disk storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = '';

        // Determine folder based on field name
        if (file.fieldname === 'profile_image') {
            folder = 'profile_images';
        } else if (file.fieldname === 'cv') {
            folder = 'cvs';
        } else if (file.fieldname === 'video') {
            folder = 'videos';
        }

        const destinationPath = path.join(uploadsDir, folder);

        // Create folder if it doesn't exist
        if (!fs.existsSync(destinationPath)) {
            fs.mkdirSync(destinationPath, { recursive: true });
        }

        cb(null, destinationPath);
    },
    filename: (req, file, cb) => {
        const fileExtension = path.extname(file.originalname);
        const uniqueFilename = `${uuidv4()}${fileExtension}`;
        cb(null, uniqueFilename);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'cv') {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed for CVs'), false);
        }
    } else if (file.fieldname === 'video') {
        const allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only MP4, WebM, or QuickTime videos are allowed'), false);
        }
    } else if (file.fieldname === 'profile_image') {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, or JPG images are allowed'), false);
        }
    } else {
        cb(null, true);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

/**
 * Upload file to local storage
 * For diskStorage, file already has a path property set by multer
 * Returns the relative URL path
 */
const uploadToLocal = async (file, folder = '') => {
    try {
        // Validate file object
        if (!file) {
            throw new Error('No file provided');
        }

        // For disk storage, multer sets the path automatically
        if (!file.path) {
            throw new Error('File path not found. Ensure diskStorage is configured.');
        }

        // Extract just the filename from the full path
        const filename = path.basename(file.path);

        // Return the relative URL path
        const relativePath = `/uploads/${folder}/${filename}`;

        console.log(`File uploaded successfully: ${relativePath}`);
        return relativePath;
    } catch (error) {
        console.error('Error processing file:', error);
        throw new Error(`Failed to process file: ${error.message}`);
    }
};

/**
 * Get file URL from relative path
 */
const getFileUrl = (filePath) => {
    if (!filePath) return null;

    // If already a full URL, return as is
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return filePath;
    }

    // Return the relative path (will be served by express.static)
    return filePath;
};

/**
 * Delete file from local storage
 */
const deleteFile = async (filePathOrUrl) => {
    try {
        if (!filePathOrUrl) return;

        let filePath = filePathOrUrl;

        // Extract relative path if it's a URL
        if (filePathOrUrl.startsWith('/uploads/')) {
            filePath = path.join(__dirname, '../../', filePathOrUrl);
        } else if (filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://')) {
            // Extract path from URL
            const urlPath = new URL(filePathOrUrl).pathname;
            filePath = path.join(__dirname, '../../', urlPath);
        }

        // Delete file if it exists
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`File deleted successfully: ${filePath}`);
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        // Don't throw - file deletion failure shouldn't break the flow
    }
};

module.exports = {
    upload,
    uploadToLocal,
    uploadToS3: uploadToLocal, // Alias for compatibility
    getFileUrl,
    deleteFile
};
