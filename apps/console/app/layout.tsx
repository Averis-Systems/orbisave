import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

import { Toaster } from "sonner";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });

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
      <body className={`${outfit.variable} ${outfit.className} h-full antialiased text-[#0a2540]`}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
