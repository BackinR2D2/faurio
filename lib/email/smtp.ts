import nodemailer from "nodemailer";
import { EmailSendError, type EmailMessage } from "./contracts.ts";
import type { EmailConfig } from "./config.ts";

export function smtpOptions(config: Extract<EmailConfig, { provider: "smtp" }>) {
  return { host: config.smtp.host, port: config.smtp.port, secure: config.smtp.port === 465, requireTLS: true,
    auth: { user: config.smtp.user, pass: config.smtp.password }, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000,
    tls: { minVersion: "TLSv1.2" as const }, disableFileAccess: true, disableUrlAccess: true };
}

export async function sendSmtpEmail(message: EmailMessage, id: string, config: Extract<EmailConfig, { provider: "smtp" }>) {
  const transport = nodemailer.createTransport(smtpOptions(config));
  try {
    const result = await transport.sendMail({ from: message.from, to: message.to, replyTo: message.reply_to,
      subject: message.subject, html: message.html, text: message.text,
      messageId: `<faurio-order-${id}@${config.fromEmail.split("@")[1]}>` });
    if (!result.accepted.length || result.rejected.length) throw new EmailSendError("SMTP_RECIPIENT_REJECTED", false);
    return result.messageId;
  } catch (error) {
    if (error instanceof EmailSendError) throw error;
    const code = (error as { code?: string }).code;
    throw new EmailSendError(code === "EAUTH" ? "SMTP_AUTH_FAILED" : "SMTP_DELIVERY_UNCERTAIN", code !== "EAUTH");
  } finally { transport.close(); }
}
