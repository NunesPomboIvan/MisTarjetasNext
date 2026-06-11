import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { PWARegister } from "@/components/shared/pwa-register";
import { SplashScreen } from "@/components/shared/splash-screen";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Mis Tarjetas",
    template: "%s | Mis Tarjetas",
  },
  description: "Gestión personal de tarjetas de crédito y gastos",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mis Tarjetas",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Sin "cover", iOS no extiende la app bajo el notch/home indicator y todos
  // los env(safe-area-inset-*) valen 0 — los paddings de safe area no harían nada.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0a14" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <SplashScreen />
          <Toaster richColors position="top-center" />
          <PWARegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
