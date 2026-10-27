import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin-dashboard";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administrare" };
export default async function AdminPage() { const user = await requireChatGPTUser("/admin"); return <AdminDashboard owner={user.email} />; }
