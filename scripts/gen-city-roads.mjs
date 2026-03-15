/**
 * Generate lightweight road network polylines for AnimatedGlobe flat mode.
 *
 * Data source: OpenStreetMap via Overpass API.
 * Output: client/src/components/noodles/cityRoads.ts
 *
 * Usage:
 *   node scripts/gen-city-roads.mjs
 */
import fs from "node:fs";
import path from "node:path";

const OUT_FILE = path.resolve(
  process.cwd(),
  "client/src/components/noodles/cityRoads.ts"
);

const CITIES = [
  { name: "成都", lat: 30.67, lon: 104.07 },
  { name: "北京", lat: 39.91, lon: 116.39 },
  { name: "上海", lat: 31.23, lon: 121.47 },
  { name: "深圳", lat: 22.54, lon: 114.06 },
  { name: "纽约", lat: 40.71, lon: -74.01 },
  { name: "伦敦", lat: 51.51, lon: -0.13 },
  { name: "东京", lat: 35.68, lon: 139.69 },
  { name: "悉尼", lat: -33.87, lon: 151.21 },
  { name: "迪拜", lat: 25.2, lon: 55.27 },
  { name: "巴黎", lat: 48.85, lon: 2.35 },
  { name: "新加坡", lat: 1.35, lon: 103.82 },
  { name: "洛杉矶", lat: 34.05, lon: -118.24 },
  { name: "圣保罗", lat: -23.55, lon: -46.63 },
  { name: "莫斯科", lat: 55.75, lon: 37.62 },
  { name: "孟买", lat: 19.08, lon: 72.88 },
];

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

const MAJOR = new Set(["motorway", "trunk", "primary"]);
const MEDIUM = new Set(["secondary", "tertiary"]);
const MINOR = new Set(["residential", "unclassified", "service"]);

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function dist2(p, a, b) {
  const x = p[0],
    y = p[1];
  let x1 = a[0],
    y1 = a[1],
    x2 = b[0],
    y2 = b[1];
  let dx = x2 - x1,
    dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    dx = x - x1;
    dy = y - y1;
    return dx * dx + dy * dy;
  }
  let t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  const px = x1 + t * dx;
  const py = y1 + t * dy;
  dx = x - px;
  dy = y - py;
  return dx * dx + dy * dy;
}

function rdp(points, eps) {
  if (points.length <= 2) return points;
  let maxD = -1;
  let idx = -1;
  for (let i = 1; i < points.length - 1; i++) {
    const d = dist2(points[i], points[0], points[points.length - 1]);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD <= eps * eps) return [points[0], points[points.length - 1]];
  const left = rdp(points.slice(0, idx + 1), eps);
  const right = rdp(points.slice(idx), eps);
  return left.slice(0, -1).concat(right);
}

function simplifyLine(line, eps) {
  if (line.length < 2) return line;
  return rdp(line, eps);
}

function normalizeHighway(tag) {
  if (!tag) return null;
  const base = String(tag).split(";")[0].trim();
  return base || null;
}

function bboxForCity(city) {
  // Rough bbox in degrees; smaller in dense downtown to keep payload small.
  // Latitude affects lon degrees scale; use a mild correction.
  const lat = city.lat;
  const dLat = 0.12;
  const dLon = dLat / Math.max(0.25, Math.cos((Math.abs(lat) * Math.PI) / 180));
  return {
    south: lat - dLat,
    west: city.lon - dLon,
    north: lat + dLat,
    east: city.lon + dLon,
  };
}

async function fetchRoads(city) {
  const bb = bboxForCity(city);
  const q = `
[out:json][timeout:45];
(
  way["highway"](${bb.south},${bb.west},${bb.north},${bb.east});
);
out geom;
`;
  let lastErr = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const endpoint = OVERPASS_ENDPOINTS[attempt % OVERPASS_ENDPOINTS.length];
    const backoffMs = Math.min(60_000, 1500 * Math.pow(2, attempt));
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          "user-agent": "asset-tracker-roadgen/1.0",
        },
        body: new URLSearchParams({ data: q }).toString(),
      });

      if (res.status === 429 || res.status === 504) {
        lastErr = new Error(`Overpass throttled (${res.status}) via ${endpoint}`);
        await sleep(backoffMs);
        continue;
      }
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        lastErr = new Error(
          `Overpass failed ${res.status} via ${endpoint}: ${txt.slice(0, 200)}`
        );
        await sleep(Math.min(10_000, backoffMs));
        continue;
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
      await sleep(backoffMs);
    }
  }
  throw lastErr ?? new Error("Overpass failed with unknown error");
}

function bucketize(elements) {
  /** @type {{ major: number[][][]; medium: number[][][]; minor: number[][][] }} */
  const out = { major: [], medium: [], minor: [] };
  for (const el of elements) {
    if (el.type !== "way" || !Array.isArray(el.geometry)) continue;
    const hw = normalizeHighway(el.tags?.highway);
    if (!hw) continue;
    const line = el.geometry
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon))
      .map(p => [p.lat, p.lon]);
    if (line.length < 2) continue;

    if (MAJOR.has(hw)) out.major.push(line);
    else if (MEDIUM.has(hw)) out.medium.push(line);
    else if (MINOR.has(hw)) out.minor.push(line);
  }
  return out;
}

function clipToBudget(bucket, maxLines) {
  // Keep longest polylines first.
  const scored = bucket
    .map(line => ({ line, score: line.length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxLines)
    .map(x => x.line);
  return scored;
}

function simplifyBuckets(buckets) {
  // Epsilon in degrees. Minor gets more aggressive simplification.
  const major = clipToBudget(buckets.major, 140).map(l => simplifyLine(l, 0.0008));
  const medium = clipToBudget(buckets.medium, 220).map(l => simplifyLine(l, 0.0012));
  const minor = clipToBudget(buckets.minor, 260).map(l => simplifyLine(l, 0.0018));
  return { major, medium, minor };
}

function serializeTS(cityToRoads) {
  const lines = [];
  lines.push('/* eslint-disable @typescript-eslint/consistent-type-imports */');
  lines.push("// Generated by scripts/gen-city-roads.mjs");
  lines.push("// Source: OpenStreetMap contributors (Overpass API).");
  lines.push("");
  lines.push("export type RoadBuckets = {");
  lines.push("  major: Array<Array<[number, number]>>;");
  lines.push("  medium: Array<Array<[number, number]>>;");
  lines.push("  minor: Array<Array<[number, number]>>;");
  lines.push("};");
  lines.push("");
  lines.push("export const CITY_ROADS: Record<string, RoadBuckets> = {");
  for (const [name, roads] of Object.entries(cityToRoads)) {
    const ser = obj =>
      JSON.stringify(obj)
        .replaceAll("[[", "[\n    [")
        .replaceAll("]],", "]\n    ],")
        .replaceAll("]],", "]\n    ],")
        .replaceAll("]]]", "]\n    ]\n  ]")
        .replaceAll("],[", "],\n    [");
    lines.push(`  ${JSON.stringify(name)}: {`);
    lines.push(`    major: ${ser(roads.major)},`);
    lines.push(`    medium: ${ser(roads.medium)},`);
    lines.push(`    minor: ${ser(roads.minor)},`);
    lines.push("  },");
  }
  lines.push("};");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  /** @type {Record<string, any>} */
  const cityToRoads = {};

  /** @type {Set<string>} */
  const done = new Set();
  if (fs.existsSync(OUT_FILE)) {
    const txt = fs.readFileSync(OUT_FILE, "utf8");
    const re = /"([^"]+)":\s*\{/g;
    let m;
    while ((m = re.exec(txt))) {
      done.add(m[1]);
    }
    console.log(`Resume mode: found ${done.size} cities in existing output.`);
  }

  for (let i = 0; i < CITIES.length; i++) {
    const city = CITIES[i];
    if (done.has(city.name)) {
      console.log(`[${i + 1}/${CITIES.length}] Skip ${city.name} (already in output).`);
      continue;
    }
    console.log(`[${i + 1}/${CITIES.length}] Fetch roads for ${city.name}...`);
    const json = await fetchRoads(city);
    const buckets = bucketize(json.elements ?? []);
    const simplified = simplifyBuckets(buckets);
    cityToRoads[city.name] = simplified;
    fs.writeFileSync(OUT_FILE, serializeTS(cityToRoads), "utf8");
    // Keep Overpass happy (plus some jitter)
    await sleep(1200 + Math.round(Math.random() * 600));
  }

  fs.writeFileSync(OUT_FILE, serializeTS(cityToRoads), "utf8");
  console.log(`Wrote ${OUT_FILE}`);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
