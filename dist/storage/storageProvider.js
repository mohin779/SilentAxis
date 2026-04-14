"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3CompatibleStorageProvider = exports.LocalStorageProvider = void 0;
exports.getStorageProvider = getStorageProvider;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const client_s3_1 = require("@aws-sdk/client-s3");
const env_1 = require("../config/env");
class LocalStorageProvider {
    async putObject(key, body) {
        const fullPath = path_1.default.join(process.cwd(), "storage", "evidence", key);
        await promises_1.default.mkdir(path_1.default.dirname(fullPath), { recursive: true });
        await promises_1.default.writeFile(fullPath, body);
        return fullPath;
    }
}
exports.LocalStorageProvider = LocalStorageProvider;
class S3CompatibleStorageProvider {
    constructor() {
        this.client = new client_s3_1.S3Client({
            region: env_1.env.s3Region,
            endpoint: env_1.env.s3Endpoint || undefined,
            credentials: {
                accessKeyId: env_1.env.s3AccessKeyId,
                secretAccessKey: env_1.env.s3SecretAccessKey
            },
            forcePathStyle: true
        });
    }
    async putObject(key, body) {
        await this.client.send(new client_s3_1.PutObjectCommand({
            Bucket: env_1.env.s3Bucket,
            Key: key,
            Body: body
        }));
        return `s3://${env_1.env.s3Bucket}/${key}`;
    }
}
exports.S3CompatibleStorageProvider = S3CompatibleStorageProvider;
let provider = null;
function getStorageProvider() {
    if (provider)
        return provider;
    provider = env_1.env.storageDriver === "s3" ? new S3CompatibleStorageProvider() : new LocalStorageProvider();
    return provider;
}
