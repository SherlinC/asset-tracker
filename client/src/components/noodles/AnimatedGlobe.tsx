import { useEffect, useMemo, useRef } from "react";

import { CITY_ROADS } from "./cityRoads";

type City = {
  name: string;
  lat: number;
  lon: number;
};

type Props = {
  className?: string;
  selectedCityName?: string;
  /** If true, keep a slow continuous rotation. Defaults to false. */
  autoRotate?: boolean;
};

const THEME_COLOR = { r: 245, g: 158, b: 11 };

function usePrefersReducedMotion() {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  }, []);
}

export function AnimatedGlobe({
  className,
  selectedCityName,
  autoRotate = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);

  const prefersReducedMotion = usePrefersReducedMotion();

  const cities = useMemo<City[]>(
    () => [
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
    ],
    []
  );

  const sichuanOutline = useMemo(() => {
    // Sichuan province outline (lat, lon), simplified from public GeoJSON
    // (geojson.cn administrative boundary data). Used as a "real-ish" overlay
    // when focusing Chengdu / Sichuan.
    return [
      [30.7781, 102.9936],
      [30.8156, 103.0793],
      [30.7917, 103.122],
      [30.848, 103.1746],
      [30.8087, 103.3049],
      [30.8832, 103.4423],
      [30.9357, 103.4593],
      [30.9724, 103.5181],
      [31.0407, 103.5039],
      [31.1944, 103.5834],
      [31.3408, 103.5726],
      [31.3506, 103.6605],
      [31.4339, 103.7853],
      [31.4215, 103.8898],
      [31.3595, 103.9285],
      [31.3129, 103.8914],
      [31.2302, 103.9298],
      [31.1787, 104.0085],
      [31.1039, 104.02],
      [30.9917, 104.1693],
      [30.9136, 104.1479],
      [30.8911, 104.321],
      [30.9386, 104.3716],
      [30.951, 104.4652],
      [30.9208, 104.5331],
      [30.8824, 104.5199],
      [30.8263, 104.7029],
      [30.7714, 104.7119],
      [30.7783, 104.7349],
      [30.7274, 104.7477],
      [30.7198, 104.7946],
      [30.6414, 104.8227],
      [30.6407, 104.8486],
      [30.5774, 104.8169],
      [30.5874, 104.857],
      [30.5511, 104.8928],
      [30.4258, 104.8701],
      [30.3777, 104.8975],
      [30.3448, 104.8525],
      [30.3609, 104.8335],
      [30.3068, 104.8488],
      [30.279, 104.7967],
      [30.3083, 104.7238],
      [30.2748, 104.6905],
      [30.286, 104.648],
      [30.2402, 104.6531],
      [30.2445, 104.5996],
      [30.195, 104.5666],
      [30.1848, 104.4871],
      [30.09, 104.4343],
      [30.186, 104.3645],
      [30.2513, 104.2331],
      [30.3138, 104.2323],
      [30.3251, 104.1815],
      [30.2257, 104.1179],
      [30.2715, 104.0496],
      [30.263, 103.9986],
      [30.3615, 103.9261],
      [30.3298, 103.9112],
      [30.3559, 103.8742],
      [30.3426, 103.7878],
      [30.2703, 103.6819],
      [30.2002, 103.653],
      [30.1941, 103.5678],
      [30.1035, 103.4852],
      [30.1347, 103.4551],
      [30.096, 103.4625],
      [30.1275, 103.4437],
      [30.0949, 103.3951],
      [30.1347, 103.3604],
      [30.2277, 103.3712],
      [30.2328, 103.3211],
      [30.2604, 103.3139],
      [30.25, 103.2531],
      [30.2068, 103.2234],
      [30.2483, 103.1828],
      [30.207, 103.1472],
      [30.2203, 103.0768],
      [30.3058, 103.0622],
      [30.3672, 103.128],
      [30.4528, 103.1255],
      [30.5119, 103.1859],
      [30.5885, 103.1282],
      [30.657, 103.1352],
      [30.7151, 103.0769],
      [30.7038, 103.0308],
      [30.7719, 102.9975],
      [30.7781, 102.9936],
    ] as Array<[number, number]>;
  }, []);

  const continents = useMemo(() => {
    return [
      [
        [-10, 35],
        [5, 36],
        [10, 54],
        [20, 54],
        [25, 70],
        [30, 73],
        [40, 68],
        [50, 68],
        [60, 73],
        [68, 68],
        [70, 55],
        [65, 45],
        [70, 35],
        [68, 28],
        [58, 25],
        [55, 20],
        [50, 15],
        [45, 10],
        [40, 15],
        [35, 10],
        [30, 8],
        [25, 15],
        [20, 20],
        [15, 15],
        [10, 10],
        [5, 10],
        [0, 5],
        [-5, 10],
        [-10, 20],
        [-15, 25],
        [-10, 35],
      ],
      [
        [-17, 14],
        [-15, 0],
        [-10, -5],
        [-5, -10],
        [0, -10],
        [5, -5],
        [10, -8],
        [15, -5],
        [20, -5],
        [25, 0],
        [30, 5],
        [35, 10],
        [40, 12],
        [42, 12],
        [42, 15],
        [40, 20],
        [38, 25],
        [38, 30],
        [35, 32],
        [32, 30],
        [28, 25],
        [25, 20],
        [22, 15],
        [20, 10],
        [18, 5],
        [15, 0],
        [10, -5],
        [5, -10],
        [0, -15],
        [-5, -20],
        [-5, -25],
        [-10, -30],
        [-15, -25],
        [-20, -20],
        [-20, -15],
        [-18, -10],
        [-17, 0],
        [-17, 14],
      ],
      [
        [70, -140],
        [72, -120],
        [72, -100],
        [70, -80],
        [65, -70],
        [60, -65],
        [55, -60],
        [50, -55],
        [45, -60],
        [42, -70],
        [40, -72],
        [38, -75],
        [35, -76],
        [30, -80],
        [25, -80],
        [20, -87],
        [15, -85],
        [10, -83],
        [10, -75],
        [15, -70],
        [20, -65],
        [25, -60],
        [30, -75],
        [35, -76],
        [40, -74],
        [45, -65],
        [50, -55],
        [55, -60],
        [60, -65],
        [65, -55],
        [68, -58],
        [70, -65],
        [72, -80],
        [72, -100],
        [70, -120],
        [70, -140],
      ],
      [
        [10, -62],
        [8, -60],
        [5, -52],
        [0, -50],
        [-5, -35],
        [-8, -35],
        [-10, -37],
        [-15, -39],
        [-20, -40],
        [-25, -48],
        [-30, -50],
        [-33, -52],
        [-38, -57],
        [-42, -63],
        [-45, -65],
        [-50, -68],
        [-55, -65],
        [-55, -60],
        [-50, -55],
        [-45, -50],
        [-40, -45],
        [-35, -40],
        [-30, -35],
        [-25, -43],
        [-22, -42],
        [-20, -40],
        [-15, -38],
        [-10, -37],
        [-5, -35],
        [0, -50],
        [5, -52],
        [8, -60],
        [10, -62],
      ],
      [
        [-15, 130],
        [-12, 136],
        [-14, 140],
        [-18, 146],
        [-22, 150],
        [-28, 154],
        [-32, 152],
        [-36, 150],
        [-38, 147],
        [-38, 142],
        [-35, 138],
        [-32, 134],
        [-30, 115],
        [-22, 114],
        [-18, 122],
        [-15, 130],
      ],
    ] as Array<Array<[number, number]>>;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let globeAngle = 0;
    let time = 0;
    let targetAngle: number | null = null;
    let isSnapping = false;
    let zoom = 1;
    let targetZoom = 1;
    let isZooming = false;
    let flatT = 0; // 0 = globe, 1 = flat local map
    let targetFlatT = 0;
    let isMorphing = false;

    const getHub = () => {
      const name = selectedCityName?.trim();
      const found = name ? cities.find(c => c.name === name) : undefined;
      return found ?? cities[0];
    };

    const normalizeAngle = (angle: number) => {
      const twoPi = Math.PI * 2;
      let a = angle % twoPi;
      if (a > Math.PI) a -= twoPi;
      if (a < -Math.PI) a += twoPi;
      return a;
    };

    const computeTargetAngleForCity = (city: City) => {
      // Center selected city on the front: theta = pi/2
      const lonRad = ((city.lon + 180) * Math.PI) / 180;
      return Math.PI / 2 - lonRad;
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const latLonTo3D = (lat: number, lon: number, rotY: number) => {
      const phi = ((90 - lat) * Math.PI) / 180;
      const theta = ((lon + 180) * Math.PI) / 180 + rotY;
      return {
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.cos(phi),
        z: Math.sin(phi) * Math.sin(theta),
      };
    };

    const project3D = (
      p3: { x: number; y: number; z: number },
      cx: number,
      cy: number,
      radius: number
    ) => {
      return {
        x: cx + p3.x * radius,
        y: cy - p3.y * radius,
        z: p3.z,
      };
    };

    const drawGlobe = (opacity: number) => {
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.36 * zoom;
      const { r, g, b } = THEME_COLOR;

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.globalAlpha = opacity;

      // No outer glow fill — keep canvas fully transparent

      // No solid globe fill — keep the canvas transparent so it blends
      // with the NoodleViz immersive background. We only draw outlines/grid.

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      const latCount = 12;
      for (let i = 1; i < latCount; i++) {
        const latAngle = -Math.PI / 2 + (Math.PI / latCount) * i;
        const rLat = Math.cos(latAngle) * radius;
        const yLat = cy + Math.sin(latAngle) * radius;
        if (rLat > 1) {
          ctx.beginPath();
          ctx.ellipse(cx, yLat, rLat, rLat * 0.15, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${r},${g},${b},0.14)`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      const lonCount = 18;
      for (let i = 0; i < lonCount; i++) {
        const ang = (Math.PI / lonCount) * i + globeAngle;
        const cosA = Math.cos(ang);
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.abs(cosA) * radius, radius, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.06 + Math.abs(cosA) * 0.12})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      continents.forEach(outline => {
        ctx.beginPath();
        let started = false;
        outline.forEach(([lat, lon]) => {
          const p3 = latLonTo3D(lat, lon, globeAngle);
          if (p3.z < -0.05) {
            started = false;
            return;
          }
          const p2 = project3D(p3, cx, cy, radius);
          if (!started) {
            ctx.moveTo(p2.x, p2.y);
            started = true;
          } else {
            ctx.lineTo(p2.x, p2.y);
          }
        });
        ctx.closePath();
        ctx.strokeStyle = `rgba(${r},${g},${b},0.55)`;
        ctx.lineWidth = 0.9;
        ctx.stroke();
      });

      // Extra detail when focusing Chengdu: highlight Sichuan outline
      const hub = getHub();
      if (hub.name === "成都" && zoom > 1.06) {
        ctx.beginPath();
        let started = false;
        for (const [lat, lon] of sichuanOutline) {
          const p3 = latLonTo3D(lat, lon, globeAngle);
          if (p3.z < -0.05) {
            started = false;
            continue;
          }
          const p2 = project3D(p3, cx, cy, radius);
          if (!started) {
            ctx.moveTo(p2.x, p2.y);
            started = true;
          } else {
            ctx.lineTo(p2.x, p2.y);
          }
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(${r},${g},${b},0.85)`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      ctx.restore();

      // No shimmer fill — keep canvas fully transparent

      // No globe border stroke — keep the globe minimal and immersive
      ctx.restore();
    };

    const drawCities = (opacity: number) => {
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.36;
      const { r, g, b } = THEME_COLOR;

      ctx.save();
      ctx.globalAlpha = opacity;

      const hub = getHub();
      const hub3 = latLonTo3D(hub.lat, hub.lon, globeAngle);
      const hub2 = hub3.z > 0.05 ? project3D(hub3, cx, cy, radius) : null;

      cities.forEach((city, idx) => {
        const p3 = latLonTo3D(city.lat, city.lon, globeAngle);
        if (p3.z < 0.05) return;

        const p2 = project3D(p3, cx, cy, radius);
        const visibility = Math.max(0, p3.z);

        const isSelected = city.name === hub.name;
        const pulse = Math.sin(time * 0.05 + idx * 1.3);
        const dotR = 2.5 + pulse * 1.2;
        const ringR = 6 + pulse * 4;
        const alpha = visibility * (0.7 + pulse * 0.3);

        if (isSelected) {
          ctx.beginPath();
          ctx.arc(p2.x, p2.y, ringR + 10, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${r},${g},${b},${Math.min(0.7, alpha * 0.55)})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(p2.x, p2.y, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.35})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p2.x, p2.y, dotR + 2.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.55})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p2.x, p2.y, dotR, 0, Math.PI * 2);
        const dotGrad = ctx.createRadialGradient(p2.x, p2.y, 0, p2.x, p2.y, dotR);
        dotGrad.addColorStop(
          0,
          `rgba(255,230,150,${isSelected ? Math.min(1, alpha * 1.2) : alpha})`
        );
        dotGrad.addColorStop(1, `rgba(${r},${g},${b},${alpha * 0.6})`);
        ctx.fillStyle = dotGrad;
        ctx.fill();

        const showLabel =
          isSelected || ["成都", "北京", "纽约", "伦敦", "东京"].includes(city.name);
        if (showLabel && visibility > 0.3) {
          ctx.font = `${10 + (city.name === hub.name ? 2 : 0)}px ui-sans-serif`;
          ctx.fillStyle = `rgba(255,220,120,${alpha * 0.9})`;
          ctx.textAlign = "left";
          ctx.fillText(city.name, p2.x + dotR + 4, p2.y + 3);
        }

        if (hub2 && city.name !== hub.name && hub3.z > 0.05 && p3.z > 0.3) {
          ctx.beginPath();
          const mx = (p2.x + hub2.x) / 2;
          const my = (p2.y + hub2.y) / 2 - 20;
          ctx.moveTo(hub2.x, hub2.y);
          ctx.quadraticCurveTo(mx, my, p2.x, p2.y);
          ctx.strokeStyle = `rgba(${r},${g},${b},${visibility * 0.18})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      });

      ctx.restore();
    };

    const drawFlatLocal = (opacity: number) => {
      if (opacity <= 0) return;

      const hub = getHub();
      const { r, g, b } = THEME_COLOR;
      const pad = Math.min(width, height) * 0.08;

      const w = width - pad * 2;
      const h = height - pad * 2;

      // Put the selected city slightly off-center for composition.
      const centerX = pad + w * 0.44;
      const centerY = pad + h * 0.42;

      // Degrees visible around the city. Smaller => more "zoomed-in" feel.
      const extentDeg = 6.5;
      const s = Math.min(w, h) / (extentDeg * 2);

      const proj = (lat: number, lon: number) => {
        const x = centerX + (lon - hub.lon) * s;
        const y = centerY - (lat - hub.lat) * s;
        return { x, y };
      };

      ctx.save();
      ctx.globalAlpha = opacity;

      // Subtle tech grid
      const gridSize = 26;
      ctx.strokeStyle = `rgba(${r},${g},${b},0.08)`;
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
        ctx.stroke();
      }

      const roads = CITY_ROADS[hub.name];
      if (roads) {
        // Poster-style road hierarchy: minor (thin/light) → medium → major (bold).
        const drawBucket = (
          lines: Array<Array<[number, number]>>,
          lineWidth: number,
          alpha: number
        ) => {
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.lineWidth = lineWidth;
          for (const line of lines) {
            if (line.length < 2) continue;
            const first = proj(line[0][0], line[0][1]);
            ctx.beginPath();
            ctx.moveTo(first.x, first.y);
            for (let i = 1; i < line.length; i++) {
              const p = proj(line[i][0], line[i][1]);
              ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
          }
        };
        drawBucket(roads.minor, 0.6, 0.14);
        drawBucket(roads.medium, 1, 0.32);
        drawBucket(roads.major, 1.8, 0.62);
      } else {
        // Fallback: procedural contours when no OSM data.
        const seed =
          hub.name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) +
          Math.round((hub.lat + 90) * 10) +
          Math.round((hub.lon + 180) * 10);
        const wobbleA = 0.6 + ((seed % 13) / 13) * 0.8;
        const wobbleB = 0.8 + (((seed >> 3) % 17) / 17) * 0.6;

        const rings = 10;
        for (let i = 0; i < rings; i++) {
          const baseR = 26 + i * 18;
          const points = 90;
          ctx.beginPath();
          for (let k = 0; k <= points; k++) {
            const t = (k / points) * Math.PI * 2;
            const wobble =
              Math.sin(t * (2 + (seed % 3)) + seed * 0.12) * wobbleA +
              Math.cos(t * (3 + ((seed >> 2) % 4)) - seed * 0.09) * wobbleB;
            const rr = baseR + wobble * 8;
            const x = centerX + Math.cos(t) * rr * 1.08;
            const y = centerY + Math.sin(t) * rr * 0.86;
            if (k === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = `rgba(${r},${g},${b},${0.18 + i * 0.02})`;
          ctx.lineWidth = i === rings - 1 ? 1.4 : 1;
          ctx.stroke();
        }
      }

      // Chengdu special: Sichuan outline overlay
      if (hub.name === "成都") {
        ctx.beginPath();
        let started = false;
        for (const [lat, lon] of sichuanOutline) {
          const p = proj(lat, lon);
          if (!started) {
            ctx.moveTo(p.x, p.y);
            started = true;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(${r},${g},${b},0.95)`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner contour hint (scaled inset)
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(0.92, 0.92);
        ctx.translate(-centerX, -centerY);
        ctx.beginPath();
        started = false;
        for (const [lat, lon] of sichuanOutline) {
          const p = proj(lat, lon);
          if (!started) {
            ctx.moveTo(p.x, p.y);
            started = true;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(${r},${g},${b},0.25)`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      // Chengdu marker
      const hub2 = proj(hub.lat, hub.lon);
      ctx.beginPath();
      ctx.arc(hub2.x, hub2.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.55)`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(hub2.x, hub2.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,230,150,0.95)`;
      ctx.fill();

      ctx.font = "12px ui-sans-serif";
      ctx.fillStyle = "rgba(255,230,150,0.9)";
      ctx.textAlign = "left";
      ctx.fillText(hub.name, hub2.x + 14, hub2.y + 4);

      ctx.restore();
    };

    const tick = () => {
      if (isPausedRef.current) return;
      time += 1;

      const nextHub = getHub();
      const nextTarget = computeTargetAngleForCity(nextHub);
      if (targetAngle == null || nextTarget !== targetAngle) {
        targetAngle = nextTarget;
        isSnapping = true;
        zoom = 1;
        targetZoom = nextHub.name === "成都" ? 1.75 : 1.55;
        isZooming = false;
        targetFlatT = 1;
        isMorphing = false;
      }

      if (isSnapping && targetAngle != null) {
        const diff = normalizeAngle(targetAngle - globeAngle);
        globeAngle = globeAngle + diff * 0.08;
        if (Math.abs(diff) < 0.002) {
          globeAngle = targetAngle;
          isSnapping = false;
          isZooming = true;
        }
      } else if (autoRotate) {
        globeAngle += 0.0025;
      }

      if (isZooming) {
        const dz = targetZoom - zoom;
        zoom = zoom + dz * 0.04;
        if (Math.abs(dz) < 0.002) {
          zoom = targetZoom;
          isZooming = false;
          isMorphing = true;
        }
      }

      if (isMorphing) {
        const df = targetFlatT - flatT;
        flatT = flatT + df * 0.05;
        if (Math.abs(df) < 0.01) {
          flatT = targetFlatT;
          isMorphing = false;
        }
      }

      const globeOpacity = 1 - flatT;
      const flatOpacity = flatT;

      drawGlobe(globeOpacity);
      drawCities(globeOpacity);
      drawFlatLocal(flatOpacity);
      rafRef.current = window.requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      const shouldPause = document.hidden;
      isPausedRef.current = shouldPause;
      if (!shouldPause && rafRef.current == null && !prefersReducedMotion) {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    };

    const ro = new ResizeObserver(() => resize());
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    resize();

    document.addEventListener("visibilitychange", onVisibility);

    if (!prefersReducedMotion) {
      rafRef.current = window.requestAnimationFrame(tick);
    } else {
      drawGlobe(1);
      drawCities(1);
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [
    autoRotate,
    cities,
    continents,
    prefersReducedMotion,
    selectedCityName,
    sichuanOutline,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={className ?? "absolute inset-0 h-full w-full"}
    />
  );
}
