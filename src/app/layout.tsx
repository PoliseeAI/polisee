import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MainLayout } from "@/components/layout";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Polisee - Personalized Legislative Impact Analyzer",
    template: "%s | Polisee"
  },
  description: "Transform complex bills into personalized impact reports. Understand how legislation affects you personally with AI-powered analysis.",
  keywords: ["legislation", "bills", "government", "policy", "analysis", "AI", "personalized", "impact"],
  authors: [{ name: "Polisee Team" }],
  creator: "Polisee",
  publisher: "Polisee",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: "Polisee - Personalized Legislative Impact Analyzer",
    description: "Transform complex bills into personalized impact reports with AI-powered analysis.",
    type: "website",
    locale: "en_US",
    siteName: "Polisee",
  },
  twitter: {
    card: "summary_large_image",
    title: "Polisee - Personalized Legislative Impact Analyzer",
    description: "Transform complex bills into personalized impact reports with AI-powered analysis.",
    creator: "@polisee",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <MainLayout>
            {children}
          </MainLayout>
        </Providers>
      </body>
    </html>
  );
}
