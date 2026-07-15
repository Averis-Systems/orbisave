import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

import { Toaster } from "sonner";
import { BrandingFaviconInjector } from "@/components/BrandingFaviconInjector";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "OrbiSave Console | Global Oversight",
  description: "Administrative console for OrbiSave platform management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-[#f8fafc]">
      <body className={`${montserrat.variable} ${montserrat.className} h-full antialiased text-[#0a2540]`}>
        <BrandingFaviconInjector />
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
