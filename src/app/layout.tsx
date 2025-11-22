import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/lib/providers/auth-provider";
import { ConfirmProvider } from "@/components/ui/confirm-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// 根据环境变量构建标题
const envName = process.env["NEXT_PUBLIC_ENV_NAME"];
const baseTitle = envName ? `Spider Mind (${envName})` : "Spider Mind";

export const metadata: Metadata = {
  title: baseTitle,
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
