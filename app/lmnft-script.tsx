"use client";
import { useEffect } from "react";

export function LmnftScript() {
  useEffect(() => {
    const _fetch = window.fetch.bind(window);
    window.fetch = async function (...args: Parameters<typeof fetch>) {
      const url = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url ?? "";
      const res = await _fetch(...args);

      if (url.includes("getDocForEmbed")) {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          // For SOL collections, currency is absent. Anchor requires the program ID
          // as a placeholder for absent optional accounts (signals isMut/isSigner = false).
          if (json?.result && (json.result.currency === undefined || json.result.currency === null)) {
            json.result.currency = "F9SixdqdmEBP5kprp2gZPZNeMmfHJRCTMFjN22dx3akf";
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

      return res;
    };

    (window as any).ownerId = "32WbqGcyPoM7pKozdW44jcosgTgVDew73GsmXMnh5LGN";
    (window as any).collectionId = "y9SSAWRdA0w6svva189R";

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://storage.googleapis.com/scriptslmt/0.1.4/solana.css";
    document.head.appendChild(link);

    // Watch for LMNFT's MUI Snackbar and replace with themed notification
    const observer = new MutationObserver(() => {
      const snackbar = document.querySelector(".MuiSnackbar-root") as HTMLElement | null;
      if (!snackbar || snackbar.dataset.themed) return;
      snackbar.dataset.themed = "1";

      const alert = snackbar.querySelector(".MuiAlert-root") as HTMLElement | null;
      const isSuccess = snackbar.querySelector(".MuiAlert-filledSuccess") !== null;
      const msgEl = snackbar.querySelector(".MuiAlert-message");
      const msg = msgEl?.textContent ?? (isSuccess ? "Mint successful" : "Mint failed");

      // Hide original snackbar
      snackbar.style.display = "none";

      // Build themed toast
      const toast = document.createElement("div");
      toast.style.cssText = [
        "position:fixed",
        "top:16px",
        "right:16px",
        "z-index:9999",
        "display:flex",
        "align-items:center",
        "gap:10px",
        "padding:10px 16px",
        `background:${isSuccess ? "#0d1f0d" : "#1f0d0d"}`,
        `border:1px solid ${isSuccess ? "rgba(100,220,74,0.4)" : "rgba(220,74,74,0.4)"}`,
        "box-shadow:0 0 0 1px rgba(0,0,0,0.6),0 4px 20px rgba(0,0,0,0.5)",
        "font-family:'Courier New',monospace",
        "font-size:12px",
        "letter-spacing:0.06em",
        `color:${isSuccess ? "#8ddc6a" : "#dc6a6a"}`,
        "pointer-events:none",
        "opacity:0",
        "transition:opacity 0.2s",
      ].join(";");

      const dot = document.createElement("span");
      dot.style.cssText = `width:6px;height:6px;border-radius:50%;background:${isSuccess ? "#8ddc6a" : "#dc6a6a"};flex-shrink:0`;

      const label = document.createElement("span");
      label.textContent = isSuccess ? "✓ " + msg.toUpperCase() : "✕ " + msg.toUpperCase();

      toast.appendChild(dot);
      toast.appendChild(label);
      document.body.appendChild(toast);

      requestAnimationFrame(() => { toast.style.opacity = "1"; });
      setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Fetch solana.js manually so we can patch oVn before execution
    _fetch("https://storage.googleapis.com/scriptslmt/0.1.4/solana.js")
      .then((r) => r.text())
      .then((text) => {
        // oVn throws for undefined optional accounts — fix to respect isOptional
        const p1 = text.replaceAll(
          "else if(t[r.name]===void 0)throw new Error(`Invalid arguments: ${r.name} not provided.`)",
          "else if(t[r.name]===void 0&&!r.isOptional)throw new Error(`Invalid arguments: ${r.name} not provided.`)"
        );
        // Cap slider max at 10 (per-wallet limit)
        const p2 = p1.replace(
          "step:1,max:20,min:1",
          "step:1,max:10,min:1"
        );
        // accountsArray throws for null/undefined optional accounts — use programId as Anchor placeholder
        const patched = p2.replaceAll(
          `else{let s=o,u;try{u=dM(t[o.name])}catch{throw new Error(\`Wrong input type for account "\${o.name}" in the instruction accounts object\${i!==void 0?' for instruction "'+i+'"':""}. Expected PublicKey or string.\`)}`,
          `else{let s=o,u;if(s.isOptional&&(t[o.name]===void 0||t[o.name]===null)){u=new Us.PublicKey(n)}else{try{u=dM(t[o.name])}catch{throw new Error(\`Wrong input type for account "\${o.name}" in the instruction accounts object\${i!==void 0?' for instruction "'+i+'"':""}. Expected PublicKey or string.\`)}}`
        );
        const blob = new Blob([patched], { type: "application/javascript" });
        const blobUrl = URL.createObjectURL(blob);
        const script = document.createElement("script");
        script.type = "module";
        script.src = blobUrl;
        document.body.appendChild(script);
      });
  }, []);

  return null;
}
