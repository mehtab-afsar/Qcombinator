import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/auth/hooks/useAuth";
import { QScoreProvider } from "@/features/qscore/hooks/useQScore";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });
const manrope = Manrope({
  subsets: ["latin"],
  variable: '--font-manrope'
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://edgealpha.ai'

export const metadata: Metadata = {
  title: "Edge Alpha | AI-Powered Startup OS",
  description: "The AI-powered operating system for founders — Q-Score, intelligent agents, and investor matching in one platform.",
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: "Edge Alpha | AI-Powered Startup OS",
    description: "The AI-powered operating system for founders — Q-Score, intelligent agents, and investor matching in one platform.",
    url: APP_URL,
    siteName: "Edge Alpha",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Edge Alpha | AI-Powered Startup OS",
    description: "The AI-powered operating system for founders — Q-Score, intelligent agents, and investor matching in one platform.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${manrope.variable} antialiased`}>
        <AuthProvider>
          <QScoreProvider>
            {children}
            <Toaster position="top-right" richColors />
          </QScoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
