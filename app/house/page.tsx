"use client";

import dynamic from "next/dynamic";

import { Shell } from "../components";

const House3DViewer = dynamic(
  () => import("../house-viewer").then((m) => m.House3DViewer),
  { ssr: false, loading: () => <div className="house-3d-loading"><span>Loading 3D model…</span></div> }
);

export default function HousePage() {

  return (
    <Shell active="house">
      <main className="house-page">
        <div className="house-split">

          {/* Left: 3D Model */}
          <div className="house-split-panel house-split-panel--3d">
            <div className="house-split-label">3D MODEL</div>
            <House3DViewer progress={1} minHeight={0} autoFit />
          </div>

          {/* Right: Floor Plan */}
          <div className="house-split-panel house-split-panel--plan">
            <div className="house-split-label">FLOOR PLAN</div>
            <img
              src="/house/floor-plan.png"
              alt="Floor Plan"
              className="floor-plan-img"
            />
          </div>

        </div>
      </main>
    </Shell>
  );
}
