import type { Metadata } from "next";
import { SellerApplication } from "@/components/seller-application";
export const metadata: Metadata = { title: "Deschide-ți atelierul", description: "Creează un spațiu al tău pentru obiecte handmade și povestea lor." };
export default function SellPage() { return <SellerApplication />; }
