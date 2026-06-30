"use client";
import { useEffect } from "react";

export function LmnftScript() {
  useEffect(() => {
    (window as any).ownerId = "32WbqGcyPoM7pKozdW44jcosgTgVDew73GsmXMnh5LGN";
    (window as any).collectionId = "y9SSAWRdA0w6svva189R";

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://storage.googleapis.com/scriptslmt/0.1.3/solana.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://storage.googleapis.com/scriptslmt/0.1.3/solana.js";
    document.body.appendChild(script);

    (window as any).syncLmnftSlider = function (value: number) {
      const input = document.querySelector("#mint-slider input[type='range']");
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, String(value));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };
  }, []);

  return null;
}
