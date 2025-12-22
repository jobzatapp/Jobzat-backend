const { createLogger, format, transports } = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const fs = require("fs");
const path = require("path");
const { combine, timestamp, printf } = format;

const logDirectory = path.join(__dirname, "../logs");

// Create logs directory if it doesn't exist
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
}

const undefinedFix = (key, value) =>
    typeof value === "undefined" ? null : value;

const logFormat = combine(
    timestamp({ format: "DD-MM-YYYY HH:mm:ss" }),
    printf(({ level, message, timestamp, ...json }) => {
        return `${timestamp} [${level.toUpperCase()}] ["${message}"]: [ ${JSON.stringify(
            json,
            undefinedFix
        )} ]`;
    })
);

const logger = createLogger({
    level: process.env.LOG_LEVEL || "debug",
    format: logFormat,
    transports: [new transports.Console()],
});

// Add file transport for production and development
if (
    process.env.NODE_ENV === "production" ||
    process.env.NODE_ENV === "development"
) {
    // Application logs
    logger.add(
        new DailyRotateFile({
            level: "debug",
            filename: path.join(logDirectory, `/application-%DATE%.log`),
            datePattern: "DD-MM-YYYY",
            zippedArchive: true,
            maxSize: "20m",
            maxFiles: "14d",
        })
    );

    // Error logs (separate file for errors)
    logger.add(
        new DailyRotateFile({
            level: "error",
            filename: path.join(logDirectory, `/error-%DATE%.log`),
            datePattern: "DD-MM-YYYY",
            zippedArchive: true,
            maxSize: "20m",
            maxFiles: "30d",
        })
    );
}

const requestLogger = (req, res, next) => {
    logger.info("Incoming Request", {
        METHOD: req.method,
        ENDPOINT: req.url,
        BODY: req.body,
        PARAMS: req.params,
        QUERY: req.query,
        IP: req.ip || req.connection.remoteAddress,
        USER_AGENT: req.get("user-agent"),
    });
    next();
};

module.exports = { logger, requestLogger };

