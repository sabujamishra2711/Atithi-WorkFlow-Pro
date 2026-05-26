import type { Metadata } from 'next'
import "./globals.css";
import "./local-fonts.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { LoadingProvider } from "@/components/LoadingContext";
import PaymentOverlay from "@/components/PaymentOverlay";
import { usePaymentStatus } from "@/hooks/usePaymentStatus";
import ClientPaymentWrapper from "@/components/ClientPaymentWrapper";

export const metadata: Metadata = {
  title: 'Work Flow Pro',
  description: 'Your Enterprise Solution',
  generator: 'MS Coders',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="inter-fallback">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <LoadingProvider>
            <ClientPaymentWrapper />
            {children}
            <Toaster position="top-right" />
          </LoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}