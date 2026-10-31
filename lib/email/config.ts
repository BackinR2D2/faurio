import { z } from "zod";

const commonSchema = z.object({
  fromEmail: z.email(), replyTo: z.email().optional(),
  siteUrl: z.url().refine((value) => ["https:", "http:"].includes(new URL(value).protocol)),
});
const resendSchema = commonSchema.extend({ provider: z.literal("resend").optional(), apiKey: z.string().regex(/^re_[A-Za-z0-9_-]+$/) });
const smtpSchema = commonSchema.extend({ provider: z.literal("smtp"), smtp: z.object({
  host: z.string().regex(/^[a-z0-9][a-z0-9.-]+$/i), port: z.union([z.literal(465), z.literal(587)]), user: z.email(), password: z.string().min(8),
}) }).refine((value) => value.fromEmail.toLowerCase() === value.smtp.user.toLowerCase(), "SMTP sender must match the authenticated mailbox.");
export type EmailConfig = z.infer<typeof resendSchema> | z.infer<typeof smtpSchema>;

export function readEmailConfig(env: Record<string, string | undefined> = process.env): EmailConfig | null {
  const common = { fromEmail: env.EMAIL_FROM, replyTo: env.EMAIL_REPLY_TO || undefined, siteUrl: env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000" };
  const result = env.EMAIL_PROVIDER === "smtp" ? smtpSchema.safeParse({ ...common, provider: "smtp", smtp: {
    host: env.SMTP_HOST, port: Number(env.SMTP_PORT || 465), user: env.SMTP_USER, password: env.SMTP_PASS,
  } }) : resendSchema.safeParse({ ...common, apiKey: env.RESEND_API_KEY });
  return result.success ? result.data : null;
}
