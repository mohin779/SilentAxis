pragma circom 2.1.6;

include "../../node_modules/circomlib/circuits/poseidon.circom";

template ComplaintProof(levels) {
    signal input identitySecret;
    signal input nullifier;
    signal input merklePath[levels];
    signal input merkleIndices[levels];
    signal input merkleRoot;

    signal output nullifierHash;
    signal output root;

    component commitmentHasher = Poseidon(1);
    commitmentHasher.inputs[0] <== identitySecret;
    signal commitment;
    commitment <== commitmentHasher.out;

    signal cur[levels + 1];
    cur[0] <== commitment;

    for (var i = 0; i < levels; i++) {
        merkleIndices[i] * (merkleIndices[i] - 1) === 0;

        signal left;
        signal right;
        left <== (1 - merkleIndices[i]) * cur[i] + merkleIndices[i] * merklePath[i];
        right <== merkleIndices[i] * cur[i] + (1 - merkleIndices[i]) * merklePath[i];

        component levelHasher = Poseidon(2);
        levelHasher.inputs[0] <== left;
        levelHasher.inputs[1] <== right;
        cur[i + 1] <== levelHasher.out;
    }

    cur[levels] === merkleRoot;
    root <== merkleRoot;

    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== identitySecret;
    nullifierHasher.inputs[1] <== nullifier;
    nullifierHash <== nullifierHasher.out;
}

component main { public [nullifierHash, root] } = ComplaintProof(20);
