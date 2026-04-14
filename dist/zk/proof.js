"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateProof = generateProof;
exports.verifyProof = verifyProof;
const hashing_1 = require("../utils/crypto/hashing");
function generateProof(secret, merkleProof, root) {
    return {
        proofHash: (0, hashing_1.sha256)(`${secret}:${merkleProof.join(",")}:${root}`),
        createdAt: Date.now()
    };
}
function verifyProof(proof, root) {
    return Boolean(proof?.proofHash) && Boolean(root) && proof.createdAt > 0;
}
