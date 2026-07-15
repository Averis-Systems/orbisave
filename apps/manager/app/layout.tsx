import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { BrandingFaviconInjector } from "@/components/BrandingFaviconInjector";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "OrbiSave Manager | Country Operations",
  description: "Administrative portal for country-level OrbiSave management.",
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
      </body>
    </html>
  );
}
