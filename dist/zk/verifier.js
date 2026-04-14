"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.zkVerifier = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
class SnarkJsVerifier {
    constructor() {
        this.verificationKey = null;
        this.initPromise = null;
    }
    async initialize() {
        if (this.verificationKey)
            return;
        if (this.initPromise) {
            await this.initPromise;
            return;
        }
        this.initPromise = (async () => {
            const keyPath = path_1.default.join(process.cwd(), "zk", "build", "verification_key.json");
            const raw = await promises_1.default.readFile(keyPath, "utf8");
            this.verificationKey = JSON.parse(raw);
        })();
        await this.initPromise;
    }
    async verifyProof(proof, root, nullifierHash) {
        if (!root || !nullifierHash || !proof)
            return false;
        try {
            await this.initialize();
            const snarkjs = require("snarkjs");
            const publicSignals = [nullifierHash, root];
            return await snarkjs.groth16.verify(this.verificationKey, publicSignals, proof);
        }
        catch {
            return false;
        }
    }
}
exports.zkVerifier = new SnarkJsVerifier();
