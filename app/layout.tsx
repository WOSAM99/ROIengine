import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import TopLoader from "@/components/providers/top-loader";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ROI Dashboard",
  description: "Upload job data. See profit leaks. Ask questions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">
        <TopLoader />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
