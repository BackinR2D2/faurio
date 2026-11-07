import { z } from "zod";

export const reviewSubmissionSchema = z.object({
  code: z.string().trim().min(1).max(100).optional(), productId: z.string().trim().min(1).max(200),
  rating: z.number().int().min(1).max(5), body: z.string().trim().min(5, "Scrie cel puțin 5 caractere.").max(2000),
}).strict();
export type PublicReview = { id: string; rating: number; body: string; created_at: string; verified_purchase: boolean };
export type ReviewPage = { reviews: PublicReview[]; total: number; rating: number; page: number; pageCount: number; available: boolean };
export type ReviewEligibility = { hasReview: boolean; ownProduct: boolean; verifiedPurchase: boolean };

export function safeAccountDestination(value: string | null) {
  return value && (/^\/(?:studio(?:\/[^?#]*)?|sell)(?:\?[^#]*)?$/.test(value) || /^\/produs\/[a-zA-Z0-9_-]+(?:#recenzii)?$/.test(value)) ? value : "/cont/profil";
}
