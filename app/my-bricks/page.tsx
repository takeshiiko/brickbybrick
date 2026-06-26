"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Shell } from "../components";

export default function MyBricksPage() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  const shortKey = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : null;

  return (
    <Shell active="bricks">
      <main className="my-bricks-page">
        {!connected ? (
          <div className="bricks-empty-state">
            <div className="bricks-empty-icon">🧱</div>
            <h2>Connect your wallet</h2>
            <p>Connect your wallet to view your brick NFTs.</p>
            <button className="mint-cta" onClick={() => setVisible(true)}>
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="bricks-empty-state">
            <div className="bricks-empty-icon">📭</div>
            <h2>No bricks yet</h2>
            <p>
              No bricks found in <span className="wallet-addr">{shortKey}</span>.
            </p>
            <a href="/" className="mint-cta" style={{ display: "inline-block", textDecoration: "none" }}>
              Mint a Brick →
            </a>
          </div>
        )}
      </main>
    </Shell>
  );
}
