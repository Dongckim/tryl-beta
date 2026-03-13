import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { DesktopOnlyOverlay } from "@/components/DesktopOnlyOverlay";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TRYL — AI Fashion Try-On",
  description: "See it on you, before you buy. AI-powered virtual try-on.",
  openGraph: {
    title: "TRYL — AI Fashion Try-On",
    description: "See it on you, before you buy. AI-powered virtual try-on.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TRYL — AI Fashion Try-On",
    description: "See it on you, before you buy. AI-powered virtual try-on.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-black font-sans antialiased">
        <AuthProvider>
          <DesktopOnlyOverlay />
          <Nav />
          <main className="min-h-screen overflow-x-hidden pt-16">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
