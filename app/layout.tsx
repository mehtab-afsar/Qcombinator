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

export const metadata: Metadata = {
  title: "Edge Alpha | AI-Powered Startup-Investor Matching Platform",
  description: "The most intelligent platform connecting founders with investors through AI-powered analysis and matching",
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
