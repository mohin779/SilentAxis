import { z } from "zod";

export const encryptedPayloadSchema = z.object({
  encryptedComplaint: z.string().min(1),
  encryptedKey: z.string().min(1).optional()
});

export function validateEncryptedPayload(payload: unknown): boolean {
  return encryptedPayloadSchema.safeParse(payload).success;
}
