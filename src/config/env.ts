import dotenv from "dotenv";

dotenv.config();

export const env = {
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

if (!env.databaseUrl || !env.jwtSecret || !env.encryptionKey) {
  throw new Error("Missing required environment variables");
}

if (env.encryptionKey.length !== 32) {
  throw new Error("ENCRYPTION_KEY_32 must be exactly 32 chars for AES-256");
}
