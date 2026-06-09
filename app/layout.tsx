import type { Metadata } from "next";
import { Inter, Manrope, Fraunces, JetBrains_Mono, IBM_Plex_Mono, Inter_Tight } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/auth/hooks/useAuth";
import { QScoreProvider } from "@/features/qscore/hooks/useQScore";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { Toaster } from "sonner";
import { APP_NAME, APP_TAGLINE, APP_URL as APP_BASE_URL } from "@/lib/constants/app";

const inter = Inter({ subsets: ["latin"] });
const manrope = Manrope({
  subsets: ["latin"],
  variable: '--font-manrope'
});
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
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  weight: ["300", "400", "500"],
});
const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  weight: ["400", "500", "700", "800", "900"],
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
      <body className={`${inter.className} ${manrope.variable} ${fraunces.variable} ${jetbrainsMono.variable} ${ibmPlexMono.variable} ${interTight.variable} antialiased`}>
        <PostHogProvider>
          <AuthProvider>
            <QScoreProvider>
              {children}
              <Toaster position="top-right" richColors />
            </QScoreProvider>
          </AuthProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
