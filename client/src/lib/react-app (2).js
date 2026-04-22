import React, { useEffect, useRef } from 'react';

const GlobeCanvas = () => {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const gc = canvasRef.current;
    if (!gc) return;
    const gx = gc.getContext('2d');

    function resizeGlobe() {
      gc.width = gc.offsetWidth * window.devicePixelRatio;
      gc.height = gc.offsetHeight * window.devicePixelRatio;
      gx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    resizeGlobe();
    const handleResize = () => { resizeGlobe(); };
    window.addEventListener('resize', handleResize);

    function latLonToXYZ(latDeg, lonDeg) {
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

    function pointInPolygon(lon, lat, ring) {
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi))
          inside = !inside;
      }
      return inside;
    }

    const DOT_STEP = 2.2;
    const globePts = [];

    for (let lat = -85; lat <= 85; lat += DOT_STEP) {
      for (let lon = -180; lon <= 180; lon += DOT_STEP) {
        let onLand = false;
        for (const country of COUNTRIES) {
          for (const ring of country) {
            if (pointInPolygon(lon, lat, ring)) { onLand = true; break; }
          }
          if (onLand) break;
        }
        if (!onLand) continue;

        const p3 = latLonToXYZ(lat, lon);
        const isSZ = (Math.abs(lat - 22.54) < 1.5 && Math.abs(lon - 114.06) < 1.5);
        globePts.push({
          x: p3.x, y: p3.y, z: p3.z,
          size: isSZ ? 1.8 : (0.9 + Math.random() * 0.5),
          brightness: isSZ ? 1.0 : (0.4 + Math.random() * 0.4),
          isShenzhen: isSZ,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    const RING_LATS = [-60, -30, 0, 30, 60];
    const LON_STEPS = 120;
    let globeAngle = -(114.06 * Math.PI / 180 - Math.PI * 0.18);
    let globeTick = 0;

    function rotY(p, a) {
      return {
        x: p.x * Math.cos(a) + p.z * Math.sin(a),
        y: p.y,
        z: -p.x * Math.sin(a) + p.z * Math.cos(a)
      };
    }

    function drawGlobe() {
      const W = gc.offsetWidth, H = gc.offsetHeight;
      gx.clearRect(0, 0, W, H);
      globeAngle += 0.0015;
      globeTick += 0.016;

      const cx = W * 0.5, cy = H * 0.5;
      const R = Math.min(W, H) * 0.45;

      const atm = gx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.3);
      atm.addColorStop(0, 'rgba(0,255,102,0.07)');
      atm.addColorStop(1, 'rgba(0,0,0,0)');
      gx.beginPath(); gx.arc(cx, cy, R * 1.3, 0, Math.PI * 2);
      gx.fillStyle = atm; gx.fill();

      const sphereGrad = gx.createRadialGradient(cx - R * 0.3, cy - R * 0.2, 0, cx, cy, R);
      sphereGrad.addColorStop(0, 'rgba(0,20,8,0.4)');
      sphereGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
      gx.beginPath(); gx.arc(cx, cy, R, 0, Math.PI * 2);
      gx.fillStyle = sphereGrad; gx.fill();

      RING_LATS.forEach(latDeg => {
        gx.beginPath(); let first = true;
        for (let s = 0; s <= LON_STEPS; s++) {
          const lonDeg = (s / LON_STEPS) * 360 - 180;
          const p3 = latLonToXYZ(latDeg, lonDeg);
          const rp = rotY(p3, globeAngle);
          if (rp.z < 0) { first = true; continue; }
          const sx = cx + rp.x * R, sy = cy - rp.y * R;
          first ? gx.moveTo(sx, sy) : gx.lineTo(sx, sy); first = false;
        }
        gx.strokeStyle = 'rgba(0,255,102,0.06)'; gx.lineWidth = 0.4; gx.stroke();
      });

      for (let m = 0; m < 18; m++) {
        const lonDeg = (m / 18) * 360 - 180;
        gx.beginPath(); let first = true;
        for (let s = 0; s <= 60; s++) {
          const latDeg = (s / 60) * 180 - 90;
          const p3 = latLonToXYZ(latDeg, lonDeg);
          const rp = rotY(p3, globeAngle);
          if (rp.z < 0) { first = true; continue; }
          const sx = cx + rp.x * R, sy = cy - rp.y * R;
          first ? gx.moveTo(sx, sy) : gx.lineTo(sx, sy); first = false;
        }
        gx.strokeStyle = 'rgba(0,255,102,0.04)'; gx.lineWidth = 0.4; gx.stroke();
      }

      gx.save();
      gx.beginPath(); gx.arc(cx, cy, R, 0, Math.PI * 2); gx.clip();

      const projected = globePts.map(pt => {
        const rp = rotY(pt, globeAngle);
        return { ...pt, rx: rp.x, ry: rp.y, rz: rp.z };
      });
      projected.sort((a, b) => a.rz - b.rz);

      projected.forEach(pt => {
        const sx = cx + pt.rx * R, sy = cy - pt.ry * R;
        const depth = (pt.rz + 1) / 2;

        if (pt.isShenzhen) {
          const pulse = 0.65 + 0.35 * Math.sin(globeTick * 3 + pt.phase);
          if (pt.rz >= 0) {
            const edgeFade = Math.pow(depth, 0.5);
            gx.beginPath(); gx.arc(sx, sy, pt.size * 1.6 * edgeFade, 0, Math.PI * 2);
            gx.fillStyle = `rgba(0,255,102,${0.95 * edgeFade * pulse})`; gx.fill();
            const h2 = gx.createRadialGradient(sx, sy, 0, sx, sy, pt.size * 7);
            h2.addColorStop(0, `rgba(0,255,102,${0.4 * pulse})`);
            h2.addColorStop(1, 'rgba(0,255,102,0)');
            gx.beginPath(); gx.arc(sx, sy, pt.size * 7, 0, Math.PI * 2);
            gx.fillStyle = h2; gx.fill();
          } else {
            const backDepth = Math.max(0, 1 + pt.rz);
            const ghostAlpha = backDepth * backDepth * 0.22 * pulse;
            gx.beginPath(); gx.arc(sx, sy, pt.size * 2.5, 0, Math.PI * 2);
            gx.fillStyle = `rgba(0,255,102,${ghostAlpha})`; gx.fill();
          }
        } else {
          if (pt.rz < 0) {
            const backDepth = Math.max(0, 1 + pt.rz);
            const alpha = pt.brightness * backDepth * backDepth * 0.08;
            gx.beginPath(); gx.arc(sx, sy, pt.size * 0.6, 0, Math.PI * 2);
            gx.fillStyle = `rgba(0,255,102,${alpha})`; gx.fill();
          } else {
            const edgeFade = Math.pow(depth, 0.5);
            const twinkle = 0.7 + 0.3 * Math.sin(globeTick * 1.2 + pt.phase);
            const alpha = pt.brightness * edgeFade * twinkle * 0.75;
            gx.beginPath(); gx.arc(sx, sy, pt.size * edgeFade, 0, Math.PI * 2);
            gx.fillStyle = `rgba(0,255,102,${alpha})`; gx.fill();
          }
        }
      });
      gx.restore();

      gx.beginPath(); gx.arc(cx, cy, R, 0, Math.PI * 2);
      gx.strokeStyle = 'rgba(0,255,102,0.15)'; gx.lineWidth = 1; gx.stroke();

      const szP = latLonToXYZ(22.54, 114.06);
      const szR2 = rotY(szP, globeAngle);
      if (szR2.z > 0) {
        const sx = cx + szR2.x * R, sy = cy - szR2.y * R;
        [1, 2, 3].forEach(k => {
          const prog = ((globeTick * 0.7 + k * 0.33) % 1);
          gx.beginPath(); gx.arc(sx, sy, prog * 24, 0, Math.PI * 2);
          gx.strokeStyle = `rgba(0,255,102,${(1 - prog) * 0.7})`;
          gx.lineWidth = 1.2; gx.stroke();
        });
        gx.beginPath(); gx.arc(sx, sy, 4, 0, Math.PI * 2);
        gx.fillStyle = '#00FF66';
        gx.shadowColor = '#00FF66'; gx.shadowBlur = 14; gx.fill(); gx.shadowBlur = 0;
      } else {
        const backDepth = Math.max(0, 1 + szR2.z);
        const sx = cx + szR2.x * R, sy = cy - szR2.y * R;
        const pulse = 0.5 + 0.5 * Math.sin(globeTick * 2.5);
        const ghostR = 10 + pulse * 6;
        const ghostA = backDepth * backDepth * 0.18 * pulse;
        const gh = gx.createRadialGradient(sx, sy, 0, sx, sy, ghostR);
        gh.addColorStop(0, `rgba(0,255,102,${ghostA})`);
        gh.addColorStop(1, 'rgba(0,255,102,0)');
        gx.beginPath(); gx.arc(sx, sy, ghostR, 0, Math.PI * 2);
        gx.fillStyle = gh; gx.fill();
      }

      animFrameRef.current = requestAnimationFrame(drawGlobe);
    }

    animFrameRef.current = requestAnimationFrame(drawGlobe);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    />
  );
};

const PulsingDot = () => {
  const dotStyle = {
    display: 'inline-block',
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#00FF66',
    boxShadow: '0 0 8px #00FF66',
    animation: 'locPulse 2s infinite',
  };
  return <span style={dotStyle} />;
};

const App = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes locPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(1.6); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000',
        color: '#ffffff',
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <main style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        <GlobeCanvas />

        <div style={{ position: 'absolute', top: '20px', left: '24px', zIndex: 10 }}>
          <span
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.5)',
              fontWeight: 500,
            }}
          >
            Location
          </span>
        </div>

        <div style={{ position: 'absolute', bottom: '24px', left: '24px', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <PulsingDot />
            <span
              style={{
                color: '#ffffff',
                fontSize: '18px',
                fontWeight: 600,
                letterSpacing: '-0.02em',
              }}
            >
              深圳, 中国
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '16px',
              borderTop: '1px solid rgba(255,255,255,0.15)',
              paddingTop: '10px',
            }}
          >
            <span
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: '10px',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              22.5431° N
            </span>
            <span
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: '10px',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              114.0579° E
            </span>
            <span
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: '10px',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              UTC+8
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;