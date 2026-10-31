import type { Metadata } from "next";
import { AccountProfile } from "@/components/account-profile";

export const metadata: Metadata = { title: "Contul meu" };

export default function ProfilePage() {
  return <AccountProfile />;
}
