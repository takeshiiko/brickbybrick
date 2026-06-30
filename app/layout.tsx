import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { LmnftScript } from "./lmnft-script";

export const metadata: Metadata = {
  title: "Brick by Brick",
  description: "$6 brick NFT mint website with a shared live house canvas.",
  icons: { icon: "/icon-512.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <LmnftScript />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
