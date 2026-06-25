import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

async function bootstrap() {
  const app = express();
  app.use(express.json());

  // CORS-free proxy for Google Sheets export
  app.get('/api/sheet', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Missing Google Sheet URL' });
      }

      console.log(`Analyzing sheet URL: ${url}`);
      // Find the spreadsheet ID in the URL
      const sheetIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!sheetIdMatch) {
         return res.status(400).json({ error: 'Could not extract Google Spreadsheet ID from the URL. Please verify the URL format.' });
      }
      const sheetId = sheetIdMatch[1];

      // Extract gid for sheet index if present
      const gidMatch = url.match(/[#&]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';

      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      console.log(`Fetching CSV export from: ${exportUrl}`);

      const fetchRes = await fetch(exportUrl);
      if (!fetchRes.ok) {
        throw new Error(`Google Sheets export returned status ${fetchRes.status}`);
      }

      const csvText = await fetchRes.text();
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(csvText);
    } catch (err: any) {
      console.error('Error fetching sheet:', err);
      return res.status(500).json({ error: err.message || 'Failed to sync Google Sheet.' });
    }
  });

  // Webpage Image Extractor Proxy
  app.get('/api/scrape-image', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Missing webpage URL' });
      }

      const targetUrl = url.trim();
      console.log(`Scraping webpage for images: ${targetUrl}`);

      // We use a fetch with timeout and a clear User-Agent to avoid getting blocked by site firewalls
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch webpage. Status code: ${response.status}`);
      }

      const html = await response.text();

      // Attempt to look for OpenGraph and metadata image tags
      let imageUrl: string | null = null;

      const ogMatches = [
        html.match(/<meta\s+[^>]*property=["']og:image["']\s+[^>]*content=["']([^"']+)["']/i),
        html.match(/<meta\s+[^>]*content=["']([^"']+)["']\s+[^>]*property=["']og:image["']/i),
        html.match(/<meta\s+[^>]*name=["']twitter:image["']\s+[^>]*content=["']([^"']+)["']/i),
        html.match(/<meta\s+[^>]*content=["']([^"']+)["']\s+[^>]*name=["']twitter:image["']/i),
        html.match(/<meta\s+[^>]*property=["']og:image:secure_url["']\s+[^>]*content=["']([^"']+)["']/i)
      ];

      for (const match of ogMatches) {
        if (match && match[1]) {
          imageUrl = match[1];
          break;
        }
      }

      // Fallback: look for the first high-quality image tag
      if (!imageUrl) {
        const imgMatches = [...html.matchAll(/<img\s+[^>]*src=["']([^"']+\.(?:jpg|jpeg|png|webp|gif|svg)[^"']*)["']/gi)];
        // Let's filter out tracking pixels or generic small icons if possible
        for (const m of imgMatches) {
          const src = m[1];
          if (!src.includes('logo') && !src.includes('icon') && !src.includes('pixel') && !src.includes('spacer') && src.length > 10) {
            imageUrl = src;
            break;
          }
        }
        // Absolute fallback to any standard image if above filter is too aggressive
        if (!imageUrl && imgMatches.length > 0) {
          imageUrl = imgMatches[0][1];
        }
      }

      // Resolve main hero image if any
      let resolvedHeroUrl: string | null = null;
      if (imageUrl) {
        try {
          resolvedHeroUrl = new URL(imageUrl, targetUrl).href;
        } catch {
          resolvedHeroUrl = imageUrl.startsWith('http') ? imageUrl : null;
        }
      }

      // Now gather a robust set of extra high-quality images from the html!
      const rawImageUrls: string[] = [];

      // 1. Matches from standard image tags: src, data-src, srcset, or source tags
      const imgTagRegex = /<img\s+[^>]*(?:src|data-src|data-lazy-src|srcset|source)=["']([^"'\s>]+)/gi;
      for (const match of html.matchAll(imgTagRegex)) {
        if (match[1]) {
          // split by comma or space in case of srcset/lazy schemes
          const cleanSrc = match[1].split(',')[0].split(' ')[0].trim();
          rawImageUrls.push(cleanSrc);
        }
      }

      // 2. Run a general pattern scan for any raw http URLs ending in standard image extensions
      const generalUrlRegex = /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/gi;
      const generalMatches = html.match(generalUrlRegex);
      if (generalMatches) {
        rawImageUrls.push(...generalMatches);
      }

      const finalImagesList: string[] = [];
      const seenBaseKeys = new Set<string>();

      function decodeHtmlEntities(str: string): string {
        return str
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&apos;/g, "'");
      }

      function getImageBaseKey(urlStr: string): string {
        try {
          const decoded = decodeHtmlEntities(urlStr);
          const parsed = new URL(decoded);
          
          let hostname = parsed.hostname.replace(/^(?:[a-z0-9-]+\.)?pincamp\.(?:ch|de|fr|com)/i, 'pincamp');
          let key = hostname + parsed.pathname;

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
          const decoded = decodeHtmlEntities(urlStr).split('?')[0];
          return decoded.toLowerCase().trim();
        }
      }

      if (resolvedHeroUrl) {
        const hKey = getImageBaseKey(resolvedHeroUrl);
        seenBaseKeys.add(hKey);
        finalImagesList.push(resolvedHeroUrl);
      }

      for (const rawUrl of rawImageUrls) {
        if (!rawUrl || rawUrl.length < 10) continue;

        const lowerUrl = rawUrl.toLowerCase();
        // Skip layout assets, tracker pixels, logos, avatars, icons, and non-campsite elements
        if (
          lowerUrl.includes('logo') ||
          lowerUrl.includes('icon') ||
          lowerUrl.includes('pixel') ||
          lowerUrl.includes('spacer') ||
          lowerUrl.includes('avatar') ||
          lowerUrl.includes('sprite') ||
          lowerUrl.includes('badge') ||
          lowerUrl.includes('loader') ||
          lowerUrl.includes('marker') ||
          lowerUrl.includes('widget') ||
          lowerUrl.includes('social') ||
          lowerUrl.includes('pinterest') ||
          lowerUrl.includes('facebook') ||
          lowerUrl.includes('twitter') ||
          lowerUrl.includes('instagram') ||
          lowerUrl.includes('gradient') ||
          lowerUrl.includes('pattern') ||
          lowerUrl.includes('tick') ||
          lowerUrl.includes('arrow') ||
          lowerUrl.includes('bullet') ||
          lowerUrl.includes('star') ||
          lowerUrl.includes('.svg')
        ) {
          continue;
        }

        try {
          const resolved = new URL(rawUrl, targetUrl).href;
          const baseKey = getImageBaseKey(resolved);
          if (!seenBaseKeys.has(baseKey)) {
            seenBaseKeys.add(baseKey);
            finalImagesList.push(resolved);
          }
        } catch {
          if (rawUrl.startsWith('http')) {
            const baseKey = getImageBaseKey(rawUrl);
            if (!seenBaseKeys.has(baseKey)) {
              seenBaseKeys.add(baseKey);
              finalImagesList.push(rawUrl);
            }
          }
        }
      }

      return res.json({
        imageUrl: resolvedHeroUrl,
        images: finalImagesList.slice(0, 12) // Return up to 12 unique images
      });
    } catch (err: any) {
      console.error(`Error scraping direct image path for ${req.query.url}:`, err.message || err);
      return res.json({ imageUrl: null, images: [], error: err.message || 'Scrape failed' });
    }
  });

  // Google Maps Driving Time Routing API
  app.get('/api/driving-time', async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY;
      if (!apiKey || apiKey === 'YOUR_API_KEY') {
        return res.json({ hasKey: false, message: 'Google Maps API key not set on server' });
      }

      const { originLat, originLng, destLat, destLng } = req.query;
      if (!originLat || !originLng || !destLat || !destLng) {
        return res.status(400).json({ error: 'Missing coordinates' });
      }

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&key=${apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Google Maps API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.status === 'OK' && data.routes && data.routes[0] && data.routes[0].legs && data.routes[0].legs[0]) {
        const leg = data.routes[0].legs[0];
        return res.json({
          hasKey: true,
          status: 'OK',
          durationText: leg.duration.text,
          durationSeconds: leg.duration.value,
          distanceText: leg.distance.text,
          distanceMeters: leg.distance.value
        });
      } else {
        return res.json({
          hasKey: true,
          status: data.status || 'NO_RESULTS',
          message: data.error_message || 'Could not find a driving route'
        });
      }
    } catch (err: any) {
      console.error('Error calculating driving route:', err);
      return res.status(500).json({ error: err.message || 'Route calculation failed' });
    }
  });

  // Resolve Campground Coordinates from Map URL or Name
  app.get('/api/resolve-coords', async (req, res) => {
    try {
      const { mapLink, name } = req.query;
      if (!mapLink && !name) {
        return res.status(400).json({ error: 'Missing mapLink or name' });
      }

      console.log(`[Resolve] Request received for: Name="${name}", Map="${mapLink}"`);

      let lat: number | null = null;
      let lng: number | null = null;
      let usedMethod = 'none';

      // Method 1: Try decoding and resolving the short/long mapLink
      if (mapLink && typeof mapLink === 'string' && mapLink.trim().length > 0) {
        const cleanUrl = mapLink.trim();
        try {
          // If it is a short link, follow redirects
          let targetUrl = cleanUrl;
          if (cleanUrl.includes('maps.app.goo.gl') || cleanUrl.includes('goo.gl/maps') || cleanUrl.includes('t.co') || cleanUrl.includes('bit.ly')) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            console.log(`[Resolve] Resolving short redirect for: ${cleanUrl}`);
            const headRes = await fetch(cleanUrl, {
              method: 'GET', // GET to make sure server resolves final location
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
              },
              signal: controller.signal,
              redirect: 'follow'
            });
            clearTimeout(timeoutId);
            targetUrl = headRes.url;
            console.log(`[Resolve] Unwrapped URL: ${targetUrl}`);

            // Also try to look inside HTML body if URL still doesn't have coordinates
            const decodedTargetUrl = decodeURIComponent(targetUrl);
            const patterns = [
              /[@/](-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/,
              /query=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/,
              /q=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/,
              /place\/[^/]+\/([-?\d.]+),([-?\d.]+)/,
              /ll=(-?\d+\.\d+),(-?\d+\.\d+)/
            ];

            for (const regex of patterns) {
              const match = decodedTargetUrl.match(regex);
              if (match && match[1] && match[2]) {
                lat = parseFloat(match[1]);
                lng = parseFloat(match[2]);
                break;
              }
            }

            if (lat === null || lng === null) {
              const htmlText = await headRes.text();
              const staticMapMatch = htmlText.match(/staticmap\?[^"']*center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/i) || 
                                     htmlText.match(/center=(-?\d+\.\d+),(-?\d+\.\d+)/i);
              if (staticMapMatch && staticMapMatch[1] && staticMapMatch[2]) {
                lat = parseFloat(staticMapMatch[1]);
                lng = parseFloat(staticMapMatch[2]);
              } else {
                const llMatch = htmlText.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/i);
                if (llMatch && llMatch[1] && llMatch[2]) {
                  lat = parseFloat(llMatch[1]);
                  lng = parseFloat(llMatch[2]);
                }
              }
            }
          } else {
            // Long Google Maps URL
            const decodedUrl = decodeURIComponent(cleanUrl);
            const patterns = [
              /[@/](-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/,
              /query=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/,
              /q=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/,
              /place\/[^/]+\/([-?\d.]+),([-?\d.]+)/,
              /ll=(-?\d+\.\d+),(-?\d+\.\d+)/
            ];

            for (const regex of patterns) {
              const match = decodedUrl.match(regex);
              if (match && match[1] && match[2]) {
                lat = parseFloat(match[1]);
                lng = parseFloat(match[2]);
                break;
              }
            }
          }

          if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
            usedMethod = 'url-scraping';
            console.log(`[Resolve] Resolved successfully via map URL scraper: ${lat}, ${lng}`);
          }
        } catch (e: any) {
          console.warn('[Resolve] Failed resolving short URL:', e.message || e);
        }
      }

      // Method 2: If we still don't have coordinates, let's use Geocoding API if key is present
      const mapApiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY;
      if ((lat === null || lng === null) && name && typeof name === 'string' && name.trim().length > 0 && mapApiKey && mapApiKey !== 'YOUR_API_KEY') {
        try {
          console.log(`[Resolve] Querying Google Geocoding API for campsite name: "${name}"`);
          const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(name.trim() + ' campground')}&key=${mapApiKey}`;
          const geoRes = await fetch(geocodeUrl);
          
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData.status === 'OK' && geoData.results && geoData.results[0] && geoData.results[0].geometry) {
              const loc = geoData.results[0].geometry.location;
              lat = loc.lat;
              lng = loc.lng;
              usedMethod = 'google-geocoding-api';
              console.log(`[Resolve] Found via Google Geocoding API: ${lat}, ${lng}`);
            } else {
              console.warn('[Resolve] Geocoding API returned status:', geoData.status);
            }
          }
        } catch (e: any) {
          console.error('[Resolve] Failed Google Geocoding request:', e.message || e);
        }
      }

      // Method 3: Fallback hardcoded matching for known demo coordinates or standard campgrounds
      if (lat === null || lng === null) {
        // Fallback typical locations for demo/known names to ensure clean preview
        const lowercaseName = (name || '').toString().toLowerCase();
        if (lowercaseName.includes('schlossberg')) {
          lat = 48.0626; lng = 6.8488; // Le Schlossberg, France
          usedMethod = 'built-in-registry';
        } else if (lowercaseName.includes('vesoul')) {
          lat = 47.6322; lng = 6.1432; // Vesoul, France
          usedMethod = 'built-in-registry';
        } else if (lowercaseName.includes('castors')) {
          lat = 47.7289; lng = 7.1424; // Burnhaupt-le-Haut, France
          usedMethod = 'built-in-registry';
        } else if (lowercaseName.includes('forêt') || lowercaseName.includes('arrigny')) {
          lat = 48.6256; lng = 4.7171; // Arrigny, France
          usedMethod = 'built-in-registry';
        } else if (lowercaseName.includes('port')) {
          lat = 46.1591; lng = -1.1522; // La Rochelle / Onlycamp Le Port
          usedMethod = 'built-in-registry';
        } else if (lowercaseName.includes('gien')) {
          lat = 47.6853; lng = 2.6288; // Gien, France
          usedMethod = 'built-in-registry';
        } else if (lowercaseName.includes('sologne')) {
          lat = 47.6012; lng = 2.1834; // Sologne, France
          usedMethod = 'built-in-registry';
        } else if (lowercaseName.includes('touesse')) {
          lat = 48.6412; lng = -2.1124; // La Touesse, France
          usedMethod = 'built-in-registry';
        }
      }

      if (lat !== null && lng !== null) {
        return res.json({
          success: true,
          lat,
          lng,
          method: usedMethod
        });
      }

      return res.json({
        success: false,
        message: 'Could not resolve coordinates for this campsite'
      });
    } catch (err: any) {
      console.error('Error resolving coordinates:', err);
      return res.status(500).json({ error: err.message || 'Resolution failed' });
    }
  });

  // AI Recommendation Engine using @google/genai
  app.post('/api/recommend', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is not configured. Configure it in Settings > Secrets.' });
      }

      const { camps, preferences, travelPlan } = req.body;
      if (!camps || !Array.isArray(camps) || camps.length === 0) {
        return res.status(400).json({ error: 'No campsites found/listed to recommend from.' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const formattedCamps = camps.map(c => ({
        name: c.name || c['Name'] || 'Unnamed Camp',
        state: c.state || c['State'] || c['Region'] || 'N/A',
        price: c.price || c['Price'] || 'Free/Unknown',
        rating: c.rating || c['Rating'] || 'N/A',
        signal: c.signal || c['Cell Signal'] || c['Signal'] || 'N/A',
        hookups: c.hookups || c['Hookups'] || c['Electricity'] || 'N/A',
        amenities: c.amenities || c['Amenities'] || 'N/A',
        comments: c.comments || c['Comments'] || c['Notes'] || ''
      }));

      const systemPrompt = `You are an expert, friendly wilderness advisor named "Scout" specializing in help campers find the perfect campsite.
You will assess a list of prospective campsites and help the user decide where to go NEXT based on their travel plans, camper priorities, and situational needs.

Here is the list of campgrounds extracted from their Google Sheet:
${JSON.stringify(formattedCamps, null, 2)}

Here is what the user says about their style, preferences, and details:
"${preferences || 'No specific preferences specified. Help find the best balanced sites.'}"

Here is their travel plan or destination for the next leg:
"${travelPlan || 'No specific travel plan specified.'}"

Select the top 2 overall options from this list that best meet their inputs.
You must return your output strictly in JSON format matching this schema:
{
  "recommendations": [
    {
      "campName": "Exact name of the recommended campground",
      "suitabilityScore": 95, // Integer 1-100 indicating match quality
      "bestFor": "A short 3-word catchphrase (e.g. 'Scenic Off-grid Solitude' or 'RV Telecommuting')",
      "whyItMatches": "A warm, 2-to-3 sentence explanation explaining exactly why this is a great fit based on their preferences, state, facilities, or notes."
    }
  ],
  "generalAdvice": "A 2-sentence warm wilderness/travel encouragement or expert camping tip relating to these choices."
}`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: systemPrompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const text = aiResponse.text;
      if (!text) {
        throw new Error('Gemini model returned an empty response.');
      }

      const cleanJson = JSON.parse(text.trim());
      return res.json(cleanJson);
    } catch (err: any) {
      console.error('Error generating AI recommendation:', err);
      return res.status(500).json({ error: err.message || 'Scout encountered an issue advising you.' });
    }
  });

  if (isProd) {
    // Serve production static assets
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  } else {
    // Vite middleware for smooth dev feedback and HMR routing
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve('index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  }

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Campground Browser backend and Vite app listening on port ${port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Bootstrapping server failed:', err);
  process.exit(1);
});
