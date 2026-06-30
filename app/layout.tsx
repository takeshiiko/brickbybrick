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
          const MAX_MINT = 10;
          const observer = new MutationObserver(() => {
            // Cap slider at 10
            const sliderInputs = document.querySelectorAll('#mint-slider input[type="range"]');
            sliderInputs.forEach(input => {
              if (input.getAttribute('max') !== String(MAX_MINT)) {
                input.setAttribute('max', String(MAX_MINT));
                if (Number(input.value) > MAX_MINT) {
                  input.value = String(MAX_MINT);
                  input.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }
            });
          });
          observer.observe(document.body, { childList: true, subtree: true, attributes: true });
        `}</Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
