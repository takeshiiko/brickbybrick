const fs = require("fs");
const path = require("path");

// ── Config ─────────────────────────────────────────────────────────────────
const TOTAL = 10_000;
const OUT_DIR = path.join(__dirname, "../nft-output");

const RARITIES = [
  {
    rarity: "Common",
    type: "Wall Brick",
    image: "common.png",
    count: 7750,
    zones: ["Foundation", "Main Wall", "Side Wall", "Interior Wall"],
  },
  {
    rarity: "Uncommon",
    type: "Window Brick",
    image: "uncommon.png",
    count: 1300,
    zones: ["Front Facade", "Side Facade", "Back Facade"],
  },
  {
    rarity: "Rare",
    type: "Roof Tile",
    image: "rare.png",
    count: 700,
    zones: ["East Wing", "West Wing", "Center Roof"],
  },
  {
    rarity: "Legendary",
    type: "Roof Peak",
    image: "legendary.png",
    count: 200,
    zones: ["Chimney", "Ridge", "Gable End"],
  },
  {
    rarity: "Mythic",
    type: "Solana Brick",
    image: "mythic.png",
    count: 50,
    zones: ["Genesis"],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function pick(arr, seed) {
  return arr[seed % arr.length];
}

// Deterministic shuffle (Fisher-Yates with seed)
function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Build token list ───────────────────────────────────────────────────────
const tokens = [];
let id = 1;

for (const tier of RARITIES) {
  for (let i = 0; i < tier.count; i++) {
    const zone = pick(tier.zones, i);
    tokens.push({ id, rarity: tier.rarity, type: tier.type, image: tier.image, zone });
    id++;
  }
}

// Shuffle so rarity isn't sequential
const shuffled = seededShuffle(tokens, 42);
// Re-assign IDs after shuffle
shuffled.forEach((t, idx) => { t.id = idx + 1; });

// ── Output dirs ────────────────────────────────────────────────────────────
const imgDir  = path.join(OUT_DIR, "images");
const metaDir = path.join(OUT_DIR, "metadata");
fs.mkdirSync(imgDir,  { recursive: true });
fs.mkdirSync(metaDir, { recursive: true });

// ── Copy images & write metadata ───────────────────────────────────────────
const srcDir = path.join(__dirname, "../public/bricks");

const rarityColors = {
  Common:    "#c8512c",
  Uncommon:  "#4a9eff",
  Rare:      "#b44fff",
  Legendary: "#ffd84a",
};

let copied = new Set();

for (const token of shuffled) {
  const paddedId = String(token.id).padStart(4, "0");

  // Copy image (each rarity reuses the same base image)
  const srcImg = path.join(srcDir, token.image);
  const dstImg = path.join(imgDir, `${paddedId}.png`);
  fs.copyFileSync(srcImg, dstImg);

  if (!copied.has(token.rarity)) {
    console.log(`  ✓ Copying ${token.rarity} base image → ${paddedId}.png (first)`);
    copied.add(token.rarity);
  }

  // Write metadata JSON
  const meta = {
    name: `Brick #${paddedId}`,
    symbol: "BRICK",
    description: `A ${token.rarity.toLowerCase()} ${token.type.toLowerCase()} from the Brick by Brick collection. Together, 10,000 bricks build a real house on-chain.`,
    seller_fee_basis_points: 500, // 5% royalty
    image: `${paddedId}.png`,
    external_url: "https://brickbybrick.xyz",
    attributes: [
      { trait_type: "Type", value: token.type },
      { trait_type: "Zone", value: token.zone },
    ],
    properties: {
      files: [{ uri: `${paddedId}.png`, type: "image/png" }],
      category: "image",
    },
    collection: {
      name: "Brick by Brick",
      family: "Brick by Brick",
    },
  };

  fs.writeFileSync(
    path.join(metaDir, `${paddedId}.json`),
    JSON.stringify(meta, null, 2)
  );
}

// ── Collection-level metadata (index 0) ───────────────────────────────────
const collectionMeta = {
  name: "Brick by Brick",
  symbol: "BRICK",
  description: "10,000 bricks. One house. Built together on Solana.",
  image: "collection.png",
  external_url: "https://brickbybrick.xyz",
  seller_fee_basis_points: 500,
  properties: {
    files: [{ uri: "collection.png", type: "image/png" }],
    category: "image",
  },
};

fs.copyFileSync(path.join(srcDir, "legendary.png"), path.join(imgDir, "collection.png"));
fs.writeFileSync(path.join(metaDir, "collection.json"), JSON.stringify(collectionMeta, null, 2));

// ── Summary ────────────────────────────────────────────────────────────────
console.log("\n✅ Collection generated:");
const counts = {};
shuffled.forEach(t => { counts[t.rarity] = (counts[t.rarity] || 0) + 1; });
for (const [rarity, count] of Object.entries(counts)) {
  const pct = ((count / TOTAL) * 100).toFixed(1);
  console.log(`   ${rarity.padEnd(12)} ${String(count).padStart(5)}  (${pct}%)`);
}
console.log(`   ${"TOTAL".padEnd(12)} ${TOTAL}`);
console.log(`\n   Images  → ${imgDir}`);
console.log(`   Metadata → ${metaDir}`);
console.log("\nNext: run 'sugar upload' to push to Arweave.");
