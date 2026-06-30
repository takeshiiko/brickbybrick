"use client";

import { Shell } from "../components";

export default function MyBricksPage() {
  return (
    <Shell active="bricks">
      <main className="my-bricks-page">
        <div className="bricks-empty-state">
          <div className="bricks-empty-icon">🧱</div>
          <h2>Your Bricks</h2>
          <p>Connect your wallet in the mint panel to view your brick NFTs.</p>
          <a href="/" className="mint-cta" style={{ display: "inline-block", textDecoration: "none" }}>
            Mint a Brick →
          </a>
        </div>
      </main>
    </Shell>
  );
}
