"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeEncryptedEvidence = storeEncryptedEvidence;
const uuid_1 = require("uuid");
const storageProvider_1 = require("../storage/storageProvider");
const encryption_1 = require("../utils/crypto/encryption");
async function storeEncryptedEvidence(fileName, encryptedFileBase64) {
    const safeName = `${(0, uuid_1.v4)()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    // Extra-at-rest encryption layer for uploaded encrypted evidence blobs.
    const wrapped = await (0, encryption_1.encrypt)(encryptedFileBase64);
    return (0, storageProvider_1.getStorageProvider)().putObject(safeName, wrapped);
}
