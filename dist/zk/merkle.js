"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMerkleTree = buildMerkleTree;
exports.getMerkleProof = getMerkleProof;
const hashing_1 = require("../utils/crypto/hashing");
function buildMerkleTree(leaves) {
    if (leaves.length === 0)
        return { root: (0, hashing_1.sha256)("EMPTY"), layers: [[(0, hashing_1.sha256)("EMPTY")]] };
    const layers = [leaves];
    while (layers[layers.length - 1].length > 1) {
        const prev = layers[layers.length - 1];
        const next = [];
        for (let i = 0; i < prev.length; i += 2) {
            const left = prev[i];
            const right = prev[i + 1] ?? prev[i];
            next.push((0, hashing_1.sha256)(`${left}${right}`));
        }
        layers.push(next);
    }
    return { root: layers[layers.length - 1][0], layers };
}
function getMerkleProof(layers, index) {
    const proof = [];
    let currentIndex = index;
    for (let layer = 0; layer < layers.length - 1; layer++) {
        const sibling = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
        proof.push(layers[layer][sibling] ?? layers[layer][currentIndex]);
        currentIndex = Math.floor(currentIndex / 2);
    }
    return proof;
}
