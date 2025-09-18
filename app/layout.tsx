import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const manrope = Manrope({
  subsets: ["latin"],
  variable: '--font-manrope'
});

export const metadata: Metadata = {
  title: "Qcombinator | AI-Powered Startup-Investor Matching Platform",
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
        {children}
      </body>
    </html>
  );
}
