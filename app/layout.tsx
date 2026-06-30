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
          // Intercept pointer/mouse/touch events before MUI processes them
          // MUI slider calculates value from click position relative to track
          // If click is in the right (max-10)/max portion, block it
          function blockSliderEvent(e) {
            const slider = document.getElementById('mint-slider');
            if (!slider || !slider.contains(e.target)) return;
            const rail = slider.querySelector('[class*="rail"], [class*="Rail"]') || slider;
            const rect = rail.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const pct = (clientX - rect.left) / rect.width;
            if (pct > MAX_MINT / 20) {
              e.stopPropagation();
              e.preventDefault();
            }
          }
          ['mousedown','pointerdown','touchstart'].forEach(ev => {
            document.addEventListener(ev, blockSliderEvent, { capture: true, passive: false });
          });
        `}</Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
