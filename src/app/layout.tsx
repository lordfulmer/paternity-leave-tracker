import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import BottomNav from "@/components/BottomNav";
import OfflineBanner from "@/components/OfflineBanner";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "Paternity Tracker",
  description: "8-week training, Whoop, recovery tracker",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0A0E1A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen pb-24">
        <ServiceWorkerRegistration />
        <OfflineBanner />
        <main className="max-w-2xl mx-auto px-4 pt-6 pb-8">{children}</main>
        <BottomNav />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#1A2233",
              color: "#F1F5F9",
              border: "1px solid #1F2937",
              borderRadius: "10px",
            },
            success: { iconTheme: { primary: "#10B981", secondary: "#0A0E1A" } },
            error: { iconTheme: { primary: "#EF4444", secondary: "#0A0E1A" } },
          }}
        />
      </body>
    </html>
  );
}
