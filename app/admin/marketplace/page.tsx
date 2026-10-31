import type { Metadata } from "next";
import { MarketplaceModeration } from "@/components/marketplace-moderation";
export const metadata: Metadata = { title: "Moderare marketplace", robots: { index: false, follow: false } };
export default function ModerationPage() { return <MarketplaceModeration />; }
