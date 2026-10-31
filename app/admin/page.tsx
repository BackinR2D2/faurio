import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin-dashboard";

export const metadata: Metadata = { title: "Administrare" };

export default function AdminPage() {
  return <AdminDashboard />;
}
