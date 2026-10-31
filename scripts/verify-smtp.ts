import nextEnv from "@next/env";
import nodemailer from "nodemailer";
import { readEmailConfig } from "../lib/email/config.ts";
import { smtpOptions } from "../lib/email/smtp.ts";

nextEnv.loadEnvConfig(process.cwd());
const config=readEmailConfig();
if(config?.provider!=="smtp") { console.log("SMTP is not configured. No messages sent."); process.exitCode=2; }
else {
  const transport=nodemailer.createTransport(smtpOptions(config));
  try { await transport.verify(); console.log("SMTP connection and authentication verified. No message sent; inbox delivery is not yet verified."); }
  catch { console.error("SMTP verification failed. Check App Password, TLS port and institutional policy. No credentials were printed."); process.exitCode=2; }
  finally { transport.close(); }
}
