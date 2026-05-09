import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

// Editorial display face — Fraunces variable. Soft optical-size axis +
// SOFT axis (gives it a subtler, more premium tone vs default sharp Fraunces).
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Stellar — Live Celebrity Activity Map",
  description:
    "Track public activity of the world's biggest stars on a live, interactive map. Tour dates, premieres, public appearances, and verified social moments — all in one constellation.",
  applicationName: "Stellar",
  openGraph: {
    title: "Stellar — Live Celebrity Activity Map",
    description: "A live, interactive map of public celebrity activity.",
    type: "website",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#07070b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      {/* suppressHydrationWarning here too: wallet/anti-tracker browser extensions
          (Trust Wallet, Bitdefender, etc.) inject attributes onto <body> before
          React hydrates and trigger a mismatch warning. The injection is benign;
          we don't render anything browser-extension-specific ourselves. */}
      <body className="font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
