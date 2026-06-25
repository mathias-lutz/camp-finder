import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

export interface MapCamp {
  id: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  mapLink?: string;
}

interface CampMapOverviewProps {
  camps: MapCamp[];
  focusCampId: string | null;
  userCoords: { lat: number; lng: number } | null;
  onClose: () => void;
  onShowDetails: (campId: string) => void;
}

const MOSS = '#3E4D40';
const MOSS_DARK = '#2D3A2F';
const LINK_STYLE = `color:${MOSS};font-size:12px;font-weight:600;text-decoration:underline;text-underline-offset:2px;`;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function googleMapsUrl(camp: MapCamp): string {
  if (camp.mapLink?.trim()) {
    const link = camp.mapLink.trim();
    return link.startsWith('http') ? link : `https://${link}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${camp.latitude},${camp.longitude}`;
}

function buildPopupHtml(camp: MapCamp): string {
  const stateLabel = camp.state && camp.state !== 'N/A' ? ` · ${escapeHtml(camp.state)}` : '';
  const mapsUrl = escapeHtml(googleMapsUrl(camp));
  return `
    <div class="camp-map-popup">
      <strong style="font-family:Georgia,serif;font-style:italic;color:${MOSS}">${escapeHtml(camp.name)}</strong>${stateLabel}
      <div style="margin-top:10px;display:flex;flex-direction:column;gap:6px;">
        <a href="#" data-action="show-details" data-camp-id="${escapeHtml(camp.id)}" style="${LINK_STYLE}">Details anzeigen</a>
        <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="${LINK_STYLE}">Google Maps</a>
      </div>
    </div>
  `;
}

function createCampIcon(active: boolean): L.DivIcon {
  const size = active ? 34 : 28;
  const color = active ? MOSS_DARK : MOSS;
  return L.divIcon({
    className: 'custom-camp-pin',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border:2.5px solid #FAF9F6;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 2px 8px rgba(60,58,52,0.25);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 4],
  });
}

function createUserIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:14px;height:14px;
      background:#2563eb;
      border:2.5px solid #FAF9F6;
      border-radius:50%;
      box-shadow:0 0 0 4px rgba(37,99,235,0.25);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export function CampMapOverview({ camps, focusCampId, userCoords, onClose, onShowDetails }: CampMapOverviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const onShowDetailsRef = useRef(onShowDetails);
  onShowDetailsRef.current = onShowDetails;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    const handlePopupClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-action="show-details"]');
      if (!target) return;
      e.preventDefault();
      const campId = target.getAttribute('data-camp-id');
      if (campId) onShowDetailsRef.current(campId);
    };

    map.getContainer().addEventListener('click', handlePopupClick);

    return () => {
      map.getContainer().removeEventListener('click', handlePopupClick);
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();

    const bounds = L.latLngBounds([]);

    for (const camp of camps) {
      const latLng = L.latLng(camp.latitude, camp.longitude);
      bounds.extend(latLng);

      const marker = L.marker(latLng, {
        icon: createCampIcon(focusCampId === camp.id),
        title: camp.name,
      });

      marker.bindPopup(buildPopupHtml(camp));

      marker.on('click', () => {
        markersRef.current.forEach((m, id) => {
          m.setIcon(createCampIcon(id === camp.id));
        });
        map.flyTo(latLng, Math.max(map.getZoom(), 11), { duration: 0.6 });
        marker.openPopup();
      });

      marker.addTo(map);
      markersRef.current.set(camp.id, marker);
    }

    if (userCoords) {
      const userLatLng = L.latLng(userCoords.lat, userCoords.lng);
      L.marker(userLatLng, { icon: createUserIcon(), interactive: false })
        .bindTooltip('Ihr Standort', { permanent: false, direction: 'top' })
        .addTo(map);
      bounds.extend(userLatLng);
    }

    const focused = focusCampId ? camps.find(c => c.id === focusCampId) : null;
    if (focused) {
      map.flyTo([focused.latitude, focused.longitude], 12, { duration: 0.5 });
      markersRef.current.get(focused.id)?.openPopup();
    } else if (camps.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 10 });
    } else if (userCoords) {
      map.setView([userCoords.lat, userCoords.lng], 6);
    } else {
      map.setView([46.8, 8.2], 6);
    }
  }, [camps, focusCampId, userCoords]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-editorial-bg">
      <div className="shrink-0 border-b border-editorial-border bg-editorial-bg px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-serif italic text-editorial-moss text-xl font-bold">Kartenübersicht</h2>
          <p className="text-xs text-editorial-muted mt-0.5">
            {camps.length} {camps.length === 1 ? 'Campingplatz' : 'Campingplätze'} auf der Karte
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2.5 text-editorial-muted hover:text-editorial-moss hover:bg-editorial-card border border-editorial-border rounded-full transition-colors"
          aria-label="Karte schließen"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 relative min-h-0">
        {camps.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <p className="font-serif italic text-editorial-text text-lg font-bold">Keine Koordinaten vorhanden</p>
            <p className="text-xs text-editorial-muted mt-2 max-w-sm">
              Campingplätze benötigen Koordinaten oder einen Google-Maps-Link in der Tabelle, um auf der Karte angezeigt zu werden.
            </p>
          </div>
        ) : (
          <div ref={containerRef} className="absolute inset-0 z-0" />
        )}
      </div>
    </div>
  );
}
