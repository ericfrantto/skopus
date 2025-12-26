import React, { useState, useEffect, useRef } from 'react';
import { ICONS } from '../constants';
import { Lead } from '../types';
import { geminiService } from '../services/geminiService';
import L from 'leaflet';

const SDRModule: React.FC = () => {
  const [niche, setNiche] = useState('');
  const [location, setLocation] = useState('');
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [radius, setRadius] = useState(10);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (mapRef.current && !leafletMap.current) {
      const defaultPos: [number, number] = [-23.5505, -46.6333]; // São Paulo
      
      leafletMap.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(defaultPos, 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(leafletMap.current);

      L.control.zoom({ position: 'bottomleft' }).addTo(leafletMap.current);

      circleRef.current = L.circle(defaultPos, {
        color: "#FE7317",
        fillColor: "#FE7317",
        fillOpacity: 0.1,
        radius: radius * 1000
      }).addTo(leafletMap.current);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const pos: [number, number] = [position.coords.latitude, position.coords.longitude];
            setUserCoords({ lat: pos[0], lng: pos[1] });
            setUseMyLocation(true);
            leafletMap.current?.setView(pos, 14);
            circleRef.current?.setLatLng(pos);
          },
          (error) => console.warn("GPS Indisponível:", error)
        );
      }
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius * 1000);
    }
  }, [radius]);

  const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch (e) {
      console.error("Erro na geocodificação:", e);
    }
    return null;
  };

  const updateMapMarkers = async (newLeads: Lead[]) => {
    if (!leafletMap.current) return;

    const orangeIcon = L.divIcon({
      html: `<div style="background-color: #FE7317; width: 12px; height: 12px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(254, 115, 23, 0.5);"></div>`,
      className: 'custom-marker-icon',
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });

    for (const lead of newLeads) {
      const coords = await geocodeAddress(lead.address);
      if (coords && leafletMap.current) {
        const marker = L.marker(coords, { icon: orangeIcon }).addTo(leafletMap.current);
        
        const infoContent = `
          <div style="padding: 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; min-width: 200px; color: #131313;">
            <h4 style="margin: 0; font-weight: 700; font-size: 14px;">${lead.name}</h4>
            <p style="margin: 4px 0; color: #FE7317; font-weight: 700; font-size: 12px;">★ ${lead.rating || 'N/A'}</p>
            <div style="margin-bottom: 8px;">
              <a href="${lead.instagram}" target="_blank" style="color: #E1306C; font-size: 10px; font-weight: 700; text-decoration: none;">Instagram: ${lead.instagramHandle || '@perfil'}</a><br/>
              <a href="${lead.whatsapp}" target="_blank" style="color: #25D366; font-size: 10px; font-weight: 700; text-decoration: none;">WhatsApp: ${lead.whatsappNumber || 'Link'}</a>
            </div>
            <p style="margin: 0; font-size: 9px; color: #666;">${lead.address}</p>
          </div>
        `;
        
        marker.bindPopup(infoContent);
        markersRef.current.push(marker);
      }
    }

    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      leafletMap.current.fitBounds(group.getBounds().pad(0.1));
    }
  };

  const handleSearch = async () => {
    if (!niche || (!useMyLocation && !location)) return;
    setLoading(true);
    setLeads([]);
    setPage(1);
    
    // Limpar marcadores anteriores
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    try {
      const target = useMyLocation && userCoords ? `Coord: ${userCoords.lat}, ${userCoords.lng}` : location;
      const results = await geminiService.searchLeads(niche, target, 1);
      setLeads(results);
      updateMapMarkers(results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreLeads = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const target = useMyLocation && userCoords ? `Coord: ${userCoords.lat}, ${userCoords.lng}` : location;
      const results = await geminiService.searchLeads(niche, target, nextPage);
      const combined = [...leads, ...results];
      setLeads(combined);
      setPage(nextPage);
      updateMapMarkers(results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  const clearResults = () => {
    setNiche('');
    setLocation('');
    setLeads([]);
    setPage(1);
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
  };

  const downloadCSV = () => {
    if (leads.length === 0) return;
    const headers = ["Empresa", "Avaliação", "Instagram", "WhatsApp", "Endereço"];
    const rows = leads.map(l => [
      `"${l.name}"`, 
      l.rating, 
      `"${l.instagramHandle || ''}"`, 
      `"${l.whatsappNumber || ''}"`, 
      `"${l.address}"`
    ].join(","));
    const content = [headers.join(","), ...rows].join("\n");
    
    const blob = new Blob(["\uFEFF" + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads_${niche || 'skopu'}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight dark:text-white uppercase leading-none mb-2">Busca de leads</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Localização e prospecção ativa de clientes.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {leads.length > 0 && (
            <button onClick={clearResults} className="px-5 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all">
              Limpar Busca
            </button>
          )}
          <div className="bg-white/90 dark:bg-black/80 apple-blur px-5 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center gap-6 shadow-xl">
             <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Resultado</span>
                <span className="text-[#FE7317] font-bold text-2xl leading-none">{leads.length}</span>
             </div>
             {leads.length > 0 && (
               <button 
                 onClick={downloadCSV}
                 className="flex items-center gap-2 bg-[#FE7317] text-white px-4 py-2 rounded-xl text-xs font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-[#FE7317]/20 uppercase tracking-wide"
               >
                 <ICONS.Download className="w-4 h-4" />
                 Exportar resultados
               </button>
             )}
          </div>
        </div>
      </header>

      {/* Barra de Busca */}
      <div className="bg-white dark:bg-[#121218] p-2 rounded-[1.5rem] border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col md:flex-row items-stretch gap-2 transition-all">
        
        <div className="flex-[1.4] flex items-center px-6 py-3.5 gap-4 border border-gray-100 dark:border-gray-800 bg-gray-100/60 dark:bg-white/5 rounded-xl transition-colors focus-within:bg-gray-200/40">
          <ICONS.Search className="w-5 h-5 text-gray-400" />
          <div className="flex-1">
             <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Nicho / Mercado</label>
             <input 
               type="text" placeholder="Ex: Barbearias, Clínicas..."
               className="bg-transparent w-full outline-none text-lg font-bold dark:text-white placeholder-gray-300"
               value={niche} onChange={e => setNiche(e.target.value)}
             />
          </div>
        </div>
        
        <div className={`flex-1 flex items-center px-6 py-3.5 gap-4 transition-all border border-gray-100 dark:border-gray-800 bg-gray-100/60 dark:bg-white/5 rounded-xl focus-within:bg-gray-200/40 ${useMyLocation ? 'bg-orange-50/80 dark:bg-orange-500/10' : ''}`}>
          <button 
            onClick={() => {
              const newState = !useMyLocation;
              setUseMyLocation(newState);
              if (newState) {
                setLocation('');
                if (userCoords) {
                  leafletMap.current?.setView([userCoords.lat, userCoords.lng], 14);
                  circleRef.current?.setLatLng([userCoords.lat, userCoords.lng]);
                }
              }
            }}
            className={`p-3 rounded-xl transition-all shadow-sm ${useMyLocation ? 'bg-[#FE7317] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-[#FE7317]'}`}
          >
             <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </button>
          <div className="flex-1">
             <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Localização</label>
             <input 
               type="text" 
               placeholder={useMyLocation ? "Via GPS" : "Cidade ou Bairro..."}
               disabled={useMyLocation}
               className={`bg-transparent w-full outline-none text-lg font-bold dark:text-white placeholder-gray-300 ${useMyLocation ? 'opacity-30' : ''}`}
               value={location} 
               onChange={e => setLocation(e.target.value)}
             />
          </div>
        </div>

        <button 
          onClick={handleSearch}
          disabled={loading || !niche || (!useMyLocation && !location)}
          className={`bg-[#FE7317] text-white px-10 py-5 rounded-xl hover:opacity-95 disabled:opacity-30 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-[#FE7317]/20 font-bold`}
        >
          {loading ? (
            <div className="flex items-center gap-3">
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
               <span className="uppercase tracking-[0.2em] text-sm font-bold">PESQUISANDO...</span>
            </div>
          ) : (
            <span className="uppercase tracking-[0.2em] text-sm">Procurar leads</span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[480px]">
        {/* Mapa */}
        <div className="lg:col-span-8 relative rounded-[1.5rem] overflow-hidden border border-gray-200 dark:border-gray-800 shadow-2xl bg-gray-100">
          <div id="map" ref={mapRef} className="h-full w-full" />
          
          <div className="absolute bottom-6 right-6 z-[1000]">
             <div className="bg-white/95 dark:bg-black/95 apple-blur p-4 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center gap-2">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">Alcance: {radius}km</p>
                <input 
                  type="range" min="1" max="50"
                  className="w-32 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#FE7317]"
                  value={radius} onChange={e => setRadius(parseInt(e.target.value))}
                />
             </div>
          </div>
        </div>

        {/* Database SDR */}
        <div className="lg:col-span-4 bg-[#F7F7F7] dark:bg-[#121218] rounded-[1.5rem] border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden shadow-inner">
           <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white/50 dark:bg-black/50">
              <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-gray-400">Database SDR</h3>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {leads.length > 0 ? (
                <>
                  {leads.map((lead, idx) => (
                    <div 
                      key={`${lead.id}-${idx}`}
                      className="bg-white dark:bg-black p-5 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-[#FE7317] hover:shadow-lg transition-all cursor-pointer group active:scale-[0.98]"
                      onClick={async () => {
                        const coords = await geocodeAddress(lead.address);
                        if (coords && leafletMap.current) {
                          leafletMap.current.setView(coords, 16);
                        }
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-bold text-base leading-tight group-hover:text-[#FE7317] transition-colors dark:text-white">{lead.name}</div>
                        <div className="bg-[#FE7317]/10 px-2 py-0.5 rounded-lg">
                           <span className="text-[10px] font-bold text-[#FE7317]">★ {lead.rating || '---'}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="opacity-70 italic font-medium text-gray-400 uppercase text-[9px] tracking-tighter">Instagram:</span>
                          <a 
                            href={lead.instagram} target="_blank" 
                            className="font-bold text-[#E1306C] hover:underline transition-all"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {lead.instagramHandle || '@perfil'}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="opacity-70 italic font-medium text-gray-400 uppercase text-[9px] tracking-tighter">WhatsApp:</span>
                          <a 
                            href={lead.whatsapp} target="_blank" 
                            className="font-bold text-[#25D366] hover:underline transition-all"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {lead.whatsappNumber || 'Conectar'}
                          </a>
                        </div>
                      </div>

                      <div className="text-[10px] font-bold text-gray-400 dark:text-gray-600 truncate italic leading-none">{lead.address}</div>
                    </div>
                  ))}
                  
                  {leads.length < 100 && (
                    <button 
                      onClick={loadMoreLeads}
                      disabled={loadingMore}
                      className="w-full py-8 mt-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-gray-400 font-bold text-xs hover:border-[#FE7317] hover:text-[#FE7317] hover:bg-[#FE7317]/5 transition-all flex flex-col items-center gap-1 uppercase tracking-[0.2em]"
                    >
                      {loadingMore ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span className="text-2xl">⊕</span>
                          <span>Paginar Mais</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-4 opacity-30">
                  <ICONS.Search className="w-10 h-10 text-gray-300" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed">Aguardando resultados</p>
                </div>
              )}
           </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E2E2; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; }
        .apple-blur { backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
        .leaflet-popup-content-wrapper { border-radius: 1rem; border: none; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        .leaflet-popup-tip-container { display: none; }
      `}</style>
    </div>
  );
};

export default SDRModule;