import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { LmnftScript } from "./lmnft-script";

export const metadata: Metadata = {
  title: "Brick by Brick",
  description: undefined,
  icons: { icon: "/icon-512.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="https://storage.googleapis.com/scriptslmt/0.1.4/solana.js" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="https://storage.googleapis.com/scriptslmt/0.1.4/solana.css" as="style" crossOrigin="anonymous" />
      </head>
      <body>
        <LmnftScript />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
