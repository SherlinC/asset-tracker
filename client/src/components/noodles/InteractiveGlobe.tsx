import React, { useEffect, useRef } from 'react';
import type { NoodleLocation } from "@/lib/noodle";

export function formatLatitude(lat: number) {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
}

export function formatLongitude(lon: number) {
  return `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
}

function normalizeAngle(angle: number) {
  const fullTurn = Math.PI * 2;
  let normalized = angle % fullTurn;

  if (normalized <= -Math.PI) normalized += fullTurn;
  if (normalized > Math.PI) normalized -= fullTurn;

  return normalized;
}

function shortestAngleDelta(from: number, to: number) {
  return normalizeAngle(to - from);
}

function getCityView(city: NoodleLocation) {
  return {
    yaw: city.lon * Math.PI / 180 - Math.PI / 2,
    pitch: city.lat * Math.PI / 180,
  };
}

export const InteractiveGlobe = ({ selectedCity, allCities }: { selectedCity: NoodleLocation, allCities: readonly NoodleLocation[] }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const selectedCityRef = useRef(selectedCity);
  const rotationRef = useRef({
    ...getCityView(selectedCity),
    targetYaw: getCityView(selectedCity).yaw,
    targetPitch: getCityView(selectedCity).pitch,
  });

  useEffect(() => {
    selectedCityRef.current = selectedCity;
    const nextView = getCityView(selectedCity);

    rotationRef.current.targetYaw =
      rotationRef.current.yaw +
      shortestAngleDelta(rotationRef.current.yaw, nextView.yaw);
    rotationRef.current.targetPitch = nextView.pitch;
  }, [selectedCity]);

  useEffect(() => {
    const gc = canvasRef.current;
    if (!gc) return;
    const gx = gc.getContext('2d');
    if (!gx) return;

    function resizeGlobe() {
      if (!gc) return;
      gc.width = gc.offsetWidth * window.devicePixelRatio;
      gc.height = gc.offsetHeight * window.devicePixelRatio;
      gx!.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    resizeGlobe();
    const handleResize = () => { resizeGlobe(); };
    window.addEventListener('resize', handleResize);

    function latLonToXYZ(latDeg: number, lonDeg: number) {
      const lat = latDeg * Math.PI / 180;
      const lon = lonDeg * Math.PI / 180;
      return {
        x: Math.cos(lat) * Math.cos(lon),
        y: Math.sin(lat),
        z: Math.cos(lat) * Math.sin(lon)
      };
    }

    const COUNTRIES = [
      [[[-124,49],[-95,49],[-74,45],[-67,47],[-70,43],[-74,40],[-76,35],[-80,25],[-82,24],[-87,30],[-90,29],[-97,26],[-100,28],[-104,19],[-117,32],[-124,37],[-124,49]]],
      [[[-141,60],[-141,70],[-156,72],[-168,66],[-166,60],[-156,55],[-149,58],[-141,60]]],
      [[[-60,47],[-64,44],[-66,45],[-70,47],[-76,44],[-82,42],[-83,42],[-88,42],[-90,44],[-96,49],[-110,49],[-120,49],[-130,55],[-136,60],[-140,60],[-140,70],[-120,74],[-90,73],[-65,63],[-60,47]]],
      [[[-44,83],[-17,77],[-18,70],[-26,65],[-45,60],[-54,65],[-58,76],[-44,83]]],
      [[[-117,32],[-97,26],[-91,16],[-87,16],[-83,10],[-80,8],[-77,8],[-80,14],[-85,16],[-90,16],[-92,18],[-97,20],[-104,19],[-104,22],[-117,32]]],
      [[[-34,-5],[-35,-9],[-38,-14],[-40,-20],[-44,-23],[-50,-29],[-53,-33],[-58,-34],[-58,-20],[-60,-14],[-60,-4],[-52,4],[-48,0],[-44,-1],[-34,-5]]],
      [[[-58,-34],[-57,-38],[-62,-42],[-65,-46],[-66,-55],[-68,-55],[-72,-50],[-70,-44],[-70,-38],[-66,-34],[-62,-30],[-58,-28],[-60,-22],[-58,-20],[-58,-34]]],
      [[[-5,50],[-3,51],[-1,51],[0,51],[2,51],[1,53],[-2,54],[-5,54],[-5,57],[-4,58],[-3,59],[-1,60],[-2,58],[-3,56],[-4,56],[-5,54],[-3,52],[-5,50]]],
      [[[-24,64],[-14,63],[-13,65],[-16,66],[-24,66],[-24,64]]],
      [[[5,58],[8,58],[8,57],[10,55],[12,56],[14,55],[14,54],[18,54],[20,56],[24,57],[26,60],[28,62],[29,70],[26,70],[24,68],[18,70],[15,68],[10,63],[5,58]]],
      [[[-5,44],[-1,44],[3,44],[7,44],[8,47],[6,49],[2,51],[0,51],[-2,49],[-2,48],[-4,47],[-5,44]]],
      [[[-9,37],[-9,44],[-7,44],[-4,44],[-2,44],[0,43],[3,44],[3,42],[1,41],[-1,37],[-5,36],[-7,36],[-9,37]]],
      [[[6,51],[8,47],[14,47],[14,52],[12,54],[8,55],[6,53],[6,51]]],
      [[[7,44],[14,44],[16,41],[16,38],[18,40],[15,37],[12,37],[10,38],[8,40],[7,44]]],
      [[[14,54],[24,54],[26,57],[24,58],[22,60],[18,60],[14,58],[14,54]]],
      [[[22,48],[30,48],[34,46],[36,47],[38,47],[36,50],[30,52],[26,52],[22,52],[22,48]]],
      [[[26,42],[36,42],[42,38],[44,38],[44,36],[36,36],[28,36],[26,38],[26,42]]],
      [[[22,54],[30,60],[32,60],[36,60],[40,60],[40,55],[44,44],[38,44],[34,46],[30,48],[26,52],[22,54]]],
      [[[40,70],[60,68],[80,70],[100,70],[120,70],[140,70],[160,68],[170,64],[170,56],[160,52],[150,48],[140,48],[130,44],[130,40],[120,44],[110,54],[100,52],[90,54],[80,56],[70,56],[60,58],[54,54],[50,58],[46,52],[40,56],[40,70]]],
      [[[52,42],[60,44],[70,44],[80,42],[84,50],[80,54],[70,56],[60,54],[50,46],[52,42]]],
      [[[80,32],[88,26],[96,24],[100,22],[104,22],[108,22],[112,24],[116,22],[120,26],[122,30],[122,34],[120,38],[118,40],[114,42],[110,44],[106,44],[102,44],[98,44],[94,44],[90,42],[84,40],[80,38],[78,34],[80,32]]],
      [[[88,50],[96,50],[106,50],[118,50],[120,48],[118,44],[110,44],[106,44],[98,44],[88,48],[88,50]]],
      [[[68,24],[72,22],[74,18],[80,10],[80,8],[78,8],[80,14],[80,18],[77,22],[80,26],[88,26],[88,24],[84,22],[78,20],[72,20],[68,22],[68,24]]],
      [[[96,20],[100,14],[104,10],[104,2],[102,2],[100,4],[98,8],[96,16],[96,20]]],
      [[[100,2],[104,2],[104,-2],[108,-2],[110,-2],[114,-4],[114,-8],[108,-8],[104,-6],[100,-2],[98,2],[100,2]]],
      [[[95,4],[100,0],[106,-6],[108,-8],[106,-8],[102,-4],[98,0],[95,4]]],
      [[[118,8],[120,12],[122,16],[124,14],[124,8],[120,6],[118,8]]],
      [[[130,32],[130,34],[132,34],[134,34],[136,36],[138,38],[140,40],[142,42],[140,44],[138,44],[136,36],[134,34],[132,32],[130,32]]],
      [[[126,34],[128,38],[130,38],[130,36],[128,34],[126,34]]],
      [[[36,28],[38,24],[42,14],[44,12],[50,14],[56,12],[58,20],[54,24],[50,30],[44,28],[40,30],[36,28]]],
      [[[44,38],[48,38],[54,40],[60,36],[62,26],[58,22],[50,26],[44,28],[44,38]]],
      [[[38,36],[44,38],[48,32],[46,28],[38,28],[36,32],[38,36]]],
      [[[25,22],[34,22],[34,28],[36,29],[34,30],[30,30],[25,30],[25,22]]],
      [[[-10,30],[0,30],[10,30],[14,24],[14,20],[10,18],[0,18],[-10,18],[-10,30]]],
      [[[-18,16],[-16,10],[-10,4],[-4,4],[2,4],[6,4],[8,2],[10,4],[14,4],[10,8],[4,10],[0,14],[-4,14],[-8,12],[-14,10],[-18,14],[-18,16]]],
      [[[36,20],[42,12],[44,10],[42,12],[44,8],[42,2],[40,-4],[36,-4],[34,-4],[34,4],[38,10],[36,20]]],
      [[[18,-28],[26,-30],[32,-28],[34,-24],[36,-18],[34,-14],[32,-10],[28,-8],[22,-18],[18,-28]]],
      [[[2,4],[6,4],[8,6],[10,8],[14,8],[14,4],[10,4],[8,2],[6,4],[2,4]]],
      [[[36,14],[42,12],[50,12],[52,8],[42,2],[36,4],[34,8],[36,14]]],
      [[[114,-22],[114,-34],[118,-38],[124,-34],[130,-32],[136,-34],[140,-38],[146,-38],[150,-36],[154,-28],[154,-20],[148,-18],[142,-10],[136,-12],[130,-14],[124,-18],[120,-20],[114,-22]]],
      [[[168,-46],[172,-42],[174,-40],[172,-36],[168,-38],[168,-46]]],
    ];

    function pointInPolygon(lon: number, lat: number, ring: number[][]) {
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi))
          inside = !inside;
      }
      return inside;
    }

    const globePts: {x: number, y: number, z: number, size: number, brightness: number, phase: number}[] = [];
    for (let lat = -90; lat <= 90; lat += 4.5) {
      const rCos = Math.cos(lat * Math.PI / 180);
      const pointsInLat = Math.max(1, Math.floor(72 * rCos));
      for (let i = 0; i < pointsInLat; i++) {
        const lon = (i / pointsInLat) * 360 - 180;
        let isLand = false;
        for (const country of COUNTRIES) {
          if (pointInPolygon(lon, lat, country[0])) { isLand = true; break; }
        }
        if (!isLand && Math.random() > 0.15) continue;
        globePts.push({
          ...latLonToXYZ(lat, lon),
          size: isLand ? (1.8 + Math.random() * 1.0) : (1.0 + Math.random() * 0.6),
          brightness: isLand ? (0.7 + Math.random() * 0.3) : (0.2 + Math.random() * 0.15),
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    const highlightedCities = allCities.map(city => ({
      id: city.id,
      point: latLonToXYZ(city.lat, city.lon)
    }));

    let globeTick = 0;

    function drawGlobe() {
      if (!gc || !gx) return;
      globeTick += 0.012;

      const isDark = document.documentElement.classList.contains('dark');
      const GOLD_CORE = isDark ? '251,191,36' : '203,163,88';
      const GOLD_ACCENT = isDark ? '245,158,11' : '161,161,170';
      const GOLD_DEEP = isDark ? '180,83,9' : '212,212,216';

      const rot = rotationRef.current;
      const ease = 0.035;
      
      const yawDiff = shortestAngleDelta(rot.yaw, rot.targetYaw);
      const pitchDiff = rot.targetPitch - rot.pitch;
      
      rot.yaw += yawDiff * ease;
      rot.pitch += pitchDiff * ease;

      const cw = gc.width;
      const ch = gc.height;
      const W = gc.offsetWidth, H = gc.offsetHeight;
      gx.clearRect(0, 0, W, H);

      if (Math.abs(yawDiff) < 0.0004) {
        rot.yaw = rot.targetYaw;
      }
      if (Math.abs(pitchDiff) < 0.0004) {
        rot.pitch = rot.targetPitch;
      }

      function rotY(p: {x: number, y: number, z: number}, a: number) {
        return {
          x: p.x * Math.cos(a) + p.z * Math.sin(a),
          y: p.y,
          z: -p.x * Math.sin(a) + p.z * Math.cos(a)
        };
      }

      function rotX(p: {x: number, y: number, z: number}, a: number) {
        return {
          x: p.x,
          y: p.y * Math.cos(a) - p.z * Math.sin(a),
          z: p.y * Math.sin(a) + p.z * Math.cos(a)
        };
      }

      function applyRotation(pt: {x: number, y: number, z: number}) {
        return rotX(
          rotY(pt, rot.yaw),
          rot.pitch
        );
      }

      const cx = W / 2, cy = H / 2;
      const R = Math.min(W, H) * 0.4;
      const sizeScale = R / 300;

      gx.beginPath(); gx.arc(cx, cy, R, 0, Math.PI * 2);
      
      if (isDark) {
        const bgGrad = gx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R);
        bgGrad.addColorStop(0, 'rgba(10,8,4,0.4)');
        bgGrad.addColorStop(1, 'rgba(10,8,4,0.9)');
        gx.fillStyle = bgGrad; 
      } else {
        gx.fillStyle = 'transparent';
      }
      gx.fill();

      for (let p = -80; p <= 80; p += 20) {
        const latDeg = p;
        gx.beginPath(); let first = true;
        for (let m = 0; m <= 72; m++) {
          const lonDeg = (m / 72) * 360 - 180;
          const p3 = latLonToXYZ(latDeg, lonDeg);
          const rp = applyRotation(p3);
          if (rp.z < 0) { first = true; continue; }
          const sx = cx - rp.x * R, sy = cy - rp.y * R;
          first ? gx.moveTo(sx, sy) : gx.lineTo(sx, sy); first = false;
        }
        gx.strokeStyle = isDark ? `rgba(${GOLD_ACCENT},0.08)` : `rgba(${GOLD_ACCENT},0.35)`; gx.lineWidth = 0.4; gx.stroke();
      }

      for (let m = 0; m < 18; m++) {
        const lonDeg = (m / 18) * 360 - 180;
        gx.beginPath(); let first = true;
        for (let s = 0; s <= 60; s++) {
          const latDeg = (s / 60) * 180 - 90;
          const p3 = latLonToXYZ(latDeg, lonDeg);
          const rp = applyRotation(p3);
          if (rp.z < 0) { first = true; continue; }
          const sx = cx - rp.x * R, sy = cy - rp.y * R;
          first ? gx.moveTo(sx, sy) : gx.lineTo(sx, sy); first = false;
        }
        gx.strokeStyle = isDark ? `rgba(${GOLD_ACCENT},0.06)` : `rgba(${GOLD_ACCENT},0.3)`; gx.lineWidth = 0.4; gx.stroke();
      }

      gx.save();
      gx.beginPath(); gx.arc(cx, cy, R, 0, Math.PI * 2); gx.clip();

      const projected = globePts.map(pt => {
        const rp = applyRotation(pt);
        return { ...pt, rx: rp.x, ry: rp.y, rz: rp.z };
      });
      projected.sort((a, b) => a.rz - b.rz);

      projected.forEach(pt => {
        const sx = cx - pt.rx * R, sy = cy - pt.ry * R;
        const depth = (pt.rz + 1) / 2;
        const scaledSize = pt.size * sizeScale;

        if (pt.rz < 0) {
          const backDepth = Math.max(0, 1 + pt.rz);
          const alpha = pt.brightness * backDepth * backDepth * (isDark ? 0.08 : 0.15);
          gx.beginPath(); gx.arc(sx, sy, scaledSize * 0.6, 0, Math.PI * 2);
          gx.fillStyle = `rgba(${GOLD_DEEP},${alpha})`; gx.fill();
        } else {
          const edgeFade = Math.pow(depth, 0.5);
          const twinkle = 0.7 + 0.3 * Math.sin(globeTick * 1.2 + pt.phase);
          const alpha = pt.brightness * edgeFade * twinkle * (isDark ? 0.75 : 1.0);
          gx.beginPath(); gx.arc(sx, sy, scaledSize * edgeFade, 0, Math.PI * 2);
          const dotGradient = gx.createRadialGradient(sx, sy, 0, sx, sy, scaledSize * edgeFade * 2.4);
          dotGradient.addColorStop(0, `rgba(${GOLD_CORE},${alpha})`);
          dotGradient.addColorStop(0.55, `rgba(${GOLD_ACCENT},${alpha * (isDark ? 0.75 : 0.9)})`);
          dotGradient.addColorStop(1, `rgba(${GOLD_DEEP},0)`);
          gx.fillStyle = dotGradient; gx.fill();
        }
      });
      gx.restore();

      gx.beginPath(); gx.arc(cx, cy, R, 0, Math.PI * 2);
      gx.strokeStyle = isDark ? `rgba(${GOLD_ACCENT},0.18)` : `rgba(${GOLD_ACCENT},0.8)`; gx.lineWidth = 1; gx.stroke();

      highlightedCities.forEach(city => {
        const rotated = applyRotation(city.point);
        const sx = cx - rotated.x * R;
        const sy = cy - rotated.y * R;
        const isSelected = city.id === selectedCityRef.current.id;

        if (rotated.z > 0) {
          const alpha = isSelected ? 1 : 0.45;
          const radius = (isSelected ? 5 : 2) * sizeScale;
          const haloRadius = (isSelected ? 25 : 6) * sizeScale;

          gx.beginPath(); gx.arc(sx, sy, radius, 0, Math.PI * 2);
          gx.fillStyle = isSelected ? '#cba358' : `rgba(${GOLD_ACCENT},0.6)`;
          gx.shadowColor = isDark ? '#f59e0b' : '#cba358';
          gx.shadowBlur = isSelected ? 25 * sizeScale : 0;
          gx.fill();
          gx.shadowBlur = 0;

          if (isSelected) {
            const cityGlow = gx.createRadialGradient(sx, sy, 0, sx, sy, haloRadius);
            cityGlow.addColorStop(0, `rgba(${GOLD_CORE},${alpha * 0.7})`);
            cityGlow.addColorStop(0.6, `rgba(${GOLD_ACCENT},${alpha * 0.3})`);
            cityGlow.addColorStop(1, `rgba(${GOLD_DEEP},0)`);
            gx.beginPath(); gx.arc(sx, sy, haloRadius, 0, Math.PI * 2);
            gx.fillStyle = cityGlow;
            gx.fill();

            [1, 2, 3].forEach(k => {
              const prog = ((globeTick * 0.7 + k * 0.33) % 1);
              gx.beginPath(); gx.arc(sx, sy, prog * 28 * sizeScale, 0, Math.PI * 2);
              gx.strokeStyle = `rgba(${GOLD_CORE},${(1 - prog) * 0.9})`;
              gx.lineWidth = 1.5; gx.stroke();
            });
          } else {
            gx.beginPath();
            gx.arc(sx, sy, haloRadius + 1, 0, Math.PI * 2);
            gx.strokeStyle = `rgba(${GOLD_ACCENT},0.15)`;
            gx.lineWidth = 0.6;
            gx.stroke();
          }
        } else if (isSelected) {
          const backDepth = Math.max(0, 1 + rotated.z);
          const pulse = 0.5 + 0.5 * Math.sin(globeTick * 2.5);
          const ghostR = (8 + pulse * 5) * sizeScale;
          const ghostA = backDepth * backDepth * 0.18 * pulse;
          const gh = gx.createRadialGradient(sx, sy, 0, sx, sy, ghostR);
          gh.addColorStop(0, `rgba(${GOLD_ACCENT},${ghostA})`);
          gh.addColorStop(1, `rgba(${GOLD_DEEP},0)`);
          gx.beginPath(); gx.arc(sx, sy, ghostR, 0, Math.PI * 2);
          gx.fillStyle = gh; gx.fill();
        }
      });

      animFrameRef.current = requestAnimationFrame(drawGlobe);
    }

    animFrameRef.current = requestAnimationFrame(drawGlobe);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [allCities]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    />
  );
};

export const PulsingDot = () => {
    return (
      <>
        <style>{`
          @keyframes locPulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(203, 163, 88, 0.95); }
            70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(203, 163, 88, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(203, 163, 88, 0); }
          }
          .dark .loc-pulse-dot {
            animation: locPulseDark 2s infinite;
          }
          @keyframes locPulseDark {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
          }
        `}</style>
        <span className="loc-pulse-dot inline-block w-[8px] h-[8px] rounded-full bg-[radial-gradient(circle_at_30%_30%,_#fde68a,_#cba358_45%,_#8a6d3b_100%)] dark:bg-[radial-gradient(circle_at_30%_30%,_#fde68a,_#fbbf24_45%,_#f59e0b_100%)] shadow-[0_0_12px_rgba(203,163,88,1)] dark:shadow-[0_0_8px_rgba(245,158,11,0.95)] animate-[locPulse_2s_infinite]" />
      </>
    );
  };
