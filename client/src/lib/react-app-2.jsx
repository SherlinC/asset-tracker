import React, { useEffect, useRef, useState } from 'react';

const GOLD_CORE = '251,191,36';
const GOLD_ACCENT = '245,158,11';
const GOLD_DEEP = '180,83,9';

const TARGET_CITIES = [
  { id: 'shenzhen', label: '深圳, 中国', lat: 22.5431, lon: 114.0579, timezone: 'UTC+8' },
  { id: 'beijing', label: '北京, 中国', lat: 39.9042, lon: 116.4074, timezone: 'UTC+8' },
  { id: 'shanghai', label: '上海, 中国', lat: 31.2304, lon: 121.4737, timezone: 'UTC+8' },
  { id: 'chengdu', label: '成都, 中国', lat: 30.5728, lon: 104.0668, timezone: 'UTC+8' },
  { id: 'tokyo', label: '东京, 日本', lat: 35.6762, lon: 139.6503, timezone: 'UTC+9' },
  { id: 'sydney', label: '悉尼, 澳大利亚', lat: -33.8688, lon: 151.2093, timezone: 'UTC+10 / UTC+11' },
  { id: 'london', label: '伦敦, 英国', lat: 51.5074, lon: -0.1278, timezone: 'UTC+0 / UTC+1' },
  { id: 'new-york', label: '纽约, 美国', lat: 40.7128, lon: -74.0060, timezone: 'UTC-5 / UTC-4' },
  { id: 'san-francisco', label: '旧金山, 美国', lat: 37.7749, lon: -122.4194, timezone: 'UTC-8 / UTC-7' },
  { id: 'buenos-aires', label: '布宜诺斯艾利斯, 阿根廷', lat: -34.6037, lon: -58.3816, timezone: 'UTC-3' },
  { id: 'sao-paulo', label: '圣保罗, 巴西', lat: -23.5505, lon: -46.6333, timezone: 'UTC-3' },
];

function formatLatitude(lat) {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
}

function formatLongitude(lon) {
  return `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
}

function normalizeAngle(angle) {
  const fullTurn = Math.PI * 2;
  let normalized = angle % fullTurn;

  if (normalized <= -Math.PI) normalized += fullTurn;
  if (normalized > Math.PI) normalized -= fullTurn;

  return normalized;
}

function shortestAngleDelta(from, to) {
  return normalizeAngle(to - from);
}

function getCityView(city) {
  return {
    yaw: city.lon * Math.PI / 180 - Math.PI / 2,
    pitch: city.lat * Math.PI / 180,
  };
}

const GlobeCanvas = ({ selectedCity }) => {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
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
        globePts.push({
          x: p3.x, y: p3.y, z: p3.z,
          size: 0.9 + Math.random() * 0.5,
          brightness: 0.4 + Math.random() * 0.4,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    const RING_LATS = [-60, -30, 0, 30, 60];
    const LON_STEPS = 120;
    const highlightedCities = TARGET_CITIES.map(city => ({
      ...city,
      point: latLonToXYZ(city.lat, city.lon),
    }));
    let globeTick = 0;

    function rotY(p, a) {
      return {
        x: p.x * Math.cos(a) + p.z * Math.sin(a),
        y: p.y,
        z: -p.x * Math.sin(a) + p.z * Math.cos(a)
      };
    }

    function rotX(p, a) {
      return {
        x: p.x,
        y: p.y * Math.cos(a) - p.z * Math.sin(a),
        z: p.y * Math.sin(a) + p.z * Math.cos(a)
      };
    }

    function applyRotation(point) {
      return rotX(
        rotY(point, rotationRef.current.yaw),
        rotationRef.current.pitch
      );
    }

    function drawGlobe() {
      const W = gc.offsetWidth, H = gc.offsetHeight;
      gx.clearRect(0, 0, W, H);
      globeTick += 0.012;

      const yawDelta = shortestAngleDelta(
        rotationRef.current.yaw,
        rotationRef.current.targetYaw
      );
      const pitchDelta =
        rotationRef.current.targetPitch - rotationRef.current.pitch;

      rotationRef.current.yaw = normalizeAngle(
        rotationRef.current.yaw + yawDelta * 0.035
      );
      rotationRef.current.pitch += pitchDelta * 0.035;

      if (Math.abs(yawDelta) < 0.0004) {
        rotationRef.current.yaw = normalizeAngle(rotationRef.current.targetYaw);
      }

      if (Math.abs(pitchDelta) < 0.0004) {
        rotationRef.current.pitch = rotationRef.current.targetPitch;
      }

      const cx = W * 0.5, cy = H * 0.5;
      const R = Math.min(W, H) * 0.45;

      const atm = gx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.3);
      atm.addColorStop(0, `rgba(${GOLD_ACCENT},0.1)`);
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
          const rp = applyRotation(p3);
          if (rp.z < 0) { first = true; continue; }
          const sx = cx - rp.x * R, sy = cy - rp.y * R;
          first ? gx.moveTo(sx, sy) : gx.lineTo(sx, sy); first = false;
        }
        gx.strokeStyle = `rgba(${GOLD_ACCENT},0.08)`; gx.lineWidth = 0.4; gx.stroke();
      });

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
        gx.strokeStyle = `rgba(${GOLD_ACCENT},0.06)`; gx.lineWidth = 0.4; gx.stroke();
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
        if (pt.rz < 0) {
          const backDepth = Math.max(0, 1 + pt.rz);
          const alpha = pt.brightness * backDepth * backDepth * 0.08;
          gx.beginPath(); gx.arc(sx, sy, pt.size * 0.6, 0, Math.PI * 2);
          gx.fillStyle = `rgba(${GOLD_DEEP},${alpha})`; gx.fill();
        } else {
          const edgeFade = Math.pow(depth, 0.5);
          const twinkle = 0.7 + 0.3 * Math.sin(globeTick * 1.2 + pt.phase);
          const alpha = pt.brightness * edgeFade * twinkle * 0.75;
          gx.beginPath(); gx.arc(sx, sy, pt.size * edgeFade, 0, Math.PI * 2);
          const dotGradient = gx.createRadialGradient(sx, sy, 0, sx, sy, pt.size * edgeFade * 2.4);
          dotGradient.addColorStop(0, `rgba(${GOLD_CORE},${alpha})`);
          dotGradient.addColorStop(0.55, `rgba(${GOLD_ACCENT},${alpha * 0.75})`);
          dotGradient.addColorStop(1, `rgba(${GOLD_DEEP},0)`);
          gx.fillStyle = dotGradient; gx.fill();
        }
      });
      gx.restore();

      gx.beginPath(); gx.arc(cx, cy, R, 0, Math.PI * 2);
      gx.strokeStyle = `rgba(${GOLD_ACCENT},0.18)`; gx.lineWidth = 1; gx.stroke();

      highlightedCities.forEach(city => {
        const rotated = applyRotation(city.point);
        const sx = cx - rotated.x * R;
        const sy = cy - rotated.y * R;
        const isSelected = city.id === selectedCityRef.current.id;

        if (rotated.z > 0) {
          const alpha = isSelected ? 0.95 : 0.45;
          const radius = isSelected ? 5.4 : 2.5;
          const haloRadius = isSelected ? 22 : 8;

          gx.beginPath(); gx.arc(sx, sy, radius, 0, Math.PI * 2);
          gx.fillStyle = isSelected ? '#fbbf24' : `rgba(${GOLD_ACCENT},0.6)`;
          gx.shadowColor = '#f59e0b';
          gx.shadowBlur = isSelected ? 20 : 0;
          gx.fill();
          gx.shadowBlur = 0;

          if (isSelected) {
            const cityGlow = gx.createRadialGradient(sx, sy, 0, sx, sy, haloRadius);
            cityGlow.addColorStop(0, `rgba(${GOLD_CORE},${alpha * 0.38})`);
            cityGlow.addColorStop(0.6, `rgba(${GOLD_ACCENT},${alpha * 0.12})`);
            cityGlow.addColorStop(1, `rgba(${GOLD_DEEP},0)`);
            gx.beginPath(); gx.arc(sx, sy, haloRadius, 0, Math.PI * 2);
            gx.fillStyle = cityGlow;
            gx.fill();

            [1, 2, 3].forEach(k => {
              const prog = ((globeTick * 0.7 + k * 0.33) % 1);
              gx.beginPath(); gx.arc(sx, sy, prog * 24, 0, Math.PI * 2);
              gx.strokeStyle = `rgba(${GOLD_CORE},${(1 - prog) * 0.7})`;
              gx.lineWidth = 1.2; gx.stroke();
            });
          } else {
            gx.beginPath();
            gx.arc(sx, sy, haloRadius + 2, 0, Math.PI * 2);
            gx.strokeStyle = `rgba(${GOLD_ACCENT},0.15)`;
            gx.lineWidth = 0.6;
            gx.stroke();
          }
        } else if (isSelected) {
          const backDepth = Math.max(0, 1 + rotated.z);
          const pulse = 0.5 + 0.5 * Math.sin(globeTick * 2.5);
          const ghostR = 10 + pulse * 6;
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
    background: 'radial-gradient(circle at 30% 30%, #fde68a, #fbbf24 45%, #f59e0b 100%)',
    boxShadow: '0 0 8px rgba(245,158,11,0.95)',
    animation: 'locPulse 2s infinite',
  };
  return <span style={dotStyle} />;
};

const CitySearchDropdown = ({ cities, selectedCity, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCities = cities.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.id.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '260px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.72)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        城市点位搜索
      </div>
      <div
        onClick={() => setIsOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', padding: '12px 14px',
          background: isOpen ? 'rgba(245,158,11,0.12)' : 'rgba(10,8,4,0.58)',
          border: isOpen ? '1px solid rgba(251,191,36,0.5)' : '1px solid rgba(245,158,11,0.2)',
          borderRadius: '14px', backdropFilter: 'blur(14px)', cursor: 'text',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 0 15px rgba(245,158,11,0.1)' : 'none'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isOpen ? '#fbbf24' : 'rgba(255,255,255,0.5)'} strokeWidth="2" style={{ marginRight: '10px' }}>
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          placeholder="搜索城市 (如: 深圳)"
          value={isOpen ? query : selectedCity.label}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => { setIsOpen(true); setQuery(''); }}
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            color: isOpen && query ? '#fff' : (isOpen ? 'rgba(255,255,255,0.5)' : '#fbbf24'),
            width: '100%', fontSize: '14px', fontWeight: 500
          }}
        />
        {isOpen && query && (
          <svg 
            onClick={(e) => { e.stopPropagation(); setQuery(''); }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" 
            style={{ cursor: 'pointer', marginLeft: '8px' }}
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        )}
      </div>

      {isOpen && (
        <div className="city-info-enter" style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: '100%',
          background: 'rgba(10,8,4,0.85)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: '14px', backdropFilter: 'blur(14px)', maxHeight: '340px',
          overflowY: 'auto', zIndex: 20, padding: '8px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'grid', gap: '4px' }}>
            {filteredCities.length > 0 ? filteredCities.map(city => {
              const isActive = city.id === selectedCity.id;
              return (
                <div
                  key={city.id}
                  onClick={() => { onSelect(city.id); setIsOpen(false); setQuery(''); }}
                  style={{
                    padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                    background: isActive ? 'rgba(245,158,11,0.15)' : 'transparent',
                    display: 'flex', flexDirection: 'column', gap: '4px',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={(e) => !isActive && (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
                      background: isActive ? '#fbbf24' : 'rgba(255,255,255,0.2)',
                      boxShadow: isActive ? '0 0 8px rgba(245,158,11,0.8)' : 'none',
                    }} />
                    <span style={{ fontSize: '14px', fontWeight: isActive ? 600 : 400, color: isActive ? '#fbbf24' : '#fff' }}>
                      {city.label}
                    </span>
                  </div>
                  <div style={{ paddingLeft: '14px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Fira Code', monospace" }}>
                     {formatLatitude(city.lat)} · {formatLongitude(city.lon)}
                  </div>
                </div>
              )
            }) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                未找到匹配的城市
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => {
  const [selectedCityId, setSelectedCityId] = useState('shenzhen');
  const selectedCity =
    TARGET_CITIES.find(city => city.id === selectedCityId) ?? TARGET_CITIES[0];

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes locPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(1.6); }
      }
      .city-info-enter {
        animation: slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes slideUpFade {
        0% { opacity: 0; transform: translateY(12px); }
        100% { opacity: 1; transform: translateY(0); }
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
        <GlobeCanvas selectedCity={selectedCity} />

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
            Location Calibration
          </span>
        </div>

        <div style={{ position: 'absolute', top: '56px', left: '24px', zIndex: 10 }}>
          <CitySearchDropdown cities={TARGET_CITIES} selectedCity={selectedCity} onSelect={setSelectedCityId} />
        </div>

        <div 
          key={selectedCity.id}
          className="city-info-enter"
          style={{ position: 'absolute', bottom: '24px', left: '24px', zIndex: 10 }}
        >
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
              {selectedCity.label}
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
              {formatLatitude(selectedCity.lat)}
            </span>
            <span
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: '10px',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              {formatLongitude(selectedCity.lon)}
            </span>
            <span
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: '10px',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              {selectedCity.timezone}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
