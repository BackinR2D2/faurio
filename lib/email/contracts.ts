import { z } from "zod";

const amount = z.coerce.number().finite().min(0).max(100000000);
export const orderEmailSchema = z.object({
  code: z.string().min(1).max(200), customer_name: z.string().max(120), customer_email: z.email(),
  shipping_address: z.string().max(2000),
  items: z.array(z.object({ name: z.string().min(1).max(200), quantity: z.number().int().min(1).max(10000), unit_price: amount })).min(1).max(50),
  subtotal: amount, discount: amount, shipping: amount, total: amount,
  invoice_url: z.string().nullable().optional(), test_mode: z.boolean(),
});
export type OrderEmailSnapshot = z.infer<typeof orderEmailSchema>;
export type EmailMessage = { from: string; to: string[]; subject: string; html: string; text: string; reply_to?: string; delivery_provider?: "smtp" | "resend" };
export type EmailJob = { id: string; order_code: string; snapshot: unknown; message: EmailMessage | null; attempts: number; first_attempt_at: string; lock_token: string };
export type EmailResult = "sent" | "failed" | "blocked" | "uncertain";
export type EmailQueue = {
  claim: (code?: string) => Promise<EmailJob | null>;
  prepare: (job: EmailJob, message: EmailMessage) => Promise<EmailMessage>;
  finish: (job: EmailJob, status: EmailResult, providerId?: string, error?: string) => Promise<void>;
};

export class EmailSendError extends Error {
  constructor(public readonly code: string, public readonly retryable: boolean) { super(code); }
}
