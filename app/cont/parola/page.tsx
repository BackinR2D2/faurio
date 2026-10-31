import type { Metadata } from "next";
import { PasswordRecovery } from "@/components/password-recovery";

export const metadata: Metadata = { title: "Parolă nouă", robots: { index: false, follow: false } };

export default function PasswordRecoveryPage() { return <PasswordRecovery />; }
