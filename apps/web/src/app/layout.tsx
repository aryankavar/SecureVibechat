import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AnalyticsProvider } from "@/components/layout/AnalyticsProvider";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecureVibeChat",
  description: "End-to-End Encrypted Messaging",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased h-[100dvh] w-full overflow-hidden">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AnalyticsProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </AnalyticsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
