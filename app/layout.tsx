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
      <head />
      <body>
        <LmnftScript />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
