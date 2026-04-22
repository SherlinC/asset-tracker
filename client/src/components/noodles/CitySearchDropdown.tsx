import React, { useState, useRef, useEffect } from 'react';
import type { NoodleLocation } from "@/lib/noodle";
import { formatLatitude, formatLongitude } from "./InteractiveGlobe";
import { useLanguage } from "@/hooks/useLanguage";
import { pickLocalizedText } from "@/lib/navigation";

export const CitySearchDropdown = ({ cities, selectedCity, onSelect }: { cities: readonly NoodleLocation[], selectedCity: NoodleLocation, onSelect: (id: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  const isZh = language === "zh";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCities = cities.filter(c => {
    const nameStr = pickLocalizedText(c.name, isZh).toLowerCase();
    return nameStr.includes(query.toLowerCase()) || c.id.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '260px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.72)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {isZh ? "城市点位搜索" : "City Search"}
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
          placeholder={isZh ? "搜索城市 (如: 深圳)" : "Search city (e.g. Shenzhen)"}
          value={isOpen ? query : `${pickLocalizedText(selectedCity.name, isZh)} · ¥${selectedCity.priceCNY}`}
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
            style={{ cursor: 'pointer', marginLeft: '8px', flexShrink: 0 }}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
                        background: isActive ? '#fbbf24' : 'rgba(255,255,255,0.2)',
                        boxShadow: isActive ? '0 0 8px rgba(245,158,11,0.8)' : 'none',
                      }} />
                      <span style={{ fontSize: '14px', fontWeight: isActive ? 600 : 400, color: isActive ? '#fbbf24' : '#fff' }}>
                        {pickLocalizedText(city.name, isZh)}
                      </span>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] text-amber-100">
                      ¥{city.priceCNY}
                    </span>
                  </div>
                  <div style={{ paddingLeft: '14px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Fira Code', monospace" }}>
                     {formatLatitude(city.lat)} · {formatLongitude(city.lon)}
                  </div>
                </div>
              )
            }) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                {isZh ? "未找到匹配的城市" : "No matching city found"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
