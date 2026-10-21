import type { Metadata } from "next";
import { JdMobileApp } from "@/components/app/JdMobileApp";

export const metadata: Metadata = {
  title: "App JD Consultoria",
  description: "Conversas e backups protegidos do WhatsApp da JD Consultoria.",
};

export default function AppPage() {
  return <JdMobileApp/>;
}
