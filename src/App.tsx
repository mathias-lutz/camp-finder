import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  RotateCw, 
  MapPin, 
  Info, 
  HelpCircle, 
  Check, 
  X, 
  Compass, 
  Heart, 
  CloudOff, 
  FileSpreadsheet, 
  Layers, 
  Navigation, 
  DollarSign,
  Wifi,
  Zap,
  Droplet,
  Croissant,
  ChevronRight,
  ChevronLeft,
  Store,
  Utensils,
  Coffee,
  Waves,
  WavesLadder,
  Car,
  Clock
} from 'lucide-react';

// Define the normalized campsite type
export interface NormalizedCampsite {
  id: string;
  name: string;
  state: string;
  price: string;
  numericPrice: number;
  rating: string;
  numericRating: number;
  signal: string;
  numericSignal: number;
  hookups: string;
  hasHookups: boolean;
  water: string;
  hasWater: boolean;
  toilet: string;
  hasToilet: boolean;
  shade: string;
  numericShade: number;
  pets: string;
  petsAllowed: boolean;
  comments: string;
  latitude: number | null;
  longitude: number | null;
  image: string;
  raw: Record<string, string>;
  mapLink?: string;
  slug?: string;
}

const CONTENT_MAX_W = 'max-w-[45rem]'; // ~20% narrower than max-w-4xl (896px → 720px)

const CAMP_IMAGE_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#3A3A3A"/></svg>'
)}`;

interface AmenityConfig {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

const AMENITY_MAP: Record<string, AmenityConfig> = {
  Laden: {
    label: 'Laden',
    color: 'bg-emerald-50 text-emerald-850 border-emerald-200 shadow-2xs',
    icon: Store
  },
  Restaurant: {
    label: 'Restaurant',
    color: 'bg-indigo-50 text-indigo-850 border-indigo-200 shadow-2xs',
    icon: Utensils
  },
  Imbiss: {
    label: 'Imbiss',
    color: 'bg-orange-50 text-orange-900 border-orange-200 shadow-2xs',
    icon: Coffee
  },
  Brot: {
    label: 'Brot',
    color: 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs',
    icon: Croissant
  },
  Meer: {
    label: 'Am Meer',
    color: 'bg-blue-50 text-blue-850 border-blue-200 shadow-2xs',
    icon: Waves
  },
  See: {
    label: 'Am See',
    color: 'bg-sky-50 text-sky-850 border-sky-200 shadow-2xs',
    icon: Waves
  },
  Fluss: {
    label: 'Am Fluss',
    color: 'bg-sky-50 text-sky-850 border-sky-200 shadow-2xs',
    icon: Waves
  },
  Pool: {
    label: 'Pool',
    color: 'bg-cyan-50 text-cyan-850 border-cyan-200 shadow-2xs',
    icon: WavesLadder
  }
};

function getAmenitiesOfCampsite(camp: NormalizedCampsite): string[] {
  const possible = ['Laden', 'Restaurant', 'Imbiss', 'Brot', 'Meer', 'See', 'Fluss', 'Pool'];
  const active: string[] = [];
  possible.forEach(tag => {
    const key = Object.keys(camp.raw || {}).find(
      k => k.trim().toLowerCase() === tag.toLowerCase()
    );
    if (key) {
      const val = (camp.raw[key] || '').trim().toLowerCase();
      if (val === 'x' || val === 'yes' || val === 'ja' || val === 'true') {
        active.push(tag);
      }
    }
  });
  return active;
}

function getCampImageUrl(camp: NormalizedCampsite, scrapedImages: Record<string, string> = {}): string | null {
  const imageUrl = (camp.image && scrapedImages[camp.image]) ? scrapedImages[camp.image] : camp.image;
  if (!imageUrl || isWebpageUrl(imageUrl)) return null;
  const trimmed = imageUrl.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('www.')) return `https://${trimmed}`;
  return null;
}

interface CampThumbnailProps {
  camp: NormalizedCampsite;
  scrapedImages: Record<string, string>;
}

function CampThumbnail({ camp, scrapedImages }: CampThumbnailProps) {
  const imageUrl = useMemo(() => getCampImageUrl(camp, scrapedImages), [camp, scrapedImages]);
  const [displaySrc, setDisplaySrc] = useState(CAMP_IMAGE_PLACEHOLDER);

  useEffect(() => {
    if (!imageUrl) {
      setDisplaySrc(CAMP_IMAGE_PLACEHOLDER);
      return;
    }
    setDisplaySrc(CAMP_IMAGE_PLACEHOLDER);
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = () => setDisplaySrc(imageUrl);
    img.onerror = () => setDisplaySrc(CAMP_IMAGE_PLACEHOLDER);
    img.src = imageUrl;
  }, [imageUrl]);

  return (
    <img
      src={displaySrc}
      alt={camp.name}
      className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
      referrerPolicy="no-referrer"
      loading="lazy"
    />
  );
}

// GitHub Pages is static-only — sheet data is fetched directly from Google's CSV export URL.
function buildSheetExportUrl(sheetUrl: string): string {
  const sheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!sheetIdMatch) {
    throw new Error('Could not extract Google Spreadsheet ID from the URL. Please verify the URL format.');
  }
  const sheetId = sheetIdMatch[1];
  const gidMatch = sheetUrl.match(/[#&]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : '0';
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

async function fetchSheetCsv(sheetUrl: string): Promise<string> {
  const exportUrl = buildSheetExportUrl(sheetUrl);
  const response = await fetch(exportUrl);
  if (!response.ok) {
    throw new Error(
      `Google Sheets export returned status ${response.status}. Ensure the sheet is shared as "Anyone with the link can view".`
    );
  }
  return response.text();
}

// Quoted CSV parser
function parseCSV(text: string): Record<string, string>[] {
  const lines: string[] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentWord = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentWord += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentWord.trim());
      currentWord = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentWord.trim());
      lines.push(JSON.stringify(row));
      row = [];
      currentWord = '';
    } else {
      currentWord += char;
    }
  }
  if (currentWord || row.length > 0) {
    row.push(currentWord.trim());
    lines.push(JSON.stringify(row));
  }

  if (lines.length < 2) return [];

  const headers = JSON.parse(lines[0]) as string[];
  const result: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = JSON.parse(lines[i]) as string[];
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
    const rowObj: Record<string, string> = {};
    headers.forEach((header, index) => {
      rowObj[header] = values[index] || '';
    });
    result.push(rowObj);
  }
  return result;
}

function extractCoordsFromUrl(url: string | null): { lat: number, lng: number } | null {
  if (!url) return null;
  try {
    const decodedUrl = decodeURIComponent(url);
    
    const patterns = [
      /[@/](-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/,
      /query=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/,
      /q=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/,
      /place\/[^/]+\/([-?\d.]+),([-?\d.]+)/,
      /place\/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/,
      /ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    ];

    for (const regex of patterns) {
      const match = decodedUrl.match(regex);
      if (match && match[1] && match[2]) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { lat, lng };
        }
      }
    }
  } catch (e) {
    console.error('Failed to decode map URL:', e);
  }
  return null;
}

function estimateRouteLocal(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightDistance = R * c; // in km

  // Driving distance is roughly 1.35 times straight line due to road network winding
  const drivingDistance = straightDistance * 1.35;
  
  // Assume average driving speed of 80 km/h
  const drivingTimeHrs = drivingDistance / 80;
  const drivingTimeMins = Math.round(drivingTimeHrs * 60);

  let durationStr = '';
  if (drivingTimeMins < 60) {
    durationStr = `${drivingTimeMins} Min.`;
  } else {
    const hrs = Math.floor(drivingTimeMins / 60);
    const mins = drivingTimeMins % 60;
    durationStr = mins > 0 ? `${hrs} Std. ${mins} Min.` : `${hrs} Std.`;
  }

  return {
    distance: `${drivingDistance.toFixed(0)} km`,
    duration: durationStr,
    durationMinutes: drivingTimeMins,
  };
}

function getHardcodedCoords(name: string): { lat: number; lng: number } | null {
  const norm = name.toLowerCase();
  if (norm.includes('schlossberg')) {
    return { lat: 48.0626, lng: 6.8488 };
  }
  if (norm.includes('vesoul')) {
    return { lat: 47.6322, lng: 6.1432 };
  }
  if (norm.includes('castors')) {
    return { lat: 47.7289, lng: 7.1424 };
  }
  if (norm.includes('forêt') || norm.includes('arrigny')) {
    return { lat: 48.6256, lng: 4.7171 };
  }
  if (norm.includes('port') && !norm.includes('chaine')) {
    return { lat: 46.1591, lng: -1.1522 }; // Onlycamp Le Port, La Rochelle
  }
  if (norm.includes('gien')) {
    return { lat: 47.6853, lng: 2.6288 };
  }
  if (norm.includes('sologne')) {
    return { lat: 47.6012, lng: 2.1834 };
  }
  if (norm.includes('touesse')) {
    return { lat: 48.6412, lng: -2.1124 };
  }
  if (norm.includes('chaine')) {
    return { lat: 48.8145, lng: -3.0034 }; // Flower Camping Le Port de la Chaine
  }
  if (norm.includes('térénez') || norm.includes('terenez')) {
    return { lat: 48.6183, lng: -3.8569 }; // Camping Baie de Térénez
  }
  return null;
}

function extractCoordsFromHtml(html: string): { lat: number; lng: number } | null {
  const staticMapMatch =
    html.match(/staticmap\?[^"']*center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/i) ||
    html.match(/center=(-?\d+\.\d+),(-?\d+\.\d+)/i);
  if (staticMapMatch?.[1] && staticMapMatch?.[2]) {
    const lat = parseFloat(staticMapMatch[1]);
    const lng = parseFloat(staticMapMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }
  const llMatch = html.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/i);
  if (llMatch?.[1] && llMatch?.[2]) {
    const lat = parseFloat(llMatch[1]);
    const lng = parseFloat(llMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }
  const mapsUrlMatch = html.match(/https:\/\/(?:www\.)?google\.[^"'<>\s]+/i);
  if (mapsUrlMatch) {
    return extractCoordsFromUrl(decodeURIComponent(mapsUrlMatch[0]));
  }
  return null;
}

async function fetchPageHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const direct = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (direct.ok) return direct.text();
  } catch {
    clearTimeout(timeoutId);
  }

  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const proxyRes = await fetch(proxyUrl);
  if (!proxyRes.ok) {
    throw new Error(`Failed to fetch page (${proxyRes.status})`);
  }
  return proxyRes.text();
}

function formatDurationSeconds(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} Min.`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs} Std. ${rem} Min.` : `${hrs} Std.`;
}

async function fetchDrivingTime(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<{ duration: string; distance: string; isEstimated: boolean; durationMinutes: number }> {
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;
    const res = await fetch(osrmUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.[0]) {
        const route = data.routes[0];
        return {
          duration: formatDurationSeconds(route.duration),
          durationMinutes: Math.round(route.duration / 60),
          distance: `${(route.distance / 1000).toFixed(0)} km`,
          isEstimated: false,
        };
      }
    }
  } catch (err) {
    console.warn('OSRM routing unavailable, using straight-line estimate:', err);
  }
  const est = estimateRouteLocal(originLat, originLng, destLat, destLng);
  return { duration: est.duration, distance: est.distance, isEstimated: true, durationMinutes: est.durationMinutes };
}

function parseDurationToMinutes(duration: string): number | null {
  const hrMinMatch = duration.match(/(\d+)\s*Std\.?\s*(?:(\d+)\s*Min\.?)?/);
  if (hrMinMatch) {
    const hrs = parseInt(hrMinMatch[1], 10);
    const mins = hrMinMatch[2] ? parseInt(hrMinMatch[2], 10) : 0;
    return hrs * 60 + mins;
  }
  const minMatch = duration.match(/(\d+)\s*Min\.?/);
  if (minMatch) return parseInt(minMatch[1], 10);
  return null;
}

function getCampDurationMinutes(
  campId: string,
  times: Record<string, { duration: string; durationMinutes?: number }>
): number | null {
  const info = times[campId];
  if (!info) return null;
  if (typeof info.durationMinutes === 'number') return info.durationMinutes;
  return parseDurationToMinutes(info.duration);
}

async function resolveCoordsAsync(
  mapLink: string,
  name: string
): Promise<{ lat: number; lng: number } | null> {
  if (mapLink) {
    const direct = extractCoordsFromUrl(mapLink);
    if (direct) return direct;

    const isGoogleMapsLink = /maps\.app\.goo\.gl|goo\.gl\/maps|google\.[^/]+\/maps/i.test(mapLink);
    if (isGoogleMapsLink) {
      try {
        const html = await fetchPageHtml(mapLink.trim());
        const fromHtml = extractCoordsFromHtml(html);
        if (fromHtml) return fromHtml;
      } catch (err) {
        console.warn('Could not resolve map link via page fetch:', err);
      }
    }
  }

  if (name.trim()) {
    try {
      const q = encodeURIComponent(`${name.trim()} camping`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`,
        { headers: { 'Accept-Language': 'de,en,fr' } }
      );
      if (res.ok) {
        const results = await res.json();
        if (results[0]?.lat && results[0]?.lon) {
          return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
        }
      }
    } catch (err) {
      console.warn('OpenStreetMap geocoding failed:', err);
    }
  }

  return getHardcodedCoords(name);
}

interface ScrapeResult {
  imageUrl: string | null;
  images: string[];
}

async function scrapePageImages(pageUrl: string): Promise<ScrapeResult> {
  const targetUrl = pageUrl.trim();
  const html = await fetchPageHtml(targetUrl);

  let imageUrl: string | null = null;
  const ogMatches = [
    html.match(/<meta\s+[^>]*property=["']og:image["']\s+[^>]*content=["']([^"']+)["']/i),
    html.match(/<meta\s+[^>]*content=["']([^"']+)["']\s+[^>]*property=["']og:image["']/i),
    html.match(/<meta\s+[^>]*name=["']twitter:image["']\s+[^>]*content=["']([^"']+)["']/i),
    html.match(/<meta\s+[^>]*content=["']([^"']+)["']\s+[^>]*name=["']twitter:image["']/i),
  ];
  for (const match of ogMatches) {
    if (match?.[1]) {
      imageUrl = match[1];
      break;
    }
  }

  if (!imageUrl) {
    const imgMatches = [...html.matchAll(/<img\s+[^>]*src=["']([^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)["']/gi)];
    for (const m of imgMatches) {
      const src = m[1];
      if (!src.includes('logo') && !src.includes('icon') && !src.includes('pixel') && src.length > 10) {
        imageUrl = src;
        break;
      }
    }
    if (!imageUrl && imgMatches.length > 0) imageUrl = imgMatches[0][1];
  }

  let resolvedHeroUrl: string | null = null;
  if (imageUrl) {
    try {
      resolvedHeroUrl = new URL(imageUrl, targetUrl).href;
    } catch {
      resolvedHeroUrl = imageUrl.startsWith('http') ? imageUrl : null;
    }
  }

  const rawImageUrls: string[] = [];
  const imgTagRegex = /<img\s+[^>]*(?:src|data-src|data-lazy-src|srcset)=["']([^"'\s>]+)/gi;
  for (const match of html.matchAll(imgTagRegex)) {
    if (match[1]) rawImageUrls.push(match[1].split(',')[0].split(' ')[0].trim());
  }
  const generalMatches = html.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/gi);
  if (generalMatches) rawImageUrls.push(...generalMatches);

  const finalImagesList: string[] = [];
  const seenBaseKeys = new Set<string>();
  const skipPattern = /logo|icon|pixel|spacer|avatar|sprite|badge|loader|marker|widget|social|\.svg/i;

  if (resolvedHeroUrl) {
    seenBaseKeys.add(getImageBaseKey(resolvedHeroUrl));
    finalImagesList.push(resolvedHeroUrl);
  }

  for (const rawUrl of rawImageUrls) {
    if (!rawUrl || rawUrl.length < 10 || skipPattern.test(rawUrl)) continue;
    try {
      const resolved = new URL(rawUrl, targetUrl).href;
      const baseKey = getImageBaseKey(resolved);
      if (!seenBaseKeys.has(baseKey)) {
        seenBaseKeys.add(baseKey);
        finalImagesList.push(resolved);
      }
    } catch {
      if (rawUrl.startsWith('http') && !seenBaseKeys.has(getImageBaseKey(rawUrl))) {
        seenBaseKeys.add(getImageBaseKey(rawUrl));
        finalImagesList.push(rawUrl);
      }
    }
  }

  return { imageUrl: resolvedHeroUrl, images: finalImagesList.slice(0, 12) };
}

// Normalized fuzzy column extractor
function normalizeRow(row: Record<string, string>, id: string): NormalizedCampsite {
  const findValue = (keywords: string[]): string => {
    const key = Object.keys(row).find((k) => {
      const lowerK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      return keywords.some((kw) => lowerK.includes(kw));
    });
    return key ? row[key] : '';
  };

  const name = findValue(['name', 'campsite', 'title', 'campground']) || 'Unnamed Campsite';
  const state = findValue(['state', 'region', 'location', 'province', 'area']) || 'N/A';
  const priceStr = findValue(['price', 'cost', 'rate', 'fee']) || '';
  const priceClean = priceStr.replace(/[^0-9.]/g, '');
  const numericPrice = priceClean ? parseFloat(priceClean) : 0;

  const ratingStr = findValue(['rating', 'score', 'star']) || '';
  const numericRating = ratingStr ? parseFloat(ratingStr) : 0;

  const signal = findValue(['signal', 'cell', 'strength', 'lte']) || '';
  let numericSignal = 1;
  const sigLower = signal.toLowerCase();
  if (sigLower.includes('strong') || sigLower.includes('excellent') || sigLower.includes('5') || sigLower.includes('great') || sigLower.includes('high')) numericSignal = 5;
  else if (sigLower.includes('good') || sigLower.includes('4') || sigLower.includes('lte') || sigLower.includes('moderate')) numericSignal = 4;
  else if (sigLower.includes('medium') || sigLower.includes('fair') || sigLower.includes('3') || sigLower.includes('ok') || sigLower.includes('active')) numericSignal = 3;
  else if (sigLower.includes('weak') || sigLower.includes('poor') || sigLower.includes('2') || sigLower.includes('low')) numericSignal = 2;
  else if (sigLower.includes('none') || sigLower.includes('no') || sigLower.includes('0') || sigLower.includes('1')) numericSignal = 0;

  const hookups = findValue(['hookup', 'electricity', 'electric', 'power', 'plug']) || '';
  const hasHookups = ['yes', 'true', 'full', 'electric', '30a', '50a'].some((v) => hookups.toLowerCase().includes(v));

  const water = findValue(['water', 'drinking', 'potable']) || '';
  const hasWater = !['no', 'none', 'false'].some((v) => water.toLowerCase().includes(v)) && (water !== '');

  const toilet = findValue(['toilet', 'restroom', 'bathroom', 'shower', 'washroom']) || '';
  const hasToilet = !['no', 'none', 'false', 'pit only'].some((v) => toilet.toLowerCase().includes(v)) && (toilet !== '');

  const shade = findValue(['shade', 'sun', 'exposure', 'wood', 'forest']) || '';
  let numericShade = 2; 
  const shadeLower = shade.toLowerCase();
  if (shadeLower.includes('high') || shadeLower.includes('dense') || shadeLower.includes('wood') || shadeLower.includes('full') || shadeLower.includes('heavy')) numericShade = 3;
  else if (shadeLower.includes('low') || shadeLower.includes('sunny') || shadeLower.includes('open') || shadeLower.includes('none') || shadeLower.includes('hot')) numericShade = 1;

  const pets = findValue(['pet', 'dog', 'animal']) || '';
  const petsAllowed = !['no', 'false', 'banned', 'not allowed'].some((v) => pets.toLowerCase().includes(v));

  const comments = findValue(['bemerkungen', 'bemerkung', 'comment', 'note', 'description', 'detail', 'review']) || '';
  
  const mapLink = findValue(['map', 'googlemaps', 'directions', 'link', 'route', 'gmap']) || '';

  const latStr = findValue(['latitude', 'lat']) || '';
  const latitude = latStr ? parseFloat(latStr) : null;
  
  const lonStr = findValue(['longitude', 'lon', 'lng', 'long']) || '';
  const longitude = lonStr ? parseFloat(lonStr) : null;

  let finalLat = !isNaN(latitude as number) ? latitude : null;
  let finalLng = !isNaN(longitude as number) ? longitude : null;
  
  if ((finalLat === null || finalLng === null) && mapLink) {
    const coords = extractCoordsFromUrl(mapLink);
    if (coords) {
      finalLat = coords.lat;
      finalLng = coords.lng;
    }
  }

  if (finalLat === null || finalLng === null) {
    const fallback = getHardcodedCoords(name);
    if (fallback) {
      finalLat = fallback.lat;
      finalLng = fallback.lng;
    }
  }

  let image = findValue(['image', 'photo', 'picture', 'img']);
  // Fallback to "url" or "link" columns in the sheet if no specific image column is present
  if (!image) {
    image = findValue(['url', 'link']);
  }

  const slug = findValue(['slug']).trim();

  return {
    id,
    name,
    state,
    price: priceStr || 'Gratis',
    numericPrice,
    rating: ratingStr || 'Keine Angabe',
    numericRating,
    signal: signal || 'Unbekannt',
    numericSignal,
    hookups: hookups || 'Nein',
    hasHookups,
    water: water || 'Unbekannt',
    hasWater,
    toilet: toilet || 'Unbekannt',
    hasToilet,
    shade: shade || 'Mittel',
    numericShade,
    pets: pets || 'Erlaubt',
    petsAllowed,
    comments,
    latitude: finalLat,
    longitude: finalLng,
    image,
    raw: row,
    mapLink,
    slug: slug || undefined,
  };
}

function extractSheetSlug(camps: NormalizedCampsite[]): string {
  return camps.find(c => c.slug?.trim())?.slug?.trim() || '';
}

function extractSlugFromParsedRows(rows: Record<string, string>[]): string {
  for (const row of rows) {
    for (const [key, val] of Object.entries(row)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedKey === 'slug' || normalizedKey.endsWith('slug')) {
        const trimmed = val?.trim();
        if (trimmed) return trimmed;
      }
    }
  }
  return '';
}

function persistSheetSlug(
  parsedRows: Record<string, string>[],
  normalized: NormalizedCampsite[]
): string {
  const slug = extractSlugFromParsedRows(parsedRows) || extractSheetSlug(normalized);
  if (slug) localStorage.setItem('campground_sheet_slug', slug);
  else localStorage.removeItem('campground_sheet_slug');
  return slug;
}

// Helper to determine if a string is a webpage URL rather than a direct image file
function isWebpageUrl(urlStr: string): boolean {
  if (!urlStr) return false;
  const trimmed = urlStr.trim().toLowerCase();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('www.')) {
    return false;
  }
  const isDirectImage = /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(trimmed);
  const isKnownCDN = trimmed.includes('images.unsplash.com') || trimmed.includes('media.giphy.com') || trimmed.includes('cloudinary.com');
  return !isDirectImage && !isKnownCDN;
}

// Helper to strip query parameters, sizing parameters and HTML entities to detect identical base images
function getImageBaseKey(urlStr: string): string {
  if (!urlStr) return '';
  try {
    const decoded = urlStr
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
    
    const url = new URL(decoded);
    let hostname = url.hostname.replace(/^(?:[a-z0-9-]+\.)?pincamp\.(?:ch|de|fr|com)/i, 'pincamp');
    let key = hostname + url.pathname;
    
    // Strip Cloudinary transform segments
    key = key.replace(/\/c_fill[^/]*\//gi, '/');
    key = key.replace(/\/c_limit[^/]*\//gi, '/');
    key = key.replace(/\/c_[a-z]+[^/]*\//gi, '/');
    key = key.replace(/\/w_\d+[^/]*\//gi, '/');
    key = key.replace(/\/h_\d+[^/]*\//gi, '/');
    key = key.replace(/\/(?:width|height|size|thumb|w|h|fit|crop|fill)\/\d+(?:x\d+)?/gi, '');
    key = key.replace(/\/v\d+\//gi, '/');
    key = key.replace(/\/\d+x\d+[^/]*\//gi, '/');
    key = key.replace(/\/\d+x[^/]*\//gi, '/');
    key = key.replace(/\/x\d+[^/]*\//gi, '/');
    key = key.replace(/[-_]\d+x\d+(?=\.(?:jpg|jpeg|png|webp|gif))/gi, '');
    key = key.replace(/[-_](?:thumb|thumbnail|small|medium|large|hero)(?=\.(?:jpg|jpeg|png|webp|gif))/gi, '');
    
    return key.toLowerCase().trim();
  } catch {
    const decoded = urlStr
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
    return decoded.split('?')[0].toLowerCase().trim();
  }
}

interface CampgroundDetailImagesProps {
  url: string;
}

function CampgroundDetailImages({ url }: CampgroundDetailImagesProps) {
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!url || !isWebpageUrl(url)) return;

    let active = true;
    const cacheKey = `campground_gallery_${encodeURIComponent(url)}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        setImages(JSON.parse(cached));
        return;
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }

    const fetchImages = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const data = await scrapePageImages(url);
        if (active) {
          const list = data.images.length > 0 ? data.images : (data.imageUrl ? [data.imageUrl] : []);
          setImages(list);
          if (list.length > 0) {
            localStorage.setItem(cacheKey, JSON.stringify(list));
          } else {
            setHasError(true);
          }
        }
      } catch (err) {
        console.error('Error fetching detail images:', err);
        if (active) setHasError(true);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchImages();

    return () => {
      active = false;
    };
  }, [url]);

  // Compute completely unique images using base key deduplication
  const uniqueImages = useMemo(() => {
    const seen = new Set<string>();
    return images.filter(imgSrc => {
      if (!imgSrc) return false;
      const baseKey = getImageBaseKey(imgSrc);
      if (seen.has(baseKey)) {
        return false;
      }
      seen.add(baseKey);
      return true;
    });
  }, [images]);

  // Handle keyboard navigation for the lightbox
  useEffect(() => {
    if (lightboxIdx === null || uniqueImages.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIdx(null);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIdx(prev => (prev !== null ? (prev - 1 + uniqueImages.length) % uniqueImages.length : null));
      } else if (e.key === 'ArrowRight') {
        setLightboxIdx(prev => (prev !== null ? (prev + 1) % uniqueImages.length : null));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxIdx, uniqueImages]);

  if (!url || !isWebpageUrl(url)) return null;

  return (
    <div className="mt-4 pt-4 border-t border-editorial-border font-sans">
      <span className="text-xs font-bold text-editorial-muted uppercase block tracking-wider mb-2">
        Fotos von Pin Camp
      </span>
      
      {isLoading && (
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className="w-32 h-20 bg-[#F2F0EA] animate-pulse rounded-lg border border-editorial-border shrink-0 snap-start"
            />
          ))}
        </div>
      )}

      {hasError && (
        <p className="text-[11px] text-red-700 italic">Bilder konnten nicht geladen werden.</p>
      )}

      {!isLoading && !hasError && uniqueImages.length === 0 && (
        <p className="text-[11px] text-editorial-muted italic">Keine zusätzlichen Bilder auf der Seite gefunden.</p>
      )}

      {!isLoading && !hasError && uniqueImages.length > 0 && (
        <>
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin snap-x scroll-smooth">
            {uniqueImages.map((imgSrc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setLightboxIdx(idx)}
                className="group relative w-32 h-20 rounded-lg overflow-hidden border border-editorial-border bg-white shrink-0 snap-start transition-all hover:scale-[1.02] hover:border-editorial-moss shadow-2xs block cursor-pointer text-left focus:outline-hidden"
              >
                <img 
                  src={imgSrc} 
                  alt={`Web Photo ${idx + 1}`} 
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.08]"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
              </button>
            ))}
          </div>

          {/* LIGHTBOX OVERLAY */}
          {lightboxIdx !== null && (
            <div 
              className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4 select-none"
              onClick={() => setLightboxIdx(null)}
            >
              {/* Close button */}
              <button 
                type="button"
                onClick={() => setLightboxIdx(null)}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white p-2.5 rounded-full transition-colors z-50 cursor-pointer"
                title="Schließen"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Previous button */}
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx(prev => (prev !== null ? (prev - 1 + uniqueImages.length) % uniqueImages.length : null));
                }}
                className="absolute left-4 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white p-2.5 rounded-full transition-colors z-50 cursor-pointer"
                title="Zurück"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Main image container */}
              <div 
                className="relative max-w-full max-h-[80vh] flex items-center justify-center pointer-events-auto" 
                onClick={(e) => e.stopPropagation()}
              >
                <img 
                  src={uniqueImages[lightboxIdx]} 
                  alt={`Vergrößertes Bild ${lightboxIdx + 1}`}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl border border-white/10"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Next button */}
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx(prev => (prev !== null ? (prev + 1) % uniqueImages.length : null));
                }}
                className="absolute right-4 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white p-2.5 rounded-full transition-colors z-50 cursor-pointer"
                title="Weiter"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Caption or info */}
              <div className="absolute bottom-6 text-white/90 font-mono text-[11px] tracking-widest bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">
                BILD {lightboxIdx + 1} VON {uniqueImages.length}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function App() {
  // Persistence state
  const [sheetUrl, setSheetUrl] = useState(() => {
    return localStorage.getItem('campground_sheet_url') || 'https://docs.google.com/spreadsheets/d/1XWjztNxpC_VeGrjzF3FA9kMHSo222pzDPzJN3I7I7bU/edit?usp=sharing';
  });
  
  const [campsites, setCampsites] = useState<NormalizedCampsite[]>(() => {
    const saved = localStorage.getItem('campground_cached_data');
    if (saved) {
      try {
        const parsed = (JSON.parse(saved) as NormalizedCampsite[]).filter(c => !String(c.id).startsWith('demo-'));
        return parsed.map(c => {
          if (c.latitude === null || c.longitude === null) {
            const fallback = getHardcodedCoords(c.name);
            if (fallback) {
              return {
                ...c,
                latitude: fallback.lat,
                longitude: fallback.lng
              };
            }
          }
          return c;
        });
      } catch {
        return [];
      }
    }
    return [];
  });

  const [sheetSlug, setSheetSlug] = useState(() => {
    try {
      const saved = localStorage.getItem('campground_sheet_slug');
      if (saved?.trim()) return saved.trim();
      const cached = JSON.parse(localStorage.getItem('campground_cached_data') || '[]') as NormalizedCampsite[];
      return extractSheetSlug(cached);
    } catch {
      return '';
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Sorting Option
  const [sortBy, setSortBy] = useState<'default' | 'rating' | 'price' | 'alphabet' | 'near-to-far' | 'far-to-near' | 'south-to-north' | 'north-to-south' | 'east-to-west' | 'west-to-east'>('default');

  // Selected campground highlight trigger
  const [expandedCampIds, setExpandedCampIds] = useState<Set<string>>(() => new Set());

  const toggleCampExpanded = (id: string) => {
    setExpandedCampIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const [showConfigModal, setShowConfigModal] = useState(false);

  // User Geolocation Coordinates (Defaults to Zurich, Switzerland to calculate immediately)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>(() => ({ lat: 47.3769, lng: 8.5417 }));

  // drivingTimes cache map (stored in localStorage)
  const [drivingTimes, setDrivingTimes] = useState<Record<string, { duration: string; distance: string; isEstimated: boolean; cacheKey?: string; durationMinutes?: number }>>(() => {
    try {
      const saved = localStorage.getItem('campground_driving_times_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Geolocate the user on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          console.log(`User geolocated successfully: ${lat}, ${lng}`);
          setUserCoords({ lat, lng });
        },
        (error) => {
          console.warn('Geolocation access failed:', error);
          // Fallback user location is Zurich, Switzerland for demo if they deny/fail
          setUserCoords({ lat: 47.3769, lng: 8.5417 });
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setUserCoords({ lat: 47.3769, lng: 8.5417 });
    }
  }, []);

  // Compute driving times when campsites or user coordinates change
  useEffect(() => {
    if (!userCoords || campsites.length === 0) return;

    let active = true;

    const fetchTimes = async () => {
      let cachedTimes: Record<string, { duration: string; distance: string; isEstimated: boolean; cacheKey?: string; durationMinutes?: number }> = {};
      try {
        cachedTimes = JSON.parse(localStorage.getItem('campground_driving_times_v1') || '{}');
      } catch { /* ignore */ }

      const updates: Record<string, { duration: string; distance: string; isEstimated: boolean; cacheKey: string; durationMinutes: number }> = {};

      for (const camp of campsites) {
        if (!active) break;

        const lat = camp.latitude;
        const lng = camp.longitude;

        if (lat === null || lng === null) continue;

        const cacheKey = `${userCoords.lat.toFixed(4)},${userCoords.lng.toFixed(4)}_to_${lat.toFixed(4)},${lng.toFixed(4)}`;
        if (cachedTimes[camp.id]?.cacheKey === cacheKey) continue;

        const route = await fetchDrivingTime(userCoords.lat, userCoords.lng, lat, lng);
        updates[camp.id] = { ...route, cacheKey };

        // OSRM public demo: stay under ~1 req/sec
        await new Promise((r) => setTimeout(r, 1100));
      }

      if (Object.keys(updates).length > 0 && active) {
        setDrivingTimes((prev) => {
          const nextTimes = { ...prev, ...updates };
          localStorage.setItem('campground_driving_times_v1', JSON.stringify(nextTimes));
          return nextTimes;
        });
      }
    };

    fetchTimes();

    return () => {
      active = false;
    };
  }, [campsites, userCoords]);

  // Keep track of resolved coordinate attempts to prevent infinite request loops
  const attemptedResolves = useRef<Set<string>>(new Set());

  // Dynamically resolve missing coordinates from mapLink or name
  useEffect(() => {
    const missingCoords = campsites.filter(
      c => (c.latitude === null || c.longitude === null) && !attemptedResolves.current.has(c.id)
    );
    if (missingCoords.length === 0) return;

    let active = true;

    const resolveAll = async () => {
      let isUpdated = false;
      const nextCampsites = [...campsites];

      for (const camp of missingCoords) {
        if (!active) break;
        attemptedResolves.current.add(camp.id);

        try {
          console.log(`[Background Coordinate Resolve] Resolving ${camp.name}...`);
          const coords = await resolveCoordsAsync(camp.mapLink || '', camp.name);
          if (coords) {
            const index = nextCampsites.findIndex(c => c.id === camp.id);
            if (index !== -1 && active) {
              nextCampsites[index] = {
                ...nextCampsites[index],
                latitude: coords.lat,
                longitude: coords.lng
              };
              isUpdated = true;
              console.log(`[Background Coordinate Resolve] Successfully updated ${camp.name}:`, coords.lat, coords.lng);
            }
          } else {
            console.warn(`[Background Coordinate Resolve] Could not resolve coordinates for ${camp.name}`);
          }
        } catch (err) {
          console.error(`[Background Coordinate Resolve] Request error for ${camp.name}:`, err);
        }

        // Nominatim usage policy: max 1 request per second
        await new Promise((r) => setTimeout(r, 1100));
      }

      if (isUpdated && active) {
        setCampsites(nextCampsites);
        localStorage.setItem('campground_cached_data', JSON.stringify(nextCampsites));
      }
    };

    resolveAll();

    return () => {
      active = false;
    };
  }, [campsites]);

  // Scraped page images cache map (stored in localStorage)
  const [scrapedImages, setScrapedImages] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('campground_scraped_images');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Run dynamic image scrapbook crawler in background
  useEffect(() => {
    const urlsToScrape = campsites
      .map(c => c.image)
      .filter((img): img is string => !!img && isWebpageUrl(img) && !scrapedImages[img]);

    if (urlsToScrape.length === 0) return;

    let active = true;
    const scrapeQueue = async () => {
      // Scrape sequentially to respect host servers and API request bounds
      for (const url of urlsToScrape) {
        if (!active) break;
        try {
          console.log(`Crawl triggered for webpage image: ${url}`);
          const data = await scrapePageImages(url);
          if (data.imageUrl && active) {
            setScrapedImages(prev => {
              const updated = { ...prev, [url]: data.imageUrl! };
              localStorage.setItem('campground_scraped_images', JSON.stringify(updated));
              return updated;
            });
          }
        } catch (err) {
          console.error(`Failed crawling webpage image for ${url}:`, err);
        }
        await new Promise((r) => setTimeout(r, 300));
      }
    };

    scrapeQueue();

    return () => {
      active = false;
    };
  }, [campsites, scrapedImages]);

  // Auto-sync user's Google Sheet URL on first run if never completed
  useEffect(() => {
    const hasSyncedUserSheet = localStorage.getItem('campground_has_synced_user_sheet_v1');
    if (hasSyncedUserSheet !== 'true' && sheetUrl) {
      const autoSyncUserSheet = async () => {
        setIsLoading(true);
        setErrorMsg(null);
        try {
          const csvText = await fetchSheetCsv(sheetUrl);
          const parsedRows = parseCSV(csvText);
          if (parsedRows.length > 0) {
            const normalized = parsedRows.map((row, index) => normalizeRow(row, `sheet-${index}`));
            setCampsites(normalized);
            localStorage.setItem('campground_cached_data', JSON.stringify(normalized));
            localStorage.setItem('campground_sheet_url', sheetUrl.trim());
            localStorage.setItem('campground_has_synced_user_sheet_v1', 'true');
            const slug = persistSheetSlug(parsedRows, normalized);
            setSheetSlug(slug);
            setSyncSuccess(true);
          }
        } catch (err: any) {
          console.error('Initial auto-sync error:', err);
          setErrorMsg(`Auto-sync failed: ${err.message || err}. Ensure your sheet is shared and Published to Web, or try clicking 'Sync Sheet' manually.`);
        } finally {
          setIsLoading(false);
        }
      };
      autoSyncUserSheet();
    }
  }, [sheetUrl]);

  // Sync / Import handler
  const handleSheetSync = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sheetUrl.trim()) {
      setErrorMsg('Please paste a valid Google Sheets sharing URL.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSyncSuccess(false);

    try {
      const csvText = await fetchSheetCsv(sheetUrl);
      const parsedRows = parseCSV(csvText);

      if (parsedRows.length === 0) {
        throw new Error('No data rows found in the spreadsheet. Make sure headers are in the first row.');
      }

      const normalized = parsedRows.map((row, index) => normalizeRow(row, `sheet-${index}`));
      setCampsites(normalized);
      localStorage.setItem('campground_cached_data', JSON.stringify(normalized));
      localStorage.setItem('campground_sheet_url', sheetUrl.trim());
      const slug = persistSheetSlug(parsedRows, normalized);
      setSheetSlug(slug);
      setExpandedCampIds(new Set());
      setSyncSuccess(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An unexpected error occurred parsing the sheet.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sort campsites depending on selected sort rules
  const sortedCampsites = useMemo(() => {
    const list = [...campsites];
    const sortByDuration = (ascending: boolean) => {
      return list.sort((a, b) => {
        const aMins = getCampDurationMinutes(a.id, drivingTimes);
        const bMins = getCampDurationMinutes(b.id, drivingTimes);
        if (aMins === null && bMins === null) return 0;
        if (aMins === null) return 1;
        if (bMins === null) return -1;
        return ascending ? aMins - bMins : bMins - aMins;
      });
    };

    if (sortBy === 'rating') {
      return list.sort((a, b) => b.numericRating - a.numericRating);
    } else if (sortBy === 'price') {
      return list.sort((a, b) => a.numericPrice - b.numericPrice);
    } else if (sortBy === 'near-to-far') {
      return sortByDuration(true);
    } else if (sortBy === 'far-to-near') {
      return sortByDuration(false);
    } else if (sortBy === 'alphabet') {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'south-to-north') {
      return list.sort((a, b) => {
        if (a.latitude === null && b.latitude === null) return 0;
        if (a.latitude === null) return 1;
        if (b.latitude === null) return -1;
        return a.latitude - b.latitude;
      });
    } else if (sortBy === 'north-to-south') {
      return list.sort((a, b) => {
        if (a.latitude === null && b.latitude === null) return 0;
        if (a.latitude === null) return 1;
        if (b.latitude === null) return -1;
        return b.latitude - a.latitude;
      });
    } else if (sortBy === 'east-to-west') {
      return list.sort((a, b) => {
        if (a.longitude === null && b.longitude === null) return 0;
        if (a.longitude === null) return 1;
        if (b.longitude === null) return -1;
        return b.longitude - a.longitude;
      });
    } else if (sortBy === 'west-to-east') {
      return list.sort((a, b) => {
        if (a.longitude === null && b.longitude === null) return 0;
        if (a.longitude === null) return 1;
        if (b.longitude === null) return -1;
        return a.longitude - b.longitude;
      });
    } else {
      return list; // original sheet sequence
    }
  }, [campsites, sortBy, drivingTimes]);

  useEffect(() => {
    const fromCamps = extractSheetSlug(campsites);
    if (fromCamps) setSheetSlug(fromCamps);
  }, [campsites]);

  return (
    <div id="campsite-app" className="min-h-screen bg-editorial-bg text-editorial-text font-sans flex flex-col antialiased selection:bg-editorial-moss selection:text-white">
      
      {/* HEADER SECTION */}
      <header className="border-b border-editorial-border py-6 px-4 sm:px-10 shrink-0 relative z-10 bg-editorial-bg text-editorial-text">
        <div className={`${CONTENT_MAX_W} mx-auto`}>
          <div className="flex flex-col items-center text-center">
            <h1 className="text-3xl font-serif italic tracking-tight text-editorial-moss">Camp-Finder</h1>
            {sheetSlug ? (
              <span className="text-sm sm:text-base uppercase tracking-[0.2em] font-bold text-editorial-muted mt-2">
                {sheetSlug}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {/* FEEDBACK STRIP */}
      {errorMsg && (
        <div className="bg-[#FAF9F6] border-b border-[#E0DDD5] text-editorial-darkred py-2.5 px-4 text-center text-xs font-semibold flex items-center justify-center gap-1.5 animate-slide-in">
          <Info className="w-4 h-4 shrink-0" />
          <span>Fehler beim Laden der Tabelle: {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-2 hover:opacity-75"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {syncSuccess && (
        <div className="bg-[#FAF9F6] border-b border-[#E0DDD5] text-editorial-moss py-2.5 px-4 text-center text-xs font-semibold flex items-center justify-center gap-1.5 animate-slide-in">
          <Check className="w-4 h-4 shrink-0 bg-editorial-moss text-white rounded-full p-0.5" />
          <span>Daten erfolgreich geladen! Für Offline-Nutzung lokal zwischengespeichert.</span>
          <button onClick={() => setSyncSuccess(false)} className="ml-2 hover:opacity-75"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* MAIN CONTAINER (Single Column Layout) */}
      <main className={`flex-1 ${CONTENT_MAX_W} w-full mx-auto p-4 md:p-6 flex flex-col gap-6 overflow-y-auto`}>
        
        {/* TOTAL AND SORT SELECTOR BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-editorial-muted px-1 pb-3 border-b border-editorial-border/40 gap-3">
          <span>Insgesamt <b>{sortedCampsites.length}</b> Campingplätze</span>
          
          <div className="flex items-center gap-2">
            <span className="font-sans uppercase tracking-[0.1em] text-[9px] font-bold text-editorial-muted">Sortieren:</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs py-1.5 px-3 bg-editorial-card border border-editorial-border rounded-xl focus:outline-none focus:ring-1 focus:ring-editorial-moss focus:border-editorial-moss text-editorial-moss font-semibold cursor-pointer"
            >
              <option value="default">Original-Reihenfolge (Tabelle)</option>
              <option value="near-to-far">Nah zu fern</option>
              <option value="far-to-near">Fern zu nah</option>
              <option value="south-to-north">︽ Süden nach Norden</option>
              <option value="north-to-south">︾ Norden nach Süden</option>
              <option value="east-to-west">« Osten nach Westen</option>
              <option value="west-to-east">» Westen nach Osten</option>
              <option value="alphabet">Alphabetisch (A bis Z)</option>
            </select>
          </div>
        </div>

        {/* CAMPSITE LIST CORES */}
        <div className="flex flex-col gap-4">
          {sortedCampsites.length === 0 ? (
            <div className="bg-editorial-card border border-editorial-border rounded-xl p-12 text-center flex flex-col items-center justify-center font-sans">
              <Compass className="w-10 h-10 text-editorial-muted mb-2 stroke-1 animate-pulse" />
              <h4 className="font-serif italic text-editorial-text text-xl font-bold">Keine Campingplätze vorhanden</h4>
              <p className="text-xs text-[#5C5952] mt-1 max-w-xs">Fügen Sie unten Ihren Google-Sheets-Link ein und klicken Sie auf „Laden“, um Ihre Campingplätze anzuzeigen.</p>
            </div>
          ) : (
            sortedCampsites.map((camp) => {
              const isExpanded = expandedCampIds.has(camp.id);

              return (
                <div 
                  key={camp.id} 
                  id={`camp-card-${camp.id}`}
                  className={`group bg-editorial-card border text-left rounded-xl overflow-hidden transition-all duration-300 flex flex-col ${
                    isExpanded 
                    ? 'border-editorial-border shadow-[0_4px_16px_rgba(60,58,52,0.10)]' 
                    : 'border-editorial-border shadow-xs hover:shadow-sm'
                  }`}
                >
                  
                  {/* Card head — thumbnail + summary (click to toggle) */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={() => toggleCampExpanded(camp.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleCampExpanded(camp.id);
                      }
                    }}
                    className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-editorial-border min-h-[144px] cursor-pointer"
                  >
                    
                    {/* Left Thumbnail Photo */}
                    <div className="md:w-1/4 h-36 md:h-auto overflow-hidden relative shrink-0 bg-[#3A3A3A]">
                      <CampThumbnail camp={camp} scrapedImages={scrapedImages} />
                    </div>

                    {/* Middle Content core */}
                    <div className="flex-1 p-5 flex flex-col justify-between bg-editorial-card">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap font-serif">
                              <h3 className="font-serif italic text-editorial-moss text-lg sm:text-xl font-bold leading-tight font-serif">{camp.name}</h3>
                              {camp.state && camp.state !== 'N/A' && (
                                <span className="inline-block text-[10px] text-editorial-muted font-bold tracking-tight bg-[#FAF9F6] px-2.5 py-0.5 rounded-full border border-editorial-border font-sans">
                                  {camp.state}
                                </span>
                              )}
                            </div>

                            {camp.comments && camp.comments.trim() ? (
                              <p className="text-sm text-[#5C5952] line-clamp-3 mt-2 leading-relaxed font-sans">
                                {camp.comments}
                              </p>
                            ) : null}

                            {/* Driving time & distance below Bemerkung */}
                            {(() => {
                              const timeInfo = drivingTimes[camp.id];
                              if (!timeInfo) {
                                if (camp.latitude !== null && camp.longitude !== null) {
                                  return (
                                    <div className="flex items-center gap-1.5 text-[10px] text-[#8C8880] font-mono mt-2 font-semibold">
                                      <Car className="w-3 h-3 shrink-0" />
                                      <span>Fahrzeit wird berechnet...</span>
                                    </div>
                                  );
                                }
                                return null;
                              }

                              return (
                                <div className="flex items-center gap-1.5 text-[10px] text-editorial-moss font-mono mt-2 font-bold flex-wrap">
                                  <div className="flex items-center gap-1 bg-[#F3F5F3] border border-editorial-border/60 text-editorial-moss px-2 py-0.5 rounded-md">
                                    <Car className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                                    <span>{timeInfo.duration} Fahrzeit</span>
                                  </div>
                                  <span className="text-editorial-muted/80 text-xs font-sans font-medium">
                                    {timeInfo.isEstimated
                                      ? `~${timeInfo.distance} Luftlinie`
                                      : `${timeInfo.distance} Fahrstrecke`}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Attribute Indicators Section & Amenity tags replacement */}
                      <div className="flex items-center gap-2 flex-wrap mt-4 text-[11px] text-[#5C5952] font-medium border-t border-editorial-border/30 pt-3">
                        {(() => {
                          const activeAmenities = getAmenitiesOfCampsite(camp);
                          if (activeAmenities.length === 0) {
                            return (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FAF9F6] text-[#5C5952] border border-editorial-border rounded-full text-[10px] font-semibold">
                                <Compass className="w-3 px-0 h-3 text-[#5C5952]/70 shrink-0" />
                                <span>Unberührte Natur</span>
                              </div>
                            );
                          }

                          return activeAmenities.map(tag => {
                            const conf = AMENITY_MAP[tag];
                            if (!conf) return null;
                            const Icon = conf.icon;
                            return (
                              <div 
                                key={tag} 
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] uppercase font-bold transition-all ${conf.color}`}
                                title={`${conf.label} vorhanden`}
                              >
                                <Icon className="w-3 h-3 shrink-0" />
                                <span>{conf.label}</span>
                              </div>
                            );
                          });
                        })()}

                        {/* Wilderness Rating Star */}
                        {camp.numericRating > 0 && (
                          <div className="flex items-center gap-1 ml-auto text-editorial-moss font-serif italic text-sm font-bold">
                            <span className="text-amber-600 mr-0.5 font-sans text-xs">★</span>
                            <span>{camp.rating} / 5</span>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* EXPANDABLE COLLAPSIBLE DRAWER FOR EXTRA COLUMNS & RECORDS */}
                  {isExpanded && (
                    <div className="bg-white border-t border-editorial-border p-5">
                      {(() => {
                        const mapKey = Object.keys(camp.raw).find(k => {
                          const l = k.toLowerCase().trim();
                          return l === 'map' || l === 'karte' || l.includes('google_map') || l.includes('googlemap') || l === 'gmap' || l === 'directions' || l === 'maplink' || l === 'map link';
                        }) || 'Map';
                        const mapVal = camp.raw[mapKey] || camp.mapLink;

                        const urlKey = Object.keys(camp.raw).find(k => {
                          const l = k.toLowerCase().trim();
                          if (l.includes('image') || l.includes('photo') || l.includes('picture') || l.includes('img') || l.includes('cover')) return false;
                          return l === 'url' || l === 'website' || l === 'webseite' || l === 'link' || l.includes('site_link') || l === 'websitelink';
                        }) || 'URL';
                        const urlVal = camp.raw[urlKey];

                        return (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Map (Karte) Block */}
                              {mapVal ? (
                                <a
                                  href={mapVal.startsWith('http') ? mapVal : `https://${mapVal}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-[#F2F0EA] p-4 rounded-xl border border-editorial-border font-sans block hover:bg-[#EAE8E0] transition-colors"
                                >
                                  <span className="text-sm text-editorial-moss font-semibold flex items-center gap-1.5">
                                    <Navigation className="w-4 h-4 shrink-0" />
                                    <span>Google Maps</span>
                                  </span>
                                </a>
                              ) : (
                                <div className="bg-[#F2F0EA] p-4 rounded-xl border border-editorial-border font-sans">
                                  <span className="text-sm text-editorial-muted italic">Keine Karte hinterlegt</span>
                                </div>
                              )}

                              {/* URL Website Block */}
                              {urlVal ? (
                                <a
                                  href={urlVal.startsWith('http') ? urlVal : `https://${urlVal}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-[#F2F0EA] p-4 rounded-xl border border-editorial-border font-sans block hover:bg-[#EAE8E0] transition-colors"
                                >
                                  <span className="text-sm text-editorial-moss font-semibold flex items-center gap-1.5">
                                    <Info className="w-4 h-4 shrink-0" />
                                    <span>Pin Camp</span>
                                  </span>
                                </a>
                              ) : (
                                <div className="bg-[#F2F0EA] p-4 rounded-xl border border-editorial-border font-sans">
                                  <span className="text-sm text-editorial-muted italic">Keine Website hinterlegt</span>
                                </div>
                              )}
                            </div>
                            <CampgroundDetailImages url={urlVal} />
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Card footer — Details toggle */}
                  <div className="border-t border-editorial-border px-5 py-3 flex justify-end bg-[#FAF9F6]">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCampExpanded(camp.id);
                      }}
                      className="text-sm text-editorial-moss font-bold flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                    >
                      <span>{isExpanded ? 'Details zuklappen' : 'Details'}</span>
                      <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* SPREADSHEET URL BOX */}
        <div className="bg-[#FAF9F6] border border-editorial-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-3">
            <div className="bg-editorial-moss/10 text-editorial-moss p-2 rounded-lg shrink-0 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif italic text-editorial-moss text-base font-serif">
                Google-Tabelle verbinden
              </h3>
              <p className="text-xs text-[#5C5952] leading-relaxed mt-0.5 font-sans">
                Öffentlich freigegebenen Sheets-Link einfügen, um die Campingliste zu laden oder zu aktualisieren.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 sm:ml-auto">
            <form onSubmit={handleSheetSync} className="flex items-center gap-2 flex-1 sm:max-w-md min-w-0">
              <div className="relative flex-1 min-w-0">
                <input 
                  type="url"
                  placeholder="Google-Sheets-Link..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="w-full text-xs py-2.5 px-4 bg-editorial-card text-editorial-text placeholder-editorial-muted/70 rounded-full border border-editorial-border focus:outline-none focus:border-editorial-moss focus:ring-1 focus:ring-editorial-moss transition-all shadow-inner"
                />
              </div>
              <button 
                type="submit"
                disabled={isLoading}
                className={`text-xs px-4 py-2.5 font-bold uppercase tracking-wider rounded-full text-white shadow transition-all flex items-center gap-1.5 shrink-0 ${
                  isLoading 
                  ? 'bg-editorial-moss/50 text-white/55 cursor-not-allowed' 
                  : 'bg-editorial-moss hover:bg-editorial-moss-dark active:scale-95'
                }`}
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Laden</span>
              </button>
            </form>
            <button
              id="help-btn"
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="p-2.5 text-editorial-moss hover:bg-[#F2F0EA] border border-editorial-border rounded-full shrink-0 transition-colors"
              title="Anleitung anzeigen"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>

      {/* OFFLINE STATUS BORDER BOX */}
      <div className={`${CONTENT_MAX_W} w-full mx-auto px-4 mb-6 mt-2`}>
        <div className="bg-[#FAF9F6] border border-editorial-border rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex gap-3">
            <div className="bg-editorial-moss/10 text-editorial-moss p-2 rounded-lg shrink-0 flex items-center justify-center">
              <CloudOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif italic text-editorial-moss text-base flex items-center gap-1.5 font-serif">
                Offline-bereites Register
              </h3>
              <p className="text-xs text-[#5C5952] leading-relaxed mt-0.5 font-sans">
                Alle Daten der Campings werden im Browser zwischengespeichert – für eine schnelle und sichere Nutzung ganz ohne Netzempfang in der Wildnis.
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowConfigModal(true)}
            className="text-editorial-moss text-xs font-bold hover:underline flex items-center gap-1 shrink-0 bg-[#F2F0EA] border border-editorial-border hover:bg-[#EAE8E0] px-3.5 py-1.5 rounded-full"
          >
            <Info className="w-3.5 h-3.5 text-editorial-moss" />
            <span>Format-Anleitung</span>
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-editorial-card border-t border-editorial-border py-8 px-4 text-center text-xs text-editorial-muted shrink-0 mt-auto">
        <div className={`${CONTENT_MAX_W} mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 font-sans`}>
          <span>Camp-Finder &copy; 2026. Mads privater Camping Begleiter.</span>
          <span className="flex items-center gap-1.5 text-editorial-moss font-bold uppercase tracking-wider text-[10px]">
            <span>Camping &bull; Die Kunst, Komfort gegen Freiheit zu tauschen</span>
          </span>
        </div>
      </footer>

      {/* CONFIG SLIDEOUT MODAL HELP GUIDE */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-editorial-card border border-editorial-border rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowConfigModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#EAE8E0] text-editorial-text transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-3.5 mb-4">
              <div className="p-2.5 bg-editorial-moss text-[#FAF9F6] rounded-lg">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif italic text-editorial-moss text-lg font-bold font-serif">Google-Sheets-Einrichtungsanleitung</h3>
                <p className="text-xs text-editorial-muted">Hier erfahren Sie, wie Sie Ihre eigene Camping-Tabelle verbinden.</p>
              </div>
            </div>

            <div className="space-y-4 text-editorial-text font-sans text-xs leading-relaxed">
              
              <div className="space-y-1.5">
                <h4 className="font-sans font-bold text-editorial-moss text-xs">1. Die eigene Camping-Tabelle formatieren</h4>
                <p>Achten Sie darauf, dass die erste Zeile verständliche Spaltenüberschriften enthält. Das System nutzt **Fuzzy Column Intelligence**, um Spalten automatisch zuzuordnen. Folgende Begriffe (oder ähnliche) werden erkannt:</p>
                <div className="bg-editorial-bg p-3 rounded-xl border border-editorial-border font-sans text-[10px] text-[#5C5952] grid grid-cols-2 gap-2">
                  <div>• <b>Name</b> (Campingplatz, Ort, Name)</div>
                  <div>• <b>Bemerkungen</b> (Notizen, Erfahrungen)</div>
                </div>

                <p className="mt-2 text-[11px] text-[#5C5952]">
                  <b>Zusatz-Ausstattung (mit "x", "yes" oder "ja" markieren):</b>
                </p>
                <div className="bg-editorial-bg p-3 rounded-xl border border-editorial-border font-sans text-[10px] text-[#5C5952] grid grid-cols-2 gap-2">
                  <div>• <b>Laden</b> (Bedarfsartikel / Lebensmittelladen)</div>
                  <div>• <b>Restaurant</b></div>
                  <div>• <b>Imbiss</b> (Snack bar)</div>
                  <div>• <b>Brot</b> (Frisches Brot / Brötchenservice)</div>
                  <div>• <b>Meer</b> (Meerblick / Strandnähe)</div>
                  <div>• <b>See</b> (Seeufer / Seezugang)</div>
                  <div>• <b>Fluss</b> (Flussufer / Flusszugang)</div>
                  <div>• <b>Pool</b> (Schwimmbad / Pool)</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-sans font-bold text-editorial-moss text-xs">2. Freigabe einrichten (CORS-frei)</h4>
                <p>Google Sheets schränkt direkte Abfragen standardmäßig ein. Folgen Sie dieser einfachen Anleitung:</p>
                <ol className="list-decimal list-inside pl-1 space-y-1 font-sans">
                  <li>Klicken Sie in Ihrer Google-Tabelle oben rechts auf den großen Button <b>Freigeben</b>.</li>
                  <li>Ändern Sie unter Allgemeiner Zugriff "Eingeschränkt" auf <b>"Jeder, der über den Link verfügt, kann lesen"</b>.</li>
                  <li>Kopieren Sie diesen Link und fügen Sie ihn in das Eingabefeld unten in der Campingliste ein!</li>
                </ol>
              </div>

              <div className="bg-editorial-bg border border-editorial-border p-3.5 rounded-lg flex items-start gap-2.5 font-sans">
                <Info className="w-4 h-4 text-editorial-moss shrink-0 mt-0.5" />
                <div className="text-editorial-text">
                  <strong className="text-editorial-moss block mb-0.5">Erster Start</strong>
                  Beim ersten Besuch wird Ihre hinterlegte Google-Tabelle automatisch geladen. Sie können jederzeit einen anderen Sheets-Link unten einfügen und auf „Laden“ klicken.
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-editorial-border flex justify-end">
              <button 
                onClick={() => setShowConfigModal(false)}
                className="bg-editorial-moss hover:bg-editorial-moss-dark text-white font-bold uppercase tracking-widest py-2 px-6 rounded-full transition-all shadow-xs text-xs"
              >
                Anleitung Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
