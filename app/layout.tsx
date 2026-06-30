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
          function patchSlider() {
            const sliderEl = document.getElementById('mint-slider');
            if (!sliderEl) return;
            // Find MUI slider thumb and intercept pointer events
            const inputs = sliderEl.querySelectorAll('input[type="range"]');
            inputs.forEach(input => {
              input.setAttribute('max', String(MAX_MINT));
              // Force React synthetic change
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              if (Number(input.value) > MAX_MINT) {
                nativeInputValueSetter.call(input, String(MAX_MINT));
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
              }
              if (!input.dataset.patched) {
                input.dataset.patched = '1';
                input.addEventListener('input', function() {
                  if (Number(this.value) > MAX_MINT) {
                    nativeInputValueSetter.call(this, String(MAX_MINT));
                    this.dispatchEvent(new Event('input', { bubbles: true }));
                  }
                }, true);
              }
            });
          }
          const observer = new MutationObserver(patchSlider);
          observer.observe(document.body, { childList: true, subtree: true });
          setInterval(patchSlider, 500);
        `}</Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
