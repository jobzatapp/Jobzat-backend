const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

/* ======================================================
   S3 CLIENT (IAM ROLE – NO CREDENTIALS HERE)
====================================================== */

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
});

const BUCKET = process.env.AWS_S3_BUCKET;

/* ======================================================
   FILE FILTER (VALIDATION)
====================================================== */

const fileFilter = (req, file, cb) => {
  if (file.fieldname === "cv") {
    return file.mimetype === "application/pdf"
      ? cb(null, true)
      : cb(new Error("Only PDF files are allowed for CV"), false);
  }

  if (file.fieldname === "video") {
    const allowed = ["video/mp4", "video/webm", "video/quicktime"];
    return allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Invalid video format"), false);
  }

  if (file.fieldname === "profile_image") {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    return allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Invalid image format"), false);
  }

  cb(null, true);
};

/* ======================================================
   MULTER (MEMORY ONLY)
====================================================== */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024, // 30MB
  },
  fileFilter,
});

/* ======================================================
   MULTER ERROR HANDLER (EXPORT THIS)
====================================================== */

const multerErrorHandler = (err, req, res, next) => {
  // Multer file size error
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: "File size exceeds allowed limit (30MB)",
    });
  }

  // Custom file filter errors
  if (err?.message) {
    return res.status(400).json({
      error: err.message,
    });
  }

  next(err);
};

/* ======================================================
   UPLOAD TO S3 (PRIVATE OBJECT)
====================================================== */

const uploadToS3 = async (file, folder, userId) => {
  if (!file) return null;

  const key = `${folder}/${userId}/${uuidv4()}${path.extname(
    file.originalname
  )}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      // ❌ NO ACL → private by default
    })
  );

  return key; // ✅ STORE THIS IN DB
};

/* ======================================================
   GET SIGNED URL (READ ACCESS)
====================================================== */

const getSignedFileUrl = async (key, expiresIn = 300) => {
  if (!key) return null;

  return getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
    { expiresIn }
  );
};

/* ======================================================
   DELETE FILE FROM S3
====================================================== */

const deleteFile = async (key) => {
  if (!key) return;

  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
  } catch (err) {
    console.error("S3 delete failed:", err);
  }
};

/* ======================================================
   EXPORTS
====================================================== */

module.exports = {
  upload,
  uploadToS3,
  getSignedFileUrl,
  deleteFile,
  multerErrorHandler,
};
