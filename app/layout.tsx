import type { Metadata } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { ToastProvider } from "@/features/shared/hooks/useToast";
import { Toaster } from "sonner";
import { APP_NAME, APP_TAGLINE, APP_URL as APP_BASE_URL } from "@/lib/constants/app";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
  style: ["italic", "normal"],
  weight: "variable",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

const TITLE = `${APP_NAME} | ${APP_TAGLINE}`
const DESCRIPTION = "The AI-powered operating system for founders — Q-Score, intelligent agents, and investor matching in one platform."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL(APP_BASE_URL),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: APP_BASE_URL,
    siteName: APP_NAME,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${inter.className} ${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable} antialiased`}>
        {/* AuthProvider and QScoreProvider deliberately do NOT live here. Both pull in the
            Supabase browser client (~197KB), so wrapping every route in them meant a stranger
            reading the marketing page downloaded the whole authenticated app before seeing a
            headline. They now sit in app/founder/layout.tsx and app/investor/layout.tsx — the
            only places anything consumes them (audited: every useAuth/useQScore call site is
            under one of those two route groups). */}
        <PostHogProvider>
          <ToastProvider>
            {children}
            <Toaster position="top-right" richColors />
          </ToastProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
