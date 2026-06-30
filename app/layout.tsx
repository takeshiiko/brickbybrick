import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Script from "next/script";

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
        <Script id="lmnft-config" strategy="beforeInteractive">{`
          window.ownerId = "32WbqGcyPoM7pKozdW44jcosgTgVDew73GsmXMnh5LGN";
          window.collectionId = "y9SSAWRdA0w6svva189R";
        `}</Script>
        <Script src="https://storage.googleapis.com/scriptslmt/0.1.3/solana.js" type="module" strategy="afterInteractive" />
        <link rel="stylesheet" href="https://storage.googleapis.com/scriptslmt/0.1.3/solana.css" />
        <Script id="lmnft-patch" strategy="afterInteractive">{`
          // Sync our custom slider to LMNFT's hidden MUI input
          window.syncLmnftSlider = function(value) {
            const lmnftInput = document.querySelector('#mint-slider input[type="range"]');
            if (!lmnftInput) return;
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(lmnftInput, String(value));
            lmnftInput.dispatchEvent(new Event('input', { bubbles: true }));
            lmnftInput.dispatchEvent(new Event('change', { bubbles: true }));
          };
        `}</Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
