const multer = require('multer');
const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { v4: uuidv4 } = require('uuid');

// Configure AWS S3 Client (v3)
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const S3_BUCKET = process.env.AWS_S3_BUCKET;

// Configure multer memory storage (we'll upload directly to S3)
const storage = multer.memoryStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/' + file.fieldname);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'cv') {
        // Only allow PDF files for CVs
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed for CVs'), false);
        }
    } else if (file.fieldname === 'video') {
        // Allow common video formats
        const allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only MP4, WebM, or QuickTime videos are allowed'), false);
        }
    } else if (file.fieldname === 'profile_image') {
        // Allow common image formats
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
 * Upload file to S3
 */
const uploadToS3 = async (file, folder = '') => {
    try {
        const fileExtension = path.extname(file.originalname);
        const fileName = `${folder}${folder ? '/' : ''}${uuidv4()}${fileExtension}`;
        const contentType = file.mimetype;

        // Use Upload from @aws-sdk/lib-storage for better handling of large files
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: S3_BUCKET,
                Key: fileName,
                Body: file.buffer,
                ContentType: contentType,
                ACL: 'public-read' // Make files publicly accessible, or use 'private' with signed URLs
            }
        });

        const result = await upload.done();

        // Construct the URL from the result
        const region = process.env.AWS_REGION || 'us-east-1';
        const url = `https://${S3_BUCKET}.s3.${region}.amazonaws.com/${fileName}`;
        return url;
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw new Error('Failed to upload file to S3');
    }
};

/**
 * Get file URL from S3 key or full URL
 */
const getFileUrl = (s3KeyOrUrl) => {
    if (!s3KeyOrUrl) return null;

    // If already a full URL, return as is
    if (s3KeyOrUrl.startsWith('http://') || s3KeyOrUrl.startsWith('https://')) {
        return s3KeyOrUrl;
    }

    // If it's an S3 key, construct the URL
    // Format: https://{bucket}.s3.{region}.amazonaws.com/{key}
    const region = process.env.AWS_REGION || 'us-east-1';
    return `https://${S3_BUCKET}.s3.${region}.amazonaws.com/${s3KeyOrUrl}`;
};

/**
 * Delete file from S3
 */
const deleteFile = async (s3KeyOrUrl) => {
    try {
        if (!s3KeyOrUrl) return;

        // Extract S3 key from URL if it's a full URL
        let s3Key = s3KeyOrUrl;
        if (s3KeyOrUrl.startsWith('http://') || s3KeyOrUrl.startsWith('https://')) {
            // Extract key from URL: https://bucket.s3.region.amazonaws.com/key
            const urlParts = s3KeyOrUrl.split('.amazonaws.com/');
            if (urlParts.length > 1) {
                s3Key = urlParts[1];
            } else {
                console.warn('Could not extract S3 key from URL:', s3KeyOrUrl);
                return;
            }
        }

        const command = new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key: s3Key
        });

        await s3Client.send(command);
    } catch (error) {
        console.error('Error deleting file from S3:', error);
        // Don't throw - file deletion failure shouldn't break the flow
    }
};

module.exports = {
    upload,
    uploadToS3,
    getFileUrl,
    deleteFile
};

