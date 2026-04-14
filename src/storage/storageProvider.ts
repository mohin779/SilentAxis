import fs from "fs/promises";
import path from "path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env";

export interface StorageProvider {
  putObject(key: string, body: Buffer | string): Promise<string>;
}

export class LocalStorageProvider implements StorageProvider {
  async putObject(key: string, body: Buffer | string): Promise<string> {
    const fullPath = path.join(process.cwd(), "storage", "evidence", key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, body);
    return fullPath;
  }
}

export class S3CompatibleStorageProvider implements StorageProvider {
  private client = new S3Client({
    region: env.s3Region,
    endpoint: env.s3Endpoint || undefined,
    credentials: {
      accessKeyId: env.s3AccessKeyId,
      secretAccessKey: env.s3SecretAccessKey
    },
    forcePathStyle: true
  });

  async putObject(key: string, body: Buffer | string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: env.s3Bucket,
        Key: key,
        Body: body
      })
    );
    return `s3://${env.s3Bucket}/${key}`;
  }
}

let provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (provider) return provider;
  provider = env.storageDriver === "s3" ? new S3CompatibleStorageProvider() : new LocalStorageProvider();
  return provider;
}
