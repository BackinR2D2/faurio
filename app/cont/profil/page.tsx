import type { Metadata } from "next";
import { AccountProfile } from "@/components/account-profile";
import { chatGPTSignOutPath, requireChatGPTUser } from "@/app/chatgpt-auth";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contul meu" };
export default async function ProfilePage() { const user = await requireChatGPTUser("/cont/profil"); return <AccountProfile user={{ displayName: user.displayName, email: user.email }} signOutPath={chatGPTSignOutPath("/")} />; }
