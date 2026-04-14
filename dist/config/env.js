"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.env = {
    port: Number(process.env.PORT ?? 4000),
    databaseUrl: process.env.DATABASE_URL ?? "",
    jwtSecret: process.env.JWT_SECRET ?? "",
    encryptionKey: process.env.ENCRYPTION_KEY_32 ?? "",
    encryptionKeyVersion: process.env.ENCRYPTION_KEY_VERSION ?? "v1",
    redisUrl: process.env.REDIS_URL ?? "",
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    storageDriver: process.env.STORAGE_DRIVER ?? "local",
    s3Endpoint: process.env.S3_ENDPOINT ?? "",
    s3Region: process.env.S3_REGION ?? "us-east-1",
    s3Bucket: process.env.S3_BUCKET ?? "",
    s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? ""
};
if (!exports.env.databaseUrl || !exports.env.jwtSecret || !exports.env.encryptionKey) {
    throw new Error("Missing required environment variables");
}
if (exports.env.encryptionKey.length !== 32) {
    throw new Error("ENCRYPTION_KEY_32 must be exactly 32 chars for AES-256");
}
