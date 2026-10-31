import type { Metadata } from "next";
import { AccountEntry } from "@/components/account-entry";

export const metadata: Metadata = { title: "Cont" };

export default function AccountPage() {
  return <AccountEntry />;
}
