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
    <div ref={wrapperRef} className="relative w-[260px] font-sans">
      <div className="mb-2.5 text-[11px] uppercase tracking-[0.08em] text-stone-600 dark:text-white/70">
        {isZh ? "城市点位搜索" : "City Search"}
      </div>
      <div
        onClick={() => setIsOpen(true)}
        className={`flex items-center px-3.5 py-3 rounded-[14px] backdrop-blur-md cursor-text transition-all duration-200 border ${
          isOpen
            ? 'bg-zinc-100/50 dark:bg-amber-500/10 border-zinc-300 dark:border-amber-400/50 shadow-[0_0_15px_rgba(0,0,0,0.05)] dark:shadow-[0_0_15px_rgba(245,158,11,0.1)]'
            : 'bg-white/80 dark:bg-black/60 border-zinc-200 dark:border-amber-500/20 shadow-none'
        }`}
      >
        <svg 
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" 
          className={`mr-2.5 ${isOpen ? 'text-[#cba358] dark:text-amber-400' : 'text-stone-400 dark:text-white/50'}`}
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          placeholder={isZh ? "搜索城市 (如: 深圳)" : "Search city (e.g. Shenzhen)"}
          value={isOpen ? query : `${pickLocalizedText(selectedCity.name, isZh)} · ¥${selectedCity.priceCNY}`}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => { setIsOpen(true); setQuery(''); }}
          className={`bg-transparent border-none outline-none w-full text-sm font-medium ${
            isOpen && query ? 'text-stone-900 dark:text-white' : (isOpen ? 'text-stone-400 dark:text-white/50 placeholder:text-stone-400 dark:placeholder:text-white/50' : 'text-[#cba358] dark:text-amber-400')
          }`}
        />
        {isOpen && query && (
          <svg 
            onClick={(e) => { e.stopPropagation(); setQuery(''); }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" 
            className="cursor-pointer ml-2 shrink-0 text-stone-400 dark:text-white/50 hover:text-stone-600 dark:hover:text-white/80"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white/95 dark:bg-black/85 border border-zinc-200 dark:border-amber-500/20 rounded-[14px] backdrop-blur-md max-h-[340px] overflow-y-auto z-20 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <div className="grid gap-1">
            {filteredCities.length > 0 ? filteredCities.map(city => {
              const isActive = city.id === selectedCity.id;
              return (
                <div
                  key={city.id}
                  onClick={() => { onSelect(city.id); setIsOpen(false); setQuery(''); }}
                  className={`flex flex-col gap-1 p-2.5 rounded-[10px] cursor-pointer transition-colors ${
                    isActive ? 'bg-zinc-100 dark:bg-amber-500/15' : 'hover:bg-stone-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#cba358] shadow-[0_0_8px_rgba(203,163,88,0.6)] dark:bg-amber-400 dark:shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'bg-stone-300 dark:bg-white/20'}`} />
                      <span className={`text-sm font-medium ${isActive ? 'text-[#cba358] dark:text-amber-400' : 'text-stone-700 dark:text-white/80'}`}>
                        {pickLocalizedText(city.name, isZh)}
                      </span>
                    </div>
                    <span className={`text-xs font-semibold ${isActive ? 'text-[#cba358] dark:text-amber-400' : 'text-stone-500 dark:text-white/60'}`}>
                      ¥{city.priceCNY}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 pl-3.5 mt-1">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-stone-400 dark:text-white/40 uppercase tracking-wider">Lat / Lon</span>
                      <span className="text-[10px] text-stone-500 dark:text-white/60 font-mono">
                        {formatLatitude(city.lat)} {formatLongitude(city.lon)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-stone-400 dark:text-white/40 uppercase tracking-wider">Timezone</span>
                      <span className="text-[10px] text-stone-500 dark:text-white/60 font-mono">
                        {city.timezone}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="py-8 text-center text-sm text-stone-400 dark:text-white/50">
                {isZh ? "未找到匹配的城市" : "No cities found"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
