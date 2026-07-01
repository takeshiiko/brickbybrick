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
      snackbar.style.display = "none";

      // Wait a tick for MUI to apply severity classes
      setTimeout(() => {
        const msgEl = snackbar.querySelector(".MuiAlert-message");
        const msg = msgEl?.textContent ?? "";
        const isSuccess = snackbar.querySelector(".MuiAlert-filledSuccess") !== null
          || msg.toLowerCase().includes("success");

        const bg    = isSuccess ? "rgba(10,30,14,0.97)"  : "rgba(30,10,10,0.97)";
        const border= isSuccess ? "rgba(20,241,149,0.5)" : "rgba(255,80,80,0.5)";
        const color = isSuccess ? "#14f195"               : "#ff5c5c";
        const icon  = isSuccess ? "✓" : "✕";
        const text  = msg.toUpperCase() || (isSuccess ? "MINT SUCCESS" : "MINT FAILED");

        const toast = document.createElement("div");
        toast.style.cssText = [
          "position:fixed",
          "top:16px",
          "right:16px",
          "z-index:9999",
          "display:flex",
          "align-items:center",
          "gap:10px",
          "padding:11px 18px",
          `background:${bg}`,
          `border:1px solid ${border}`,
          `box-shadow:0 0 0 1px rgba(0,0,0,0.7),0 0 24px ${isSuccess ? "rgba(20,241,149,0.15)" : "rgba(255,80,80,0.15)"},0 4px 20px rgba(0,0,0,0.6)`,
          "font-family:'Courier New',monospace",
          "font-size:12px",
          "letter-spacing:0.08em",
          `color:${color}`,
          "pointer-events:none",
          "opacity:0",
          "transition:opacity 0.25s",
        ].join(";");

        const iconEl = document.createElement("span");
        iconEl.style.cssText = `font-size:14px;font-weight:bold;color:${color}`;
        iconEl.textContent = icon;

        const labelEl = document.createElement("span");
        labelEl.textContent = text;

        toast.appendChild(iconEl);
        toast.appendChild(labelEl);
        document.body.appendChild(toast);

        requestAnimationFrame(() => { toast.style.opacity = "1"; });
        setTimeout(() => {
          toast.style.opacity = "0";
          setTimeout(() => toast.remove(), 300);
        }, 4000);
      }, 50);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // When Phantom approves, LMNFT's React wallet context doesn't update on its
    // own because the adapter's connect() call already resolved and the state is
    // stuck. Fix: patch solana.js to expose select+connect globally, then call
    // select("Phantom") → connect() so LMNFT's context picks up the publicKey.
    const solana = (window as any).solana;
    if (solana) {
      solana.on?.("connect", () => {
        try { localStorage.setItem("walletName", "Phantom"); } catch {}
        setTimeout(() => {
          const mintBtn = document.querySelector("#mint-button-container button:not(.wallet-adapter-button-trigger)");
          if (mintBtn) return; // already showing Mint button
          const sel = (window as any).__lmnftWalletSelect;
          const conn = (window as any).__lmnftWalletConnect;
          if (sel && conn) {
            sel("Phantom");
            setTimeout(() => conn().catch(() => {}), 150);
          } else {
            // Fallback: re-click LMNFT's own wallet button
            const walletBtn = document.querySelector(".wallet-adapter-button-trigger") as HTMLElement | null;
            if (walletBtn) walletBtn.click();
          }
        }, 600);
      });
    }

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
        // Expose LMNFT's wallet select+connect functions so we can call them
        // externally after Phantom approves, forcing the React context to update.
        const p3 = p2.replace(
          "return Bu.default.createElement($Ut.Provider,{value:{autoConnect:!!i,wallets:L,wallet:q,publicKey:b,connected:S,connecting:c,disconnecting:h,select:s,connect:P,disconnect:g,",
          "window.__lmnftWalletSelect=s;window.__lmnftWalletConnect=P;return Bu.default.createElement($Ut.Provider,{value:{autoConnect:!!i,wallets:L,wallet:q,publicKey:b,connected:S,connecting:c,disconnecting:h,select:s,connect:P,disconnect:g,"
        );
        // accountsArray throws for null/undefined optional accounts — use programId as Anchor placeholder
        const patched = p3.replaceAll(
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
