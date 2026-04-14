export interface Groth16Proof {
  pi_a: [string, string, string?];
  pi_b: [[string, string], [string, string], [string, string]?];
  pi_c: [string, string, string?];
  protocol?: string;
  curve?: string;
}

export interface PublicSignals {
  nullifierHash: string;
  root: string;
}
