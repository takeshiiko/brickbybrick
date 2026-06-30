"use client";
import { useEffect } from "react";

export function LmnftScript() {
  useEffect(() => {
    const _fetch = window.fetch.bind(window);
    window.fetch = async function (...args: Parameters<typeof fetch>) {
      const url = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url ?? "";
      const res = await _fetch(...args);

      // Patch getDocForEmbed: inject currency:null so SOL collections work
      if (url.includes("getDocForEmbed")) {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          if (json?.result && json.result.currency === undefined) {
            json.result.currency = null;
          }
          return new Response(JSON.stringify(json), {
            status: res.status,
            statusText: res.statusText,
            headers: res.headers,
          });
        } catch {
          return new Response(text, { status: res.status, statusText: res.statusText, headers: res.headers });
        }
      }

      // Patch solana.js: fix oVn to respect isOptional accounts
      if (url.includes("scriptslmt") && url.endsWith("solana.js")) {
        const text = await res.text();
        // oVn throws for any undefined account, even optional ones.
        // Fix: skip the check when r.isOptional is true.
        const patched = text.replace(
          "else if(t[r.name]===void 0)throw new Error(`Invalid arguments: ${r.name} not provided.`)",
          "else if(t[r.name]===void 0&&!r.isOptional)throw new Error(`Invalid arguments: ${r.name} not provided.`)"
        );
        return new Response(patched, {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
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
