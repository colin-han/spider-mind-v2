import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Spider Mind v2",
  description: "Spider Mind v2 - Next generation knowledge management system",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
