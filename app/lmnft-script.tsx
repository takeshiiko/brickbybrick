"use client";
import { useEffect } from "react";

export function LmnftScript() {
  useEffect(() => {
    // Intercept Firebase callable responses to log structure and patch missing currency field
    const _fetch = window.fetch.bind(window);
    window.fetch = async function (...args: Parameters<typeof fetch>) {
      const url = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url ?? "";
      const res = await _fetch(...args);

      if (url.includes("cloudfunctions.net") || url.includes("firebaseio.com") || url.includes("firestore.googleapis")) {
        const clone = res.clone();
        clone.text().then((text) => {
          try {
            const json = JSON.parse(text);
            console.log("[LMNFT Firebase response]", url, JSON.stringify(json).slice(0, 500));
          } catch {}
        });
      }

      return res;
    };

    (window as any).ownerId = "32WbqGcyPoM7pKozdW44jcosgTgVDew73GsmXMnh5LGN";
    (window as any).collectionId = "y9SSAWRdA0w6svva189R";

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://storage.googleapis.com/scriptslmt/0.1.4/solana.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://storage.googleapis.com/scriptslmt/0.1.4/solana.js";
    document.body.appendChild(script);
  }, []);

  return null;
}
