import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MainLayoutWrapper } from "@/components/layout/MainLayoutWrapper";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Second Thought — Think before you trust",
    template: "%s | Second Thought",
  },
  description:
    "A guided thinking workspace that helps people slow down, examine claims, and make their own judgment.",
  keywords: ["media literacy", "critical thinking", "reflection", "misinformation"],
  openGraph: {
    title: "Second Thought",
    description: "Before you share it, give it a second thought.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <MainLayoutWrapper>{children}</MainLayoutWrapper>
      </body>
    </html>
  );
}
