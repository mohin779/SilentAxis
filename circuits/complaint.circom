pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

template MerkleInclusion(depth) {
    signal input leaf;
    signal input pathElements[depth];
    signal input pathIndices[depth];
    signal output root;

    signal hashes[depth + 1];
    hashes[0] <== leaf;

    component leftSel[depth];
    component rightSel[depth];
    component hasher[depth];

    for (var i = 0; i < depth; i++) {
        leftSel[i] = IsEqual();
        leftSel[i].in[0] <== pathIndices[i];
        leftSel[i].in[1] <== 0;

        rightSel[i] = IsEqual();
        rightSel[i].in[0] <== pathIndices[i];
        rightSel[i].in[1] <== 1;

        hasher[i] = Poseidon(2);
        hasher[i].inputs[0] <== leftSel[i].out * hashes[i] + rightSel[i].out * pathElements[i];
        hasher[i].inputs[1] <== leftSel[i].out * pathElements[i] + rightSel[i].out * hashes[i];
        hashes[i + 1] <== hasher[i].out;
    }

    root <== hashes[depth];
}

template Complaint(depth) {
    signal input root;
    signal input nullifierHash;

    signal input identity_nullifier;
    signal input identity_trapdoor;
    signal input merkle_path[depth];
    signal input merkle_indices[depth];
    signal input date;

    signal commitment;
    signal computedNullifier;

    component commitmentHasher = Poseidon(2);
    commitmentHasher.inputs[0] <== identity_nullifier;
    commitmentHasher.inputs[1] <== identity_trapdoor;
    commitment <== commitmentHasher.out;

    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== identity_nullifier;
    nullifierHasher.inputs[1] <== date;
    computedNullifier <== nullifierHasher.out;

    component inclusion = MerkleInclusion(depth);
    inclusion.leaf <== commitment;
    for (var i = 0; i < depth; i++) {
        inclusion.pathElements[i] <== merkle_path[i];
        inclusion.pathIndices[i] <== merkle_indices[i];
    }

    inclusion.root === root;
    computedNullifier === nullifierHash;
}

component main = Complaint(20);
