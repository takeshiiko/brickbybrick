"use client";

import dynamic from "next/dynamic";
import { Shell } from "../components";

const House3DViewer = dynamic(
  () => import("../house-viewer").then((m) => m.House3DViewer),
  { ssr: false, loading: () => <div className="house-3d-loading"><span>Loading…</span></div> }
);

export default function HousePage() {
  return (
    <Shell active="house">
      <main className="house-page">
        <div className="house-split">
          <div className="house-split-panel house-split-panel--3d">
            <div className="house-split-label">3D MODEL</div>
            <House3DViewer progress={1} minHeight={0} autoFit />
          </div>
          <div className="house-split-panel house-split-panel--plan">
            <div className="house-split-label">FLOOR PLAN</div>
            <img src="/house/floor-plan.png" alt="Floor Plan" className="floor-plan-img" />
          </div>
        </div>

        {/* About section */}
        <section className="house-about">
          <div className="house-about-inner">

            <div className="house-about-block">
              <div className="house-about-tag">ABOUT THE COLLECTION</div>
              <h2 className="house-about-title">Brick by Brick</h2>
              <p className="house-about-text">Every house starts with a single brick.</p>
              <p className="house-about-text">This collection isn't about promises of utility or roadmap buzzwords. It's about building something real.</p>
              <p className="house-about-text">My family inherited a piece of land from my grandfather. Instead of letting it remain an empty plot, I decided to turn it into a home — one brick at a time.</p>
              <p className="house-about-text">That's what Brick by Brick represents.</p>
            </div>

            <div className="house-about-block">
              <div className="house-about-tag">&nbsp;</div>
              <h2 className="house-about-title" style={{opacity: 0}}>—</h2>
              <p className="house-about-text">10,000 digital bricks. 10,000 people who become part of a story that's meant to exist beyond the blockchain.</p>
              <p className="house-about-text">If this collection sells out, every mint will become part of the foundation of a real house built on my grandfather's land that has been passed down through my family.</p>
              <p className="house-about-text">The NFTs are the bricks. The house is the proof.</p>
              <p className="house-about-text">Throughout the journey, I'll openly document every stage — from the empty land to the finished home — so the community can watch something physical emerge from a digital collection.</p>
              <p className="house-about-text"><strong>Build something real, together. One brick at a time.</strong></p>
            </div>

          </div>
        </section>
      </main>
    </Shell>
  );
}
