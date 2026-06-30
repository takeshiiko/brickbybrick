"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

const House3DViewer = dynamic(
  () => import("./house-viewer").then((m) => m.House3DViewer),
  { ssr: false, loading: () => <div className="house-3d-loading"><span>Loading 3D model…</span></div> }
);

type Rarity = "Common" | "Uncommon" | "Rare" | "Legendary" | "Mythic";

type Brick = {
  id: number;
  rarity: Rarity;
  type: string;
  zone: string;
};

const TOTAL_SUPPLY = 10000;
const mintedStart = 6428;

const rarityMeta: Record<Rarity, { color: string; odds: string; supply: string }> = {
  Common: { color: "#c8512c", odds: "77.5%", supply: "7,750" },
  Uncommon: { color: "#ef9b3b", odds: "13%", supply: "1,300" },
  Rare: { color: "#42c6e7", odds: "7%", supply: "700" },
  Legendary: { color: "#ffd84a", odds: "2%", supply: "200" },
  Mythic: { color: "#b44fff", odds: "0.5%", supply: "50" },
};

const sampleBricks: Brick[] = [
  { id: 944, rarity: "Common", type: "Wall Brick", zone: "Main wall" },
  { id: 121, rarity: "Uncommon", type: "Window Brick", zone: "East window" },
  { id: 237, rarity: "Rare", type: "Roof Tile", zone: "Upper roof" },
  { id: 310, rarity: "Legendary", type: "Roof Peak", zone: "Final reveal marker" },
  { id: 1, rarity: "Mythic", type: "Solana Brick", zone: "Genesis" },
];

const rarityTypeMap: Record<Rarity, string> = {
  Common: "Wall Brick",
  Uncommon: "Window Brick",
  Rare: "Roof Tile",
  Legendary: "Roof Peak",
  Mythic: "Solana Brick",
};

const numberFormatter = new Intl.NumberFormat("en-US");
const formatNumber = (value: number) => numberFormatter.format(value);

function pickReveal(seed: number): Rarity {
  const r = (Math.sin(seed * 9301 + 49297) * 233280) % 1;
  const n = Math.abs(r);
  if (n < 0.02) return "Legendary";
  if (n < 0.09) return "Rare";
  if (n < 0.22) return "Uncommon";
  return "Common";
}

function useCanvasHouse(canvasRef: React.RefObject<HTMLCanvasElement>, progress: number, animated: boolean) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx = context;

    let frame = 0;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = 900, H = 625;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    ctx.scale(dpr, dpr);

    // ── Grid params ──────────────────────────────────────────────
    // BW×BH cell size; actual brick is (BW-1)×(BH-1) with 1px mortar gap
    const BW = 11, BH = 6;
    const COLS = 68;
    const BODY_ROWS = 44;
    const ROOF_ROWS = 33;   // narrows 2 cols per row: 68→2
    const CHIMNEY_COLS = 5, CHIMNEY_ROWS = 11;
    const HL = 66;   // house left x
    const HB = 576;  // house bottom y

    // ── Architectural features ────────────────────────────────────
    // Windows [bodyRow_start, bodyRow_end, col_start, col_end]
    const WINS: [number,number,number,number][] = [
      [5, 19,  2, 13],   // GF far-left
      [5, 19, 16, 27],   // GF left
      [5, 19, 40, 51],   // GF right
      [5, 19, 54, 65],   // GF far-right
      [24, 36,  2, 13],  // 1F far-left
      [24, 36, 15, 26],  // 1F left-center
      [24, 36, 28, 39],  // 1F center
      [24, 36, 41, 52],  // 1F right-center
      [24, 36, 54, 65],  // 1F far-right
    ];
    const DOOR: [number,number,number,number] = [2, 19, 29, 38];

    const inWin   = (br: number, c: number) => WINS.find(([r0,r1,c0,c1]) => br>=r0&&br<=r1&&c>=c0&&c<=c1);
    const inDoor  = (br: number, c: number) => { const [r0,r1,c0,c1]=DOOR; return br>=r0&&br<=r1&&c>=c0&&c<=c1; };
    // Lintel (1 row above) or sill (1 row below) of any window/door
    const isLintel = (br: number, c: number) => WINS.some(([r0,,c0,c1]) => br===r0-1 && c>=c0 && c<c1)
      || (()=>{ const [r0,,c0,c1]=DOOR; return br===r0-1&&c>=c0&&c<c1; })();
    const isSill   = (br: number, c: number) => WINS.some(([,r1,c0,c1]) => br===r1+1 && c>=c0 && c<c1)
      || (()=>{ const [,r1,c0,c1]=DOOR; return br===r1+1&&c>=c0&&c<c1; })();

    // ── Color palettes ────────────────────────────────────────────
    const BRICKS   = ["#B42E10","#A02408","#C03818","#942000","#B03014","#BE3E18"];
    const STONE    = ["#8A9298","#7C8690","#929EA4","#707880","#9EA8AE","#848E94"];
    const ROOFTILE = ["#1E2A36","#182030","#243040","#1A2432","#202C3A"];
    const MORTAR   = "#080A0B";

    function brickCol(br: number, c: number): string {
      if (br < 6) return STONE[(br*7+c*3) % STONE.length];
      if (br === 20 || br === 21) return STONE[(br*5+c*2) % STONE.length]; // cornice band
      return BRICKS[(br*7+c*3) % BRICKS.length];
    }

    // ── Total cell count ──────────────────────────────────────────
    let roofTotal = 0;
    for (let r=0; r<ROOF_ROWS; r++)
      roofTotal += Math.max(2, COLS - r*2);
    const TOTAL_CELLS = BODY_ROWS*COLS + roofTotal + CHIMNEY_COLS*CHIMNEY_ROWS;
    const FILLED = Math.floor(progress * TOTAL_CELLS);

    // ── Helper: draw one brick cell ───────────────────────────────
    function drawBrick(x: number, y: number, color: string, frontier = false) {
      // Mortar background
      ctx.fillStyle = MORTAR;
      ctx.fillRect(x, y, BW, BH);
      // Actual brick (1px smaller each side for mortar gap)
      ctx.fillStyle = color;
      ctx.fillRect(x, y, BW-1, BH-1);
      // Top highlight
      ctx.fillStyle = "rgba(255,255,255,0.11)";
      ctx.fillRect(x, y, BW-1, 1);
      // Bottom shadow
      ctx.fillStyle = "rgba(0,0,0,0.26)";
      ctx.fillRect(x, y+BH-2, BW-1, 1);
      // Frontier sparkle
      if (frontier) {
        ctx.fillStyle = "rgba(255,210,60,0.22)";
        ctx.fillRect(x, y, BW-1, BH-1);
      }
    }

    function drawEmptyBrick(x: number, y: number, roofSlot = false) {
      ctx.fillStyle = roofSlot ? "#111820" : "#161D22";
      ctx.fillRect(x, y, BW-1, BH-1);
    }

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, W, H);

      // ── Background ────────────────────────────────────────────
      const bg = ctx.createLinearGradient(0,0,W,H);
      bg.addColorStop(0,"#0E1114"); bg.addColorStop(0.5,"#07090A"); bg.addColorStop(1,"#100E0C");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Blueprint grid lines
      ctx.strokeStyle = "rgba(66,198,231,0.09)"; ctx.lineWidth = 0.5;
      for (let x=36; x<W; x+=36) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x-130,H); ctx.stroke(); }
      for (let y=28; y<H; y+=32) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y+120); ctx.stroke(); }

      // ── Draw house body ───────────────────────────────────────
      let drawn   = 0;
      let frontierY = -1;
      const FRONTIER_TRAIL = 120; // cells behind frontier that glow

      for (let br=0; br<BODY_ROWS; br++) {
        for (let c=0; c<COLS; c++) {
          const x = HL + c*BW;
          const y = HB - (br+1)*BH;
          const active   = drawn < FILLED;
          const frontier = drawn >= FILLED - FRONTIER_TRAIL && drawn < FILLED;

          if (!active && frontierY < 0) frontierY = y + BH;

          const win  = inWin(br, c);
          const door = inDoor(br, c);

          if (door) {
            if (active) {
              const [r0,,c0,c1] = DOOR;
              const isSide = c===c0 || c===c1-1;
              const isTop  = br===r0;
              ctx.fillStyle = MORTAR; ctx.fillRect(x,y,BW,BH);
              if (isSide || isTop) {
                // Stone/cream door frame
                ctx.fillStyle = "#B8C2C8"; ctx.fillRect(x,y,BW-1,BH-1);
                ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(x,y,BW-1,1);
                ctx.fillStyle = "rgba(0,0,0,0.14)"; ctx.fillRect(x,y+BH-2,BW-1,1);
              } else {
                // Dark wood panels
                const relR = br-r0-1, relC = c-c0-1;
                const dH = DOOR[1]-r0-2, dW = c1-c0-2;
                const midDR = Math.floor(dH/2), midDC = Math.floor(dW/2);
                ctx.fillStyle = "#1C1108"; ctx.fillRect(x,y,BW-1,BH-1);
                // Panel groove lines
                if (relC===0||relC===midDC) { ctx.fillStyle="rgba(255,255,255,0.05)"; ctx.fillRect(x,y,1,BH-1); }
                if (relR===0||relR===midDR) { ctx.fillStyle="rgba(255,255,255,0.04)"; ctx.fillRect(x,y,BW-1,1); }
                // Ambient wood sheen
                ctx.fillStyle = "rgba(255,200,100,0.03)"; ctx.fillRect(x,y,BW-1,BH-1);
              }
              // Brass knob
              if (br === r0+Math.floor((DOOR[1]-r0)*0.55) && c === c0+1) {
                ctx.fillStyle="#C8921C"; ctx.fillRect(x+BW-4,y+BH/2-1,3,3);
                ctx.fillStyle="rgba(255,230,100,0.6)"; ctx.fillRect(x+BW-4,y+BH/2-1,1,1);
              }
            } else { drawEmptyBrick(x,y); }

          } else if (win) {
            if (active) {
              const [r0,r1,c0,c1] = win;
              const mr = Math.floor((r0+r1)/2);
              const mc = Math.floor((c0+c1)/2);
              const isFrame = c===c0||c===c1-1||br===r0||br===r1;
              ctx.fillStyle = MORTAR; ctx.fillRect(x,y,BW,BH);
              if (isFrame) {
                // Stone window frame — lighter gray
                ctx.fillStyle = "#8A9298"; ctx.fillRect(x,y,BW-1,BH-1);
                ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillRect(x,y,BW-1,1);
                ctx.fillStyle = "rgba(0,0,0,0.20)"; ctx.fillRect(x,y+BH-2,BW-1,1);
                if (c===c0)   { ctx.fillStyle="rgba(255,255,255,0.10)"; ctx.fillRect(x,y,1,BH-1); }
                if (c===c1-1) { ctx.fillStyle="rgba(0,0,0,0.14)"; ctx.fillRect(x+BW-2,y,1,BH-1); }
              } else {
                // Very dark navy glass — like reference
                ctx.fillStyle = "#151E2C"; ctx.fillRect(x,y,BW-1,BH-1);
                ctx.fillStyle = "rgba(80,130,200,0.10)"; ctx.fillRect(x,y,BW-1,BH-1);
                ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(x,y,BW-1,2);
              }
              // Stone mullions
              if (c===mc) { ctx.fillStyle="#8A9298"; ctx.fillRect(x,y,1,BH-1); }
              if (br===mr) { ctx.fillStyle="#8A9298"; ctx.fillRect(x,y,BW-1,1); }
            } else {
              // Empty window — dark with ghost stone frame
              ctx.fillStyle = MORTAR; ctx.fillRect(x,y,BW,BH);
              const [r0,r1,c0,c1] = win;
              const isFrame = c===c0||c===c1-1||br===r0||br===r1;
              ctx.fillStyle = isFrame ? "rgba(138,146,152,0.28)" : "#0C1420";
              ctx.fillRect(x,y,BW-1,BH-1);
            }
          } else {
            if (active) {
              let col: string;
              if (br < 6) {
                // Stone foundation — large blocks every 3 cols
                const g = (Math.floor(c/3) + br*3) % STONE.length;
                col = STONE[g];
              } else if (isLintel(br,c) || isSill(br,c)) {
                // Architectural stone band above/below windows
                const g = (Math.floor(c/2) + br) % STONE.length;
                col = STONE[g];
              } else {
                col = brickCol(br, c);
              }
              drawBrick(x, y, col, frontier);
            } else {
              drawEmptyBrick(x, y);
            }
          }
          if (active) drawn++;
        }
      }

      // ── Roof (stepped pyramid — 2 bricks narrower every row) ──
      for (let r=0; r<ROOF_ROWS; r++) {
        const rw = Math.max(2, COLS - r*2);        // 1 brick narrower per side per row
        const sc = Math.floor((COLS-rw)/2);
        const y    = HB - (BODY_ROWS+r+1)*BH;
        for (let c=0; c<rw; c++) {
          const x = HL + (sc+c)*BW;
          const active   = drawn < FILLED;
          const frontier = drawn >= FILLED - FRONTIER_TRAIL && drawn < FILLED;
          if (!active && frontierY < 0) frontierY = y + BH;
          if (active) {
            drawBrick(x, y, ROOFTILE[(r*5+c*3) % ROOFTILE.length], frontier);
          } else {
            drawEmptyBrick(x, y, true);
          }
          if (active) drawn++;
        }
      }

      // ── Chimney ───────────────────────────────────────────────
      const chimneyX    = HL + 38*BW;  // slightly right of center
      const chimneyBase = HB - (BODY_ROWS+ROOF_ROWS)*BH;
      for (let r=0; r<CHIMNEY_ROWS; r++) {
        for (let c=0; c<CHIMNEY_COLS; c++) {
          const x = chimneyX + c*BW;
          const y = chimneyBase - (r+1)*BH;
          const active = drawn < FILLED;
          if (active) {
            drawBrick(x, y, BRICKS[(r*5+c*3) % BRICKS.length]);
          } else {
            ctx.fillStyle = MORTAR; ctx.fillRect(x,y,BW,BH);
            ctx.fillStyle = "#1A2228"; ctx.fillRect(x,y,BW-1,BH-1);
          }
          if (active) drawn++;
        }
      }

      // ── Construction frontier GLOW ────────────────────────────
      const fY = frontierY >= 0 ? frontierY : (progress>=1 ? chimneyBase-CHIMNEY_ROWS*BH : HB);
      if (progress > 0.005 && progress < 0.998) {
        const pulse = animated ? Math.sin(frame/10)*0.5+0.5 : 0.7;
        const houseW = COLS * BW;

        // Wide soft outer glow (vertical gradient)
        const outerGlow = ctx.createLinearGradient(0, fY-44, 0, fY+8);
        outerGlow.addColorStop(0,   "rgba(255,90,0,0)");
        outerGlow.addColorStop(0.4, `rgba(255,130,10,${0.18+pulse*0.12})`);
        outerGlow.addColorStop(0.8, `rgba(255,170,20,${0.42+pulse*0.18})`);
        outerGlow.addColorStop(1,   `rgba(255,200,40,${0.22+pulse*0.10})`);
        ctx.fillStyle = outerGlow;
        ctx.fillRect(HL, fY-44, houseW, 52);

        // Mid glow band
        const midGlow = ctx.createLinearGradient(0, fY-12, 0, fY+4);
        midGlow.addColorStop(0,   `rgba(255,160,20,${0.55+pulse*0.25})`);
        midGlow.addColorStop(0.6, `rgba(255,200,50,${0.78+pulse*0.18})`);
        midGlow.addColorStop(1,   "rgba(255,140,10,0.1)");
        ctx.fillStyle = midGlow;
        ctx.fillRect(HL-4, fY-12, houseW+8, 16);

        // Bright core line
        ctx.shadowColor = `rgba(255,200,50,${0.9+pulse*0.1})`;
        ctx.shadowBlur  = 18;
        ctx.fillStyle   = `rgba(255,230,80,${0.88+pulse*0.12})`;
        ctx.fillRect(HL, fY-2, houseW, 3);
        ctx.shadowBlur  = 0;

        // Second brighter pass
        ctx.shadowColor = "rgba(255,255,180,0.7)";
        ctx.shadowBlur  = 8;
        ctx.fillStyle   = "rgba(255,248,120,0.9)";
        ctx.fillRect(HL, fY-1, houseW, 1);
        ctx.shadowBlur  = 0;

        // ── Side arrows ────────────────────────────────────────
        const bounce = animated ? (Math.sin(frame/14)*3) : 0;
        const arrowAlpha = 0.75 + pulse*0.25;
        ctx.fillStyle = `rgba(255,210,50,${arrowAlpha})`;
        ctx.font = "bold 14px ui-monospace,monospace";
        ctx.textAlign = "center";
        [HL-18, HL+houseW+18].forEach(ax => {
          ctx.fillText("↑", ax, fY - 14 + bounce);
          ctx.fillText("↑", ax, fY - 2  + bounce);
        });
        ctx.textAlign = "left";
      }

      // ── Final brick marker (chimney) ──────────────────────────
      const pulse = animated ? Math.sin(frame/18)*0.5+0.5 : 0.4;
      const fBox = { x: chimneyX-4, y: chimneyBase-CHIMNEY_ROWS*BH-10, w: CHIMNEY_COLS*BW+8, h: CHIMNEY_ROWS*BH+10 };
      ctx.strokeStyle=`rgba(255,216,74,${0.28+pulse*0.48})`; ctx.lineWidth=1.5;
      ctx.setLineDash([4,3]); ctx.strokeRect(fBox.x,fBox.y,fBox.w,fBox.h); ctx.setLineDash([]);
      ctx.fillStyle="#ffd84a"; ctx.font="700 11px ui-monospace,monospace";
      ctx.fillText("FINAL BRICK", fBox.x+fBox.w+8, fBox.y+fBox.h/2+4);

      // ── Left axis ─────────────────────────────────────────────
      const ax = HL - 8;
      ctx.strokeStyle="rgba(255,216,74,0.65)"; ctx.lineWidth=1;
      const countY = HB - progress*BODY_ROWS*BH;
      const clampY = Math.max(HB - BODY_ROWS*BH + 10, Math.min(HB-10, countY));
      ctx.beginPath();
      ctx.moveTo(ax-4,clampY-16); ctx.lineTo(ax-14,clampY-16);
      ctx.moveTo(ax-14,clampY-16); ctx.lineTo(ax-14,clampY+16);
      ctx.moveTo(ax-14,clampY+16); ctx.lineTo(ax-4,clampY+16);
      ctx.stroke();
      ctx.fillStyle="#ffd84a"; ctx.font="900 15px ui-monospace,monospace"; ctx.textAlign="right";
      ctx.fillText(formatNumber(Math.round(progress*TOTAL_SUPPLY)), ax-18, clampY+5);
      ctx.beginPath(); ctx.moveTo(ax-2,clampY-4); ctx.lineTo(ax+10,clampY); ctx.lineTo(ax-2,clampY+4); ctx.closePath(); ctx.fill();

      ctx.fillStyle="rgba(66,198,231,0.65)"; ctx.font="700 10px ui-monospace,monospace"; ctx.textAlign="right";
      ctx.fillText("ROOF",      ax, HB-BODY_ROWS*BH-4);
      ctx.fillText("MID",       ax, HB-BODY_ROWS*BH*0.5);
      ctx.fillText("FOUNDATION",ax, HB-10);
      ctx.textAlign="left";

      // legend is rendered in HTML overlay — skip canvas version

      if (animated) raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [animated, canvasRef, progress]);
}

// ─── Brick thumbnail helpers ─────────────────────────────────────────────────
function adj(hex: string, d: number) {
  const c = (s: number, o: number) => Math.min(255, Math.max(0, s + o));
  const r = parseInt(hex.slice(1,3),16)||0, g = parseInt(hex.slice(3,5),16)||0, b = parseInt(hex.slice(5,7),16)||0;
  return `rgb(${c(r,d)},${c(g,d)},${c(b,d)})`;
}

const BRICK_IMAGES: Record<string, string> = {
  "Wall Brick":  "/bricks/common.png",
  "Window Brick": "/bricks/uncommon.png",
  "Roof Tile":   "/bricks/rare.png",
  "Roof Peak":    "/bricks/legendary.png",
};

function BrickThumbnail({ type, color, w=120, h=90 }: { type:string; color:string; w?:number; h?:number }) {
  const imgSrc = BRICK_IMAGES[type];
  if (imgSrc) {
    return (
      <img
        src={imgSrc}
        width={w}
        height={h}
        style={{ display: "block", margin: "0 auto", objectFit: "contain", imageRendering: "pixelated" }}
        alt={type}
      />
    );
  }
  // fallback canvas
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const W=w, H=h;
    ctx.clearRect(0,0,W,H);
    const lt = adj(color, 58), dk = adj(color, -52);

    if (type.includes("Wall")) {
      // Two stacked 3D bricks
      const BW=W*.62, BH=H*.22, D=W*.13;
      const sx=(W-BW-D)/2;
      for (let i=1; i>=0; i--) {
        const yo=i*(BH+3), by=H*.84-yo;
        ctx.fillStyle=color;  ctx.fillRect(sx, by-BH, BW, BH);
        ctx.beginPath(); ctx.moveTo(sx,by-BH); ctx.lineTo(sx+D,by-BH-D);
          ctx.lineTo(sx+BW+D,by-BH-D); ctx.lineTo(sx+BW,by-BH); ctx.closePath();
        ctx.fillStyle=lt; ctx.fill();
        ctx.beginPath(); ctx.moveTo(sx+BW,by-BH); ctx.lineTo(sx+BW+D,by-BH-D);
          ctx.lineTo(sx+BW+D,by-D); ctx.lineTo(sx+BW,by); ctx.closePath();
        ctx.fillStyle=dk; ctx.fill();
        ctx.strokeStyle="rgba(0,0,0,.28)"; ctx.lineWidth=1;
        ctx.strokeRect(sx+.5,by-BH+.5,BW-1,BH-1);
        ctx.beginPath(); ctx.moveTo(sx+BW/2,by-BH); ctx.lineTo(sx+BW/2,by); ctx.stroke();
      }
    }
    else if (type.includes("Window")) {
      const BW=W*.7, BH=H*.52, D=W*.12;
      const sx=(W-BW-D)/2, by=H*.84;
      ctx.fillStyle=color; ctx.fillRect(sx,by-BH,BW,BH);
      ctx.beginPath(); ctx.moveTo(sx,by-BH); ctx.lineTo(sx+D,by-BH-D);
        ctx.lineTo(sx+BW+D,by-BH-D); ctx.lineTo(sx+BW,by-BH); ctx.closePath();
      ctx.fillStyle=lt; ctx.fill();
      ctx.beginPath(); ctx.moveTo(sx+BW,by-BH); ctx.lineTo(sx+BW+D,by-BH-D);
        ctx.lineTo(sx+BW+D,by-D); ctx.lineTo(sx+BW,by); ctx.closePath();
      ctx.fillStyle=dk; ctx.fill();
      // Glass opening
      const wx=sx+BW*.14, wy=by-BH*.88, ww=BW*.72, wh=BH*.72;
      ctx.fillStyle="rgba(95,175,215,.72)"; ctx.fillRect(wx,wy,ww,wh);
      // Inner glow
      ctx.fillStyle="rgba(160,220,255,.20)"; ctx.fillRect(wx+2,wy+2,ww-4,wh-4);
      // Frame
      ctx.strokeStyle="rgba(230,240,246,.9)"; ctx.lineWidth=1.5;
      ctx.strokeRect(wx+.5,wy+.5,ww-1,wh-1);
      ctx.beginPath();
      ctx.moveTo(wx+ww/2,wy); ctx.lineTo(wx+ww/2,wy+wh);
      ctx.moveTo(wx,wy+wh/2); ctx.lineTo(wx+ww,wy+wh/2);
      ctx.stroke();
    }
    else if (type.includes("Slope") || type.includes("Roof") && !type.includes("Peak")) {
      const BW=W*.74, D=W*.13;
      const sx=(W-BW-D)/2, by=H*.88;
      // Sloped front face (trapezoid — high left, low right)
      ctx.beginPath(); ctx.moveTo(sx,by); ctx.lineTo(sx+BW,by);
        ctx.lineTo(sx+BW,by-H*.18); ctx.lineTo(sx,by-H*.48); ctx.closePath();
      ctx.fillStyle=color; ctx.fill();
      // Top sloped face
      ctx.beginPath(); ctx.moveTo(sx,by-H*.48); ctx.lineTo(sx+D,by-H*.48-D*.7);
        ctx.lineTo(sx+BW+D,by-H*.18-D*.7); ctx.lineTo(sx+BW,by-H*.18); ctx.closePath();
      ctx.fillStyle=lt; ctx.fill();
      // Right face
      ctx.beginPath(); ctx.moveTo(sx+BW,by-H*.18); ctx.lineTo(sx+BW+D,by-H*.18-D*.7);
        ctx.lineTo(sx+BW+D,by-D*.7); ctx.lineTo(sx+BW,by); ctx.closePath();
      ctx.fillStyle=dk; ctx.fill();
      // Tile texture lines
      ctx.strokeStyle="rgba(0,0,0,.22)"; ctx.lineWidth=1;
      [.25,.5,.75].forEach(t => {
        ctx.beginPath();
        ctx.moveTo(sx+BW*t, by); ctx.lineTo(sx+BW*t, by-H*(0.1+t*0.38));
        ctx.stroke();
      });
    }
    else if (type.includes("Solana")) {
      // Mythic gradient brick
      const BW=W*.62, BH=H*.28, D=W*.13;
      const sx=(W-BW-D)/2, by=H*.72;
      const grad = ctx.createLinearGradient(sx, by-BH, sx+BW, by);
      grad.addColorStop(0, "#00ffa3");
      grad.addColorStop(1, "#9945ff");
      ctx.fillStyle = grad; ctx.fillRect(sx, by-BH, BW, BH);
      ctx.beginPath(); ctx.moveTo(sx,by-BH); ctx.lineTo(sx+D,by-BH-D);
        ctx.lineTo(sx+BW+D,by-BH-D); ctx.lineTo(sx+BW,by-BH); ctx.closePath();
      ctx.fillStyle="rgba(200,255,230,.55)"; ctx.fill();
      ctx.beginPath(); ctx.moveTo(sx+BW,by-BH); ctx.lineTo(sx+BW+D,by-BH-D);
        ctx.lineTo(sx+BW+D,by-D); ctx.lineTo(sx+BW,by); ctx.closePath();
      ctx.fillStyle="rgba(80,0,180,.45)"; ctx.fill();
      // hollow center
      const hx=sx+BW*.2, hy=by-BH*.85, hw=BW*.6, hh=BH*.6;
      ctx.clearRect(hx,hy,hw,hh);
      ctx.strokeStyle="rgba(0,255,160,.5)"; ctx.lineWidth=1;
      ctx.strokeRect(hx,hy,hw,hh);
      // glow
      ctx.shadowColor="#9945ff"; ctx.shadowBlur=14;
      ctx.strokeStyle="rgba(153,69,255,.4)"; ctx.lineWidth=1.5;
      ctx.strokeRect(sx+.5,by-BH+.5,BW-1,BH-1);
      ctx.shadowBlur=0;
    }
    else if (type.includes("Peak")) {
      // Stepped gold pyramid
      ctx.shadowColor=color; ctx.shadowBlur=18;
      const steps=4, sH=H*.14, maxW=W*.7, cx=W/2, baseY=H*.88;
      for (let i=steps-1; i>=0; i--) {
        const sw=(i+1)*(maxW/steps), sx2=cx-sw/2;
        const sy2=baseY-(steps-1-i)*sH, D=sw*.12;
        ctx.fillStyle=color; ctx.fillRect(sx2,sy2-sH,sw,sH);
        ctx.beginPath(); ctx.moveTo(sx2,sy2-sH); ctx.lineTo(sx2+D,sy2-sH-D);
          ctx.lineTo(sx2+sw+D,sy2-sH-D); ctx.lineTo(sx2+sw,sy2-sH); ctx.closePath();
        ctx.fillStyle=lt; ctx.fill();
        ctx.beginPath(); ctx.moveTo(sx2+sw,sy2-sH); ctx.lineTo(sx2+sw+D,sy2-sH-D);
          ctx.lineTo(sx2+sw+D,sy2-D); ctx.lineTo(sx2+sw,sy2); ctx.closePath();
        ctx.fillStyle=dk; ctx.fill();
        ctx.strokeStyle="rgba(0,0,0,.2)"; ctx.lineWidth=.5;
        ctx.strokeRect(sx2+.5,sy2-sH+.5,sw-1,sH-1);
      }
      // Star tip
      ctx.shadowBlur=24; ctx.fillStyle="rgba(255,252,210,.95)";
      ctx.fillRect(cx-2, baseY-steps*sH-3, 4, 4); ctx.shadowBlur=0;
    }
  }, [type, color, w, h]);
  return <canvas ref={ref} width={w} height={h} style={{ display:"block", margin:"0 auto", imageRendering:"pixelated" }} />;
}

export function Shell({ children, active }: { children: React.ReactNode; active: "mint" | "bricks" | "house" }) {
  const { publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const walletMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!walletMenuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (walletMenuRef.current && !walletMenuRef.current.contains(e.target as Node)) {
        setWalletMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [walletMenuOpen]);
  const nav = [
    {
      key: "mint", label: "Mint", href: "/",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
          <polyline points="1,9 10,1 19,9" />
          <rect x="3" y="9" width="14" height="10" rx="1" />
          <rect x="7.5" y="13" width="5" height="6" />
        </svg>
      ),
    },
    {
      key: "house", label: "House", href: "/house",
      icon: (
        <svg width="22" height="20" viewBox="0 0 22 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
          <polyline points="1,9 11,1 21,9" />
          <rect x="2" y="9" width="18" height="10" rx="1" />
          <rect x="8" y="13" width="6" height="6" />
          {/* chimney */}
          <rect x="14" y="3" width="3" height="5" />
        </svg>
      ),
    },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brick-logo" aria-hidden="true">
            <img src="/brick-logo.png" alt="" />
          </span>
          <span className="brand-text">Brick<br />by Brick</span>
        </Link>
        <nav className="nav-tabs" aria-label="Primary navigation">
          {nav.map((item) => (
            <Link key={item.key} className={active === item.key ? "active" : ""} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        {publicKey ? (
          <div className="wallet-menu" ref={walletMenuRef}>
            <button
              className="wallet-button wallet-button--connected"
              onClick={() => setWalletMenuOpen((v) => !v)}
            >
              <span className="wallet-dot" />
              {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
            </button>
            {walletMenuOpen && (
              <div className="wallet-menu-dropdown">
                <button
                  className="wallet-menu-item"
                  onClick={() => {
                    setWalletMenuOpen(false);
                    disconnect();
                  }}
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="wallet-button" onClick={() => setVisible(true)}>
            <svg width="22" height="16" viewBox="0 0 22 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
              <rect x="1" y="1" width="20" height="14" rx="2" />
              <path d="M14 8a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" />
              <line x1="1" y1="5" x2="21" y2="5" />
            </svg>
            Connect Wallet
          </button>
        )}
      </header>
      {children}
    </div>
  );
}

export function LiveHouseCanvas({
  progress = 0,
  animated = true,
  variant,
}: {
  progress?: number;
  animated?: boolean;
  variant?: "dashboard";
}) {
  // viewProgress: what the 3D house shows (user can scrub freely)
  const [viewProgress, setViewProgress] = useState(progress);
  // mintProgress: real on-chain data (drives the brick bar)
  const mintProgress = Math.min(1, Math.max(0, progress));

  useEffect(() => {
    if (!animated) return;
    setViewProgress(progress);
  }, [progress, animated]);

  return (
    <div className={`house-frame ${variant === "dashboard" ? "dashboard-house" : ""}`}>
      <div className="house-toolbar-title">
        <span>Live House Canvas</span>
        <em>
          <span className="live-dot" />
          Live
        </em>
      </div>

      <div className="house-image-stack" style={{ position: "relative" }}>
        {/* Progress arrows — float at viewProgress level, move with slider */}
        {[true, false].map(isLeft => (
          <div
            key={isLeft ? "left" : "right"}
            className={`progress-arrows ${isLeft ? "progress-arrows--left" : "progress-arrows--right"}`}
            style={{
              "--arrow-speed": `${1.8 - viewProgress * 1.2}s`,
              "--arrow-bottom": `${18 + viewProgress * 76}%`,
            } as React.CSSProperties}
          >
            {[0, 1, 2].map(i => (
              <span key={i} className="progress-arrow" style={{ "--arrow-delay": `${i * 0.28}s` } as React.CSSProperties}>▲</span>
            ))}
          </div>
        ))}
        <House3DViewer progress={viewProgress} />
        {/* Real mint progress — brick segments */}
        <div className="house-progress-overlay">
          <span className="house-progress-label">
            {Math.round(mintProgress * 10000).toLocaleString("en-US")} / 10,000
          </span>
          <div className="brick-progress-row">
            {Array.from({ length: 20 }).map((_, i) => {
              const filled = i < Math.round(mintProgress * 20);
              return <div key={i} className={`brick-seg${filled ? " brick-seg--filled" : ""}`} />;
            })}
          </div>
          <span className="house-progress-pct">{Math.round(mintProgress * 100)}%</span>
        </div>
      </div>
      {/* Preview scrubber — lets users explore the finished house */}
      {variant === "dashboard" && (
        <div className="dev-progress-slider">
          <span>Preview</span>
          <input
            type="range" min={0} max={1} step={0.001}
            value={viewProgress}
            onChange={e => setViewProgress(parseFloat(e.target.value))}
          />
          <span>{Math.round(viewProgress * 100)}%</span>
        </div>
      )}
    </div>
  );
}

export function MintPanel() {
  const [minted, setMinted] = useState(mintedStart);
  const [revealed, setRevealed] = useState<Rarity>("Common");
  const [isRevealing, setIsRevealing] = useState(false);
  const remaining = TOTAL_SUPPLY - minted;

  function mint() {
    if (isRevealing) return;
    setIsRevealing(true);
    window.setTimeout(() => {
      setMinted((value) => Math.min(TOTAL_SUPPLY, value + 1));
      setRevealed(pickReveal(minted + 1));
      setIsRevealing(false);
    }, 720);
  }

  return (
    <aside className="mint-panel">
      <button className="info-button" aria-label="Mint information">i</button>
      <div className="mint-stage">
        <div className="mint-brick-col">
          <div className="panel-heading">
            <h1>Mint a brick</h1>
          </div>
          <button className="brick-reveal common" onClick={mint}>
            <span className="mint-nft-preview" style={{ "--rarity": rarityMeta["Common"].color } as React.CSSProperties}>
              <BrickThumbnail type="Wall Brick" color={rarityMeta["Common"].color} w={250} h={190} />
            </span>
          </button>
        </div>
        <div className="mint-side-stats">
          <div>
            <span>Price</span>
            <strong>0.05 SOL</strong>
            <small>On Solana</small>
          </div>
          <div>
            <span>Remaining Supply</span>
            <strong className="green">{formatNumber(remaining)}</strong>
            <small>/ 10,000</small>
          </div>
          <div>
            <span>Minted</span>
            <strong className="cyan">{formatNumber(minted)}</strong>
            <small>/ 10,000</small>
          </div>
        </div>
      </div>
      <button className="mint-cta" onClick={mint}>Mint Brick <span>· 0.05 SOL</span><i aria-hidden="true">→</i></button>

    </aside>
  );
}

export function DashboardMyBricks() {
  return (
    <section className="dashboard-card my-bricks-card">
      <div className="dash-card-head">
        <h2>Rarity</h2>
      </div>
      <BrickGallery compact />
    </section>
  );
}

function DonutChart({ pct = 64.28 }: { pct?: number }) {
  const r = 64;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="donut">
      <svg width="170" height="170" viewBox="0 0 170 170" style={{ position: "absolute", inset: 0 }}>
        <circle cx="85" cy="85" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="21" />
        <circle
          cx="85" cy="85" r={r} fill="none" stroke="#66dc62" strokeWidth="21"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="butt"
          transform="rotate(-90 85 85)"
        />
      </svg>
      <strong>{pct}%</strong>
      <span>Complete</span>
    </div>
  );
}

async function fetchMintCount(): Promise<number> {
  if (!CANDY_MACHINE_ID) return 0;
  try {
    const rpc = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || "https://api.mainnet-beta.solana.com";
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "getAccountInfo",
        params: [CANDY_MACHINE_ID, { encoding: "jsonParsed" }],
      }),
    });
    const json = await res.json();
    // Candy Machine v3 stores itemsRedeemed at a known offset in account data
    const data = json?.result?.value?.data;
    if (Array.isArray(data)) {
      const buf = Buffer.from(data[0], "base64");
      // itemsRedeemed is a u64 at byte offset 40
      const lo = buf.readUInt32LE(40);
      const hi = buf.readUInt32LE(44);
      return hi * 0x100000000 + lo;
    }
    return 0;
  } catch {
    return 0;
  }
}

export function HouseProgressPanel() {
  const TOTAL = 10_000;
  const [minted, setMinted] = useState(0);

  useEffect(() => {
    fetchMintCount().then(setMinted);
    const id = setInterval(() => fetchMintCount().then(setMinted), 60_000);
    return () => clearInterval(id);
  }, []);

  const pct = (minted / TOTAL) * 100;
  const remaining = TOTAL - minted;

  return (
    <section className="dashboard-card progress-card">
      <div className="dash-card-head">
        <h2>House Progress</h2>
        <Link href="/house">Full view →</Link>
      </div>
      <div className="progress-dashboard-body">
        <DonutChart pct={pct} />
        <div className="progress-list">
          <div><span className="cube-icon" /> <strong>{minted.toLocaleString("en-US")}</strong><small>Bricks built</small></div>
          <div><span className="cube-icon outline" /> <strong>{remaining.toLocaleString("en-US")}</strong><small>Bricks remaining</small></div>
          <div><span className="flag-icon" /> <strong>{TOTAL.toLocaleString("en-US")}</strong><small>Total bricks</small></div>
          <div className="building-up"><span>⌃⌃</span><strong>Building upward</strong><small>From foundation to roof</small></div>
        </div>
        <div className="mini-house-preview" aria-hidden="true">
          <img src="/house/complete.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain", opacity: 0.85 }} />
        </div>
      </div>
    </section>
  );
}

// Set this after Candy Machine is deployed
const CANDY_MACHINE_ID: string | null = null;

async function fetchOnChainStats(): Promise<{ volume: number | null; holders: number | null; contractAddr: string | null }> {
  if (!CANDY_MACHINE_ID) return { volume: null, holders: null, contractAddr: null };
  try {
    // Helius API — replace HELIUS_API_KEY in .env.local
    const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    if (!apiKey) return { volume: null, holders: null, contractAddr: CANDY_MACHINE_ID };
    const res = await fetch(
      `https://api.helius.xyz/v0/token-metadata?api-key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mintAccounts: [CANDY_MACHINE_ID] }) }
    );
    const data = await res.json();
    return { volume: data?.volume ?? null, holders: data?.holderCount ?? null, contractAddr: CANDY_MACHINE_ID };
  } catch {
    return { volume: null, holders: null, contractAddr: CANDY_MACHINE_ID };
  }
}

export function FooterStats() {
  const [stats, setStats] = useState<{ volume: number | null; holders: number | null; contractAddr: string | null }>({
    volume: null, holders: null, contractAddr: null,
  });

  useEffect(() => {
    fetchOnChainStats().then(setStats);
    const id = setInterval(() => fetchOnChainStats().then(setStats), 60_000);
    return () => clearInterval(id);
  }, []);

  const shortAddr = stats.contractAddr
    ? `${stats.contractAddr.slice(0, 4)}...${stats.contractAddr.slice(-4)}`
    : "—";
  const volumeLabel = stats.volume != null ? `${stats.volume.toLocaleString("en-US", { maximumFractionDigits: 1 })} SOL` : "—";
  const holdersLabel = stats.holders != null ? stats.holders.toLocaleString("en-US") : "—";

  return (
    <footer className="footer-stats">
      <div><span>Contract</span><strong className="footer-addr"><span className="copy-icon" />{shortAddr}</strong></div>
      <div><span>Total volume</span><strong>{volumeLabel}</strong></div>
      <div><span>Holders</span><strong>{holdersLabel}</strong></div>
      <div>
        <span>Follow</span>
          <div className="social-icons">
            <a href="https://x.com/VidarBtc" target="_blank" rel="noopener noreferrer" className="social-icon x" aria-label="X / Twitter"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
          </div>
      </div>
    </footer>
  );
}

export function ProgressRail({ minted = mintedStart }: { minted?: number }) {
  const pct = minted / TOTAL_SUPPLY;
  return (
    <section className="progress-rail">
      <div>
        <span>House progress</span>
        <strong>{Math.round(pct * 1000) / 10}% complete</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: `${pct * 100}%` }} />
      </div>
      <div>
        <span>Completion event</span>
        <strong>Final brick: chimney tip</strong>
      </div>
    </section>
  );
}

export function BrickCard({ brick }: { brick: Brick }) {
  const color = rarityMeta[brick.rarity].color;
  return (
    <article className={`nft-card ${brick.rarity.toLowerCase()}`} style={{ "--rarity": color } as React.CSSProperties}>
      <div className="card-accent" />
      <div className="card-topline">
        <strong>#{String(brick.id).padStart(4, "0")}</strong>
        <span>{brick.rarity}</span>
      </div>
      <div className="card-brick-wrap">
        {rarityImage[brick.rarity]
          ? <img src={rarityImage[brick.rarity]} alt={brick.type} style={{ width: 110, height: 82, objectFit: "contain" }} />
          : <BrickThumbnail type={brick.type} color={color} w={110} h={82} />
        }
      </div>
      <h3>{brick.type}</h3>
      <p>{brick.zone}</p>
    </article>
  );
}

export function BrickGallery({ compact = false }: { compact?: boolean }) {
  const bricks = compact ? sampleBricks.slice(0, 5) : sampleBricks;
  return (
    <div className="gallery-grid">
      {bricks.map((brick) => (
        <BrickCard key={brick.id} brick={brick} />
      ))}
    </div>
  );
}

const rarityImage: Partial<Record<Rarity, string>> = {
  Mythic: "/bricks/mythic.png",
};

export function RarityTable() {
  return (
    <section className="rarity-table">
      {(Object.keys(rarityMeta) as Rarity[]).map((rarity) => (
        <div key={rarity}>
          {rarityImage[rarity]
            ? <img src={rarityImage[rarity]} alt={rarity} className="rarity-thumb" />
            : <span className="rarity-dot" style={{ background: rarityMeta[rarity].color }} />
          }
          <strong>{rarity}</strong>
          <span>{rarityMeta[rarity].odds}</span>
          <small>{rarityMeta[rarity].supply} bricks</small>
        </div>
      ))}
    </section>
  );
}

export function HouseStats() {
  const rows = useMemo(
    () => [
      ["Foundation", "1,044", "Complete"],
      ["Main walls", "4,782", "In progress"],
      ["Windows", "368", "Minting"],
      ["Roof", "181", "Queued"],
      ["Chimney tip", "1", "Final reveal"],
    ],
    [],
  );

  return (
    <section className="house-stats">
      {rows.map(([zone, count, status]) => (
        <div key={zone}>
          <span>{zone}</span>
          <strong>{count}</strong>
          <em>{status}</em>
        </div>
      ))}
    </section>
  );
}

export function MyBricksSummary() {
  return (
    <section className="summary-strip">
      <div>
        <span>Wallet state</span>
        <strong>6 owned bricks</strong>
      </div>
      <div>
        <span>Best pull</span>
        <strong>Legendary #0044</strong>
      </div>
      <div>
        <span>Trait spread</span>
        <strong>3 zones · 4 rarities</strong>
      </div>
    </section>
  );
}
