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
}

// Epic curated default campsites matching schema
const DEMO_CAMPSITES: NormalizedCampsite[] = [
  {
    id: 'demo-1',
    name: 'Whispering Pines Creek',
    state: 'Oregon (Kaskaden-Region)',
    price: '$25/Nacht',
    numericPrice: 25,
    rating: '4.8',
    numericRating: 4.8,
    signal: 'Starkes AT&T-Netz (4 Balken)',
    numericSignal: 5,
    hookups: 'Standard-Stromanschlüsse vorhanden',
    hasHookups: true,
    water: 'Trinkwasser-Zapfstellen am Platz',
    hasWater: true,
    toilet: 'Spültoiletten & warme Duschen',
    hasToilet: true,
    shade: 'Hoch (Dichter alter Kiefernwald)',
    numericShade: 3,
    pets: 'Angeleinte Hunde herzlich willkommen',
    petsAllowed: true,
    comments: 'Wunderschöne schattige Plätze direkt an einem rauschenden Fluss. Bietet individuelle Picknicktische aus Zedernholz und makellose gemauerte Feuerstellen. Sehr gepflegte Sanitäranlagen, allerdings sind die Plätze an Juli-Wochenenden schnell ausgebucht.',
    latitude: 44.0581,
    longitude: -121.3153,
    image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=600&q=80',
    raw: {
      'Laden': 'x',
      'Brot': 'x',
      'See': 'x',
      'Fluss': 'x',
      'Pool': 'x'
    }
  },
  {
    id: 'demo-2',
    name: 'Lone Wolf Ridge',
    state: 'Colorado (San-Juan-Wildnis)',
    price: '$0 (Kostenloses BLM-Wildcamping)',
    numericPrice: 0,
    rating: '4.9',
    numericRating: 4.9,
    signal: 'Kein Empfang (Funkloch)',
    numericSignal: 0,
    hookups: 'Keine (Autarkes Stehen erforderlich)',
    hasHookups: false,
    water: 'Natürlicher Quellbach (Filter nötig)',
    hasWater: false,
    toilet: 'Hinterlasse keine Spuren (Vollständig autark)',
    hasToilet: false,
    shade: 'Mittel (Schöne Espenhaine)',
    numericShade: 2,
    pets: 'Haustiere dürfen frei laufen',
    petsAllowed: true,
    comments: 'Spektakulärer Zeltplatz auf einem Bergkamm auf über 3.000 Metern Höhe. Absolut lautlose, kühle Nächte mit einem atemberaubenden Blick auf die Milchstraße. Die unbefestigte Zufahrtsstraße ist steil und holprig – Allradantrieb oder ein SUV mit hoher Bodenfreiheit wird empfohlen.',
    latitude: 37.8123,
    longitude: -107.6635,
    image: 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=600&q=80',
    raw: {}
  },
  {
    id: 'demo-3',
    name: 'Ocean Breeze Bluff Camp',
    state: 'Kalifornien (Big-Sur-Klippen)',
    price: '$45/Nacht',
    numericPrice: 45,
    rating: '4.7',
    numericRating: 4.7,
    signal: 'Schwaches Verizon-Netz (1-2 Balken)',
    numericSignal: 2,
    hookups: 'Einfacher Stellplatz ohne Strom',
    hasHookups: false,
    water: 'Zentrale Schlauchstation zum Auffüllen',
    hasWater: true,
    toilet: 'Einfache Plumpsklo-Anlagen vorhanden',
    hasToilet: true,
    shade: 'Gering (Offene Klippenlandschaft)',
    numericShade: 1,
    pets: 'Hunde nur direkt am Stellplatz erlaubt',
    petsAllowed: true,
    comments: 'Wachen Sie mit dem beruhigenden Rauschen der Wellen und dem dichten Meeresnebel auf. Die Stellplätze auf den Klippen bieten einen unschlagbaren Weitblick über den wilden Pazifik und direkten Zugang zu Küstenpfaden. Nach Sonnenuntergang kann es sehr windig und kalt werden.',
    latitude: 36.2104,
    longitude: -121.7258,
    image: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=600&q=80',
    raw: {
      'Meer': 'x',
      'Imbiss': 'x'
    }
  },
  {
    id: 'demo-4',
    name: 'Cactus Oasis RV Haven',
    state: 'Arizona (Sonora-Wüste)',
    price: '$35/Nacht',
    numericPrice: 35,
    rating: '4.1',
    numericRating: 4.1,
    signal: 'Hervorragender 5G-Empfang',
    numericSignal: 5,
    hookups: 'Vollwertige Anschlüsse (50A Strom + Abwasser)',
    hasHookups: true,
    water: 'Eigener Wasseranschluss direkt am Platz',
    hasWater: true,
    toilet: 'Geflieste Duschräume & Waschmaschinen',
    hasToilet: true,
    shade: 'Keine (Volle Sonneneinstrahlung)',
    numericShade: 1,
    pets: 'Eigener kleiner Hundeauslauf vorhanden',
    petsAllowed: true,
    comments: 'Ebene Schotterplätze mit viel Platz für große Wohnmobile. Perfekt geeignet für Reisende, die auf schnelles Internet angewiesen sind, um unterwegs zu arbeiten. Kein Schatten vorhanden, aber die Wintersonne ist herrlich wärmend.',
    latitude: 32.2217,
    longitude: -110.9265,
    image: 'https://images.unsplash.com/photo-1496080174650-637e3f22fa03?auto=format&fit=crop&w=600&q=80',
    raw: {
      'Pool': 'x',
      'Imbiss': 'x',
      'Laden': 'x'
    }
  },
  {
    id: 'demo-5',
    name: 'Maple Ridge State Park',
    state: 'Vermont (Green Mountains)',
    price: '$30/Nacht',
    numericPrice: 30,
    rating: '4.5',
    numericRating: 4.5,
    signal: 'Mittelprächtiges LTE-Netz (3 Balken)',
    numericSignal: 3,
    hookups: 'Einfacher Stellplatz mit Picknicktisch',
    hasHookups: false,
    water: 'Gemeinschafts-Zapfstellen alle paar Plätze',
    hasWater: true,
    toilet: 'Moderne WCs & heiße Duschen vorhanden',
    hasToilet: true,
    shade: 'Hoch (Prachtvoller Ahorn-Mischwald)',
    numericShade: 3,
    pets: 'Erlaubt, Tollwut-Impfpass erforderlich',
    petsAllowed: true,
    comments: 'Ein unglaublich schöner Naturplatz, besonders zur herbstlichen Laubfärbung (Indian Summer). Weitläufig voneinander getrennte Waldstellplätze gruppiert um eigene Feuerringe mit Grillgitter. Sehr hilfsbereite Park-Ranger vor Ort.',
    latitude: 44.3678,
    longitude: -72.7561,
    image: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=600&q=80',
    raw: {
      'Restaurant': 'x',
      'Brot': 'x',
      'See': 'x',
      'Fluss': 'x'
    }
  }
];

const BACKGROUND_ORGANIC_IMAGES = [
  'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1496080174650-637e3f22fa03?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1487730116645-74489c95b41b?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=600&q=80'
];

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

// Fallback image generator based on campsite id
function getCampImage(camp: NormalizedCampsite, scrapedImages: Record<string, string> = {}): string {
  const imageUrl = (camp.image && scrapedImages[camp.image]) ? scrapedImages[camp.image] : camp.image;
  if (imageUrl && !isWebpageUrl(imageUrl)) {
    const trimmed = imageUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    } else if (trimmed.startsWith('www.')) {
      return `https://${trimmed}`;
    }
  }
  let hashNum = 0;
  for (let i = 0; i < camp.name.length; i++) {
    hashNum += camp.name.charCodeAt(i);
  }
  return BACKGROUND_ORGANIC_IMAGES[hashNum % BACKGROUND_ORGANIC_IMAGES.length];
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

// Client-side coordinate resolution (replaces /api/resolve-coords on static hosts).
function resolveCoordsClient(mapLink: string, name: string): { lat: number; lng: number } | null {
  if (mapLink) {
    const coords = extractCoordsFromUrl(mapLink);
    if (coords) return coords;
  }
  return getHardcodedCoords(name);
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
      /[@/](-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/, // e.g. @46.123,-121.456 or /46.123,-121.456
      /query=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/, // e.g. query=34.5,-112.4
      /q=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/, // e.g. q=34.5,-112.4
      /place\/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/ // e.g. place/47.1,8.2
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
    duration: durationStr
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
  };
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
      // /api/scrape-image requires a backend proxy — unavailable on GitHub Pages.
      // Gallery images fall back to the campsite's direct image URL or generated placeholders.
      if (active) setIsLoading(false);
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
      <span className="text-[10px] font-bold text-editorial-muted uppercase block tracking-wider mb-2">
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
        const parsed = JSON.parse(saved) as NormalizedCampsite[];
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
        return DEMO_CAMPSITES;
      }
    }
    return DEMO_CAMPSITES;
  });

  const [isDemoMode, setIsDemoMode] = useState(() => {
    const savedUrl = localStorage.getItem('campground_sheet_url');
    if (savedUrl) return false;
    const isDemoSaved = localStorage.getItem('campground_is_demo');
    if (isDemoSaved === 'false') return false;
    const hasSyncedUserSheet = localStorage.getItem('campground_has_synced_user_sheet_v1');
    if (hasSyncedUserSheet === 'true') return false;
    return true;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Sorting Option
  const [sortBy, setSortBy] = useState<'default' | 'rating' | 'price' | 'alphabet' | 'south-to-north' | 'north-to-south' | 'east-to-west' | 'west-to-east'>('default');

  // Selected campground highlight trigger
  const [selectedCampgroundId, setSelectedCampgroundId] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // User Geolocation Coordinates (Defaults to Zurich, Switzerland to calculate immediately)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>(() => ({ lat: 47.3769, lng: 8.5417 }));

  // drivingTimes cache map (stored in localStorage)
  const [drivingTimes, setDrivingTimes] = useState<Record<string, { duration: string; distance: string; isEstimated: boolean; cacheKey?: string }>>(() => {
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
      let updated = false;
      const nextTimes = { ...drivingTimes };

      for (const camp of campsites) {
        if (!active) break;

        const lat = camp.latitude;
        const lng = camp.longitude;

        if (lat === null || lng === null) continue;

        const cacheKey = `${userCoords.lat.toFixed(4)},${userCoords.lng.toFixed(4)}_to_${lat.toFixed(4)},${lng.toFixed(4)}`;
        if (nextTimes[camp.id] && nextTimes[camp.id].cacheKey === cacheKey) {
          continue; // Already computed for these coordinates
        }

        // /api/driving-time requires a backend — use local haversine estimate on static hosts.
        const est = estimateRouteLocal(userCoords.lat, userCoords.lng, lat, lng);
        nextTimes[camp.id] = {
          duration: est.duration,
          distance: est.distance,
          isEstimated: true,
          cacheKey
        };
        updated = true;

        // Throttle to respect servers
        await new Promise((r) => setTimeout(r, 100));
      }

      if (updated && active) {
        setDrivingTimes(nextTimes);
        localStorage.setItem('campground_driving_times_v1', JSON.stringify(nextTimes));
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

        // /api/resolve-coords requires a backend — resolve from map URL or built-in registry instead.
        console.log(`[Background Coordinate Resolve] Resolving ${camp.name}...`);
        const coords = resolveCoordsClient(camp.mapLink || '', camp.name);
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

        // Small throttle
        await new Promise((r) => setTimeout(r, 150));
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
        // /api/scrape-image requires a backend proxy — skip on static hosts.
        console.log(`Skipping webpage image crawl (no backend): ${url}`);
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
            localStorage.setItem('campground_is_demo', 'false');
            localStorage.setItem('campground_has_synced_user_sheet_v1', 'true');
            setIsDemoMode(false);
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
      localStorage.setItem('campground_is_demo', 'false');
      setIsDemoMode(false);
      setSyncSuccess(true);
      setSelectedCampgroundId(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An unexpected error occurred parsing the sheet.');
    } finally {
      setIsLoading(false);
    }
  };

  // Switch back to pre-loaded demo sheet
  const handleLoadDemo = () => {
    setCampsites(DEMO_CAMPSITES);
    setIsDemoMode(true);
    setSheetUrl('');
    localStorage.setItem('campground_cached_data', JSON.stringify(DEMO_CAMPSITES));
    localStorage.setItem('campground_is_demo', 'true');
    localStorage.removeItem('campground_sheet_url');
    setSyncSuccess(false);
    setErrorMsg(null);
    setSelectedCampgroundId(null);
  };

  // Sort campsites depending on selected sort rules
  const sortedCampsites = useMemo(() => {
    const list = [...campsites];
    if (sortBy === 'rating') {
      return list.sort((a, b) => b.numericRating - a.numericRating);
    } else if (sortBy === 'price') {
      return list.sort((a, b) => a.numericPrice - b.numericPrice);
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
  }, [campsites, sortBy]);

  return (
    <div id="campsite-app" className="min-h-screen bg-editorial-bg text-editorial-text font-sans flex flex-col antialiased selection:bg-editorial-moss selection:text-white">
      
      {/* HEADER SECTION */}
      <header className="border-b border-editorial-border py-6 px-4 sm:px-10 shrink-0 relative z-10 bg-editorial-bg text-editorial-text">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-editorial-muted">Mads kuratierte Liste</span>
              <h1 className="text-3xl font-serif italic tracking-tight text-editorial-moss">Camp-Finder</h1>
            </div>
            
            {/* Quick configuration toggle button */}
            <button 
              id="help-btn"
              onClick={() => setShowConfigModal(true)} 
              className="p-2 text-editorial-moss hover:bg-editorial-card rounded-full sm:hidden flex items-center ml-2"
              title="Anleitung anzeigen"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>

          {/* SPREADSHEET URL INTEGRATION BOX */}
          <form onSubmit={handleSheetSync} className="flex-1 max-w-xl w-full flex items-center gap-2">
            <div className="relative flex-1">
              <FileSpreadsheet className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-editorial-muted" />
              <input 
                type="url"
                placeholder="Öffentlich freigegebenen Google-Sheets-Link einfügen..."
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className="w-full text-xs py-2.5 pl-10 pr-4 bg-editorial-card text-editorial-text placeholder-editorial-muted/70 rounded-full border border-editorial-border focus:outline-none focus:border-editorial-moss focus:ring-1 focus:ring-editorial-moss transition-all shadow-inner"
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
              <span className="hidden sm:inline">Laden</span>
            </button>

            {isDemoMode ? (
              <span className="hidden sm:flex items-center gap-1 text-[10px] bg-editorial-card text-editorial-moss px-3 py-1.5 rounded-full border border-editorial-border font-bold tracking-wider shrink-0 uppercase">
                Demo aktiv
              </span>
            ) : (
              <button 
                type="button" 
                onClick={handleLoadDemo}
                className="hidden sm:flex items-center gap-1 text-[10px] bg-editorial-bg hover:bg-editorial-card text-editorial-moss-dark px-3 py-1.5 rounded-full border border-editorial-border font-bold transition-all"
              >
                Demo laden
              </button>
            )}
          </form>
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
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6 overflow-y-auto">
        
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
              <option value="alphabet">Alphabetisch (A bis Z)</option>
              <option value="south-to-north">︽ Süden nach Norden</option>
              <option value="north-to-south">︾ Norden nach Süden</option>
              <option value="east-to-west">« Osten nach Westen</option>
              <option value="west-to-east">» Westen nach Osten</option>
            </select>
          </div>
        </div>

        {/* CAMPSITE LIST CORES */}
        <div className="flex flex-col gap-4">
          {sortedCampsites.length === 0 ? (
            <div className="bg-editorial-card border border-editorial-border rounded-xl p-12 text-center flex flex-col items-center justify-center font-sans">
              <Compass className="w-10 h-10 text-editorial-muted mb-2 stroke-1 animate-pulse" />
              <h4 className="font-serif italic text-editorial-text text-xl font-bold">Keine Campingplätze vorhanden</h4>
              <p className="text-xs text-[#5C5952] mt-1 max-w-xs">Ihre Liste ist derzeit leer oder das Tabellenformat konnte nicht korrekt ausgelesen werden.</p>
              <button 
                onClick={handleLoadDemo}
                className="mt-4 text-xs bg-editorial-moss text-white font-bold uppercase tracking-widest py-2 px-5 rounded-full hover:bg-editorial-moss-dark transition-all"
              >
                Demo-Plätze laden
              </button>
            </div>
          ) : (
            sortedCampsites.map((camp) => {
              const isSelected = selectedCampgroundId === camp.id;

              return (
                <div 
                  key={camp.id} 
                  id={`camp-card-${camp.id}`}
                  onClick={() => setSelectedCampgroundId(isSelected ? null : camp.id)}
                  className={`bg-editorial-card border text-left rounded-xl overflow-hidden shadow-xs transition-all duration-300 hover:shadow-md cursor-pointer flex flex-col ${
                    isSelected 
                    ? 'border-editorial-moss ring-1 ring-editorial-moss ring-offset-[1px]' 
                    : 'border-editorial-border hover:border-editorial-muted'
                  }`}
                >
                  
                  {/* Primary Horizontal Profile Frame */}
                  <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-editorial-border min-h-[144px]">
                    
                    {/* Left Thumbnail Photo */}
                    <div className="md:w-1/4 h-36 md:h-auto overflow-hidden relative shrink-0 bg-editorial-border">
                      <img 
                        src={getCampImage(camp, scrapedImages)} 
                        alt={camp.name} 
                        className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500 animate-fade-in"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
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

                            {/* Driving Time Element right underneath the title */}
                            {(() => {
                              const timeInfo = drivingTimes[camp.id];
                              if (!timeInfo) {
                                if (camp.latitude !== null && camp.longitude !== null) {
                                  return (
                                    <div className="flex items-center gap-1.5 text-[10px] text-[#8C8880] font-mono mt-1 font-semibold">
                                      <Car className="w-3 h-3 shrink-0" />
                                      <span>Fahrzeit wird berechnet...</span>
                                    </div>
                                  );
                                }
                                return null;
                              }

                              return (
                                <div className="flex items-center gap-1.5 text-[10px] text-editorial-moss font-mono mt-1 font-bold flex-wrap">
                                  <div className="flex items-center gap-1 bg-[#F3F5F3] border border-editorial-border/60 text-editorial-moss px-2 py-0.5 rounded-md">
                                    <Car className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                                    <span>{timeInfo.duration} Fahrzeit</span>
                                  </div>
                                  <span className="text-editorial-muted/80 text-[9px] font-sans font-medium">
                                    ({timeInfo.distance}{timeInfo.isEstimated ? ' Luftlinie-Schätzung' : ' via Google Maps'})
                                  </span>
                                </div>
                              );
                            })()}
                            
                            {camp.comments && camp.comments.trim() ? (
                              <p className="text-xs text-[#5C5952] line-clamp-3 mt-1.5 leading-relaxed font-sans font-medium italic">
                                "{camp.comments}"
                              </p>
                            ) : null}
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

                    {/* Right action block */}
                    <div className="md:w-28 bg-[#FAF9F6] p-3 flex md:flex-col justify-between md:justify-center items-center gap-2 shrink-0">
                      <div className="text-xs text-editorial-moss font-bold shrink-0 flex items-center gap-1 self-end md:self-center">
                        <span className="text-[10px] md:text-xs">{isSelected ? 'Zuklappen' : 'Details'}</span>
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                      </div>
                    </div>

                  </div>

                  {/* EXPANDABLE COLLAPSIBLE DRAWER FOR EXTRA COLUMNS & RECORDS */}
                  {isSelected && (
                    <div className="bg-[#FAF9F6] border-t border-editorial-border p-5 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
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
                              <div className="bg-[#F2F0EA] p-4 rounded-xl border border-editorial-border font-sans">
                                <span className="text-[10px] font-bold text-editorial-muted uppercase block tracking-wider">{mapKey}</span>
                                {mapVal ? (
                                  <a 
                                    href={mapVal.startsWith('http') ? mapVal : `https://${mapVal}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-xs text-editorial-moss hover:underline font-semibold break-all flex items-center gap-1.5 mt-1.5"
                                  >
                                    <Navigation className="w-3.5 h-3.5 shrink-0" />
                                    <span>Google Maps</span>
                                  </a>
                                ) : (
                                  <span className="text-xs text-editorial-muted italic block mt-1.5">Keine Karte hinterlegt</span>
                                )}
                              </div>

                              {/* URL Website Block */}
                              <div className="bg-[#F2F0EA] p-4 rounded-xl border border-editorial-border font-sans">
                                <span className="text-[10px] font-bold text-editorial-muted uppercase block tracking-wider">{urlKey}</span>
                                {urlVal ? (
                                  <a 
                                    href={urlVal.startsWith('http') ? urlVal : `https://${urlVal}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-xs text-editorial-moss hover:underline font-semibold break-all flex items-center gap-1.5 mt-1.5"
                                  >
                                    <Info className="w-3.5 h-3.5 shrink-0" />
                                    <span>Pin Camp</span>
                                  </a>
                                ) : (
                                  <span className="text-xs text-editorial-muted italic block mt-1.5">Keine Website hinterlegt</span>
                                )}
                              </div>
                            </div>
                            <CampgroundDetailImages url={urlVal} />
                          </>
                        );
                      })()}
                      
                      <div className="flex justify-end mt-4">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCampgroundId(null);
                          }}
                          className="bg-[#EAE8E0] hover:bg-[#DEDCD2] text-editorial-text font-bold text-xs py-2 px-5 rounded-full transition-all"
                        >
                          Details zuklappen
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>
      </main>

      {/* OFFLINE STATUS BORDER BOX */}
      <div className="max-w-4xl w-full mx-auto px-4 mb-6 mt-2">
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
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 font-sans">
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
                  <li>Kopieren Sie diesen Link und fügen Sie ihn direkt in das Eingabefeld oben im Camping-Register ein!</li>
                </ol>
              </div>

              <div className="bg-editorial-bg border border-editorial-border p-3.5 rounded-lg flex items-start gap-2.5 font-sans">
                <Info className="w-4 h-4 text-editorial-moss shrink-0 mt-0.5" />
                <div className="text-editorial-text">
                  <strong className="text-editorial-moss block mb-0.5">Keine eigene Tabelle bereit?</strong>
                  Kein Problem! Die App ist bereits mit fünf wunderschönen Demo-Campingplätzen vorinstalliert. Nutzen Sie einfach den **Demo aktiv** Modus, um Ausstattungen, automatische Fahrtzeiten und die Interaktionsfunktionen risikofrei auszuprobieren!
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
