"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appendCommitment = appendCommitment;
const db_1 = require("../config/db");
const hashing_1 = require("../utils/crypto/hashing");
class IncrementalMerkleTree {
    constructor(initialLeaves = []) {
        this.layers = [];
        this.layers = [initialLeaves.length ? [...initialLeaves] : [(0, hashing_1.sha256)("EMPTY")]];
        if (initialLeaves.length) {
            this.recomputeParents();
        }
    }
    appendLeaf(commitment) {
        if (this.layers[0].length === 1 && this.layers[0][0] === (0, hashing_1.sha256)("EMPTY")) {
            this.layers[0] = [];
        }
        this.layers[0].push(commitment);
        let index = this.layers[0].length - 1;
        let level = 0;
        while (true) {
            if (!this.layers[level + 1])
                this.layers[level + 1] = [];
            const layer = this.layers[level];
            const parentIndex = Math.floor(index / 2);
            const left = layer[parentIndex * 2];
            const right = layer[parentIndex * 2 + 1] ?? left;
            this.layers[level + 1][parentIndex] = (0, hashing_1.sha256)(`${left}${right}`);
            index = parentIndex;
            level++;
            if (this.layers[level].length === 1)
                break;
        }
        return this.layers[0].length - 1;
    }
    getRoot() {
        const top = this.layers[this.layers.length - 1];
        return top[0];
    }
    generateProof(leafIndex) {
        const proof = [];
        let currentIndex = leafIndex;
        for (let layer = 0; layer < this.layers.length - 1; layer++) {
            const sibling = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
            proof.push(this.layers[layer][sibling] ?? this.layers[layer][currentIndex]);
            currentIndex = Math.floor(currentIndex / 2);
        }
        return proof;
    }
    recomputeParents() {
        let level = 0;
        while (this.layers[level].length > 1) {
            const next = [];
            for (let i = 0; i < this.layers[level].length; i += 2) {
                const left = this.layers[level][i];
                const right = this.layers[level][i + 1] ?? left;
                next.push((0, hashing_1.sha256)(`${left}${right}`));
            }
            this.layers[level + 1] = next;
            level++;
        }
    }
}
const treesByOrg = new Map();
async function getTree(orgId) {
    const cached = treesByOrg.get(orgId);
    if (cached)
        return cached;
    const rows = await db_1.pool.query("SELECT commitment FROM identity_commitments WHERE org_id = $1 ORDER BY created_at ASC", [orgId]);
    const tree = new IncrementalMerkleTree(rows.rows.map((r) => r.commitment));
    treesByOrg.set(orgId, tree);
    return tree;
}
async function appendCommitment(orgId, commitment) {
    const tree = await getTree(orgId);
    const leafIndex = tree.appendLeaf(commitment);
    return { leafIndex, root: tree.getRoot(), merkleProof: tree.generateProof(leafIndex) };
}
