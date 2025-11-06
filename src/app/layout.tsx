import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/lib/providers/auth-provider";
import { ConfirmProvider } from "@/components/ui/confirm-provider";
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
        <AuthProvider>
          <ConfirmProvider>
            {children}
            <Toaster position="top-center" />
          </ConfirmProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
