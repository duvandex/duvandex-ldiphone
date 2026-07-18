import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Lazy-loaded Gemini Client to prevent crash on startup if key is missing
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings -> Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
    });
  }
  return aiClient;
}

// Fallback logic to parse search query when Gemini API reaches its daily quota limits
function fallbackParseQuery(query: string) {
  // Extract collector card number if present (e.g., 199/165 or GG44/GG70 or TG12)
  const cardNumberRegex = /\b(\d+\/\d+|[a-zA-Z]+\d+\/[a-zA-Z]+\d+|[a-zA-Z]{1,3}\d+)\b/;
  const matchCardNumber = query.match(cardNumberRegex);
  const cardNumber = matchCardNumber ? matchCardNumber[0] : "";

  let cleanedName = query;
  if (cardNumber) {
    cleanedName = cleanedName.replace(cardNumber, "");
  }

  // Clean and capitalize the remaining words to get a neat name
  cleanedName = cleanedName
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  const isSealed = /box|booster|etb|upc|deck|bundle|display|pack|tin/i.test(query);

  return {
    type: isSealed ? 'sealed' : 'card',
    name: cleanedName || query,
    set: isSealed ? "Sealed Product / Promo" : "TCG Expansion",
    cardNumber: cardNumber || "",
    language: "Inglés",
    rarity: isSealed ? "Sealed Product" : "Rare",
    marketPrice: 5.00, // Safe default fallback value
    collectrPrice: null,
    suggestedImageUrl: "https://images.pokemontcg.io/logo.png",
    imageUrl: "https://images.pokemontcg.io/logo.png",
    confidenceScore: 0.2,
    reasoning: "⚠️ Límite de cuota de IA alcanzado. Se usó la extracción automática local. ¡Edita los detalles y pon el precio real!"
  };
}

// Fallback logic when photo scan fails due to Gemini API limits
function fallbackParseScan() {
  return {
    type: 'card',
    name: "Carta Escaneada",
    set: "Expansión Desconocida",
    cardNumber: "",
    language: "Inglés",
    rarity: "Rare",
    marketPrice: 1.00,
    collectrPrice: null,
    suggestedImageUrl: "https://images.pokemontcg.io/logo.png",
    imageUrl: "https://images.pokemontcg.io/logo.png",
    confidenceScore: 0.1,
    reasoning: "⚠️ Límite de cuota de IA alcanzado. No pudimos procesar la imagen con Inteligencia Artificial. Se creó una plantilla para que ingreses los datos manualmente."
  };
}

// Fetch market price from the Collectr API using COLLECTR_API_KEY
async function getCollectrPrice(name: string, set: string, type: 'card' | 'sealed'): Promise<number | null> {
  const apiKey = process.env.COLLECTR_API_KEY;
  if (!apiKey) {
    console.log("[Collectr] No COLLECTR_API_KEY env variable found, skipping Collectr pricing.");
    return null;
  }

  try {
    const searchQuery = `${name} ${set}`.trim();
    // Use the official endpoint format /v1/products/search
    const url = `https://getcollectr.com/api/v1/products/search?q=${encodeURIComponent(searchQuery)}`;
    
    console.log(`[Collectr] Querying official Collectr API for: "${searchQuery}" (${type})`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'x-api-key': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'aistudio-build'
      }
    });

    if (!response.ok) {
      console.warn(`[Collectr] API error response: ${response.status} ${response.statusText}`);
      // Fallback endpoint pattern
      const fallbackUrl = `https://getcollectr.com/api/products?search=${encodeURIComponent(searchQuery)}`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'x-api-key': apiKey,
          'Accept': 'application/json'
        }
      });
      if (!fallbackRes.ok) {
        return null;
      }
      const data = await fallbackRes.json() as any;
      return parseCollectrResponse(data, name, type);
    }

    const data = await response.json() as any;
    return parseCollectrResponse(data, name, type);
  } catch (error) {
    console.error("[Collectr] Error fetching from Collectr API:", error);
    return null;
  }
}

function parseCollectrResponse(data: any, targetName: string, type: 'card' | 'sealed'): number | null {
  if (!data) return null;
  
  let products: any[] = [];
  if (Array.isArray(data)) {
    products = data;
  } else if (data.data && Array.isArray(data.data)) {
    products = data.data;
  } else if (data.products && Array.isArray(data.products)) {
    products = data.products;
  } else if (data.results && Array.isArray(data.results)) {
    products = data.results;
  } else if (typeof data.price === 'number') {
    return data.price;
  } else if (typeof data.marketPrice === 'number') {
    return data.marketPrice;
  }

  if (products.length === 0) {
    return null;
  }

  const lowerTarget = targetName.toLowerCase();
  const match = products.find(p => p.name?.toLowerCase().includes(lowerTarget)) || products[0];
  
  if (match) {
    if (typeof match.price === 'number') return match.price;
    if (typeof match.marketPrice === 'number') return match.marketPrice;
    if (typeof match.market_price === 'number') return match.market_price;
    
    if (match.prices) {
      if (typeof match.prices.market === 'number') return match.prices.market;
      if (typeof match.prices.raw === 'number') return match.prices.raw;
      if (typeof match.prices.average === 'number') return match.prices.average;
      if (typeof match.prices.tcgplayer === 'number') return match.prices.tcgplayer;
    }
  }

  return null;
}

const app = express();
export default app;

// Set payload limits for base64 image transfers
app.use(express.json({ limit: "25mb" }));

  // API Route for scanning/identifying Pokemon TCG items
  app.post("/api/pokemon/scan", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image) {
        return res.status(400).json({ error: "No image data provided" });
      }

      // Sanitize base64 image data to avoid "The string did not match the expected pattern" error
      let cleanedImage = String(image).trim();
      
      // 1. Decode URL encoding first (if present) before any other cleaning
      if (cleanedImage.includes("%")) {
        try {
          cleanedImage = decodeURIComponent(cleanedImage);
        } catch (e) {
          console.warn("Failed to decode URL-encoded base64 image:", e);
        }
      }

      // 2. Strip data URL prefix if present (e.g. data:image/jpeg;base64,)
      const commaIndex = cleanedImage.indexOf(",");
      if (commaIndex !== -1) {
        cleanedImage = cleanedImage.substring(commaIndex + 1);
      }

      // 3. Strip any and all characters that are not valid base64 characters (including whitespace/newlines)
      cleanedImage = cleanedImage.replace(/[^A-Za-z0-9+/=]/g, "");

      // 4. Ensure proper base64 padding
      const padLength = (4 - (cleanedImage.length % 4)) % 4;
      if (padLength > 0) {
        cleanedImage += "=".repeat(padLength);
      }

      // Initialize Gemini safely
      const ai = getAiClient();

      // Format image for Gemini
      const imagePart = {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: cleanedImage,
        },
      };

      const promptPart = {
        text: `You are a professional Pokemon TCG and sealed product collector expert.
Analyze the provided image of a Pokemon TCG card or sealed product (such as an Elite Trainer Box (ETB), Ultra Premium Collection (UPC), Booster Box, Booster Pack, Blister, Tin, or Special Collection Box).

Your tasks:
1. Identify whether it is a single card or a sealed product (ETB, booster box, booster pack, UPC, tin, etc.).
2. Extract the official item name, the set name, the card number (e.g. "151/165" or "GG44/GG70") if it is a card, and its rarity.
3. Identify the language of the card or product if discernable from the text, otherwise default to "Inglés" (e.g., 'Inglés', 'Español', 'Japonés', 'Alemán', 'Francés', 'Italiano', 'Coreano', 'Chino').
4. Determine the current TCGplayer market price in USD based on current trends, historical value, and the language of the item. Be as accurate as possible for the identified item, considering that different languages have different market values (e.g. Japanese or Spanish cards are priced differently than English cards).
5. Provide a representative high-quality suggested image URL if possible (e.g. from official sources or typical pokemon assets, or a fallback. Use a valid public link or suggest an official-looking CDN URL, or return empty/placeholder string if absolutely none).
6. Output the result in the requested JSON structure. Keep description brief but highly accurate.`,
      };

    // Attempt scanning using allowed Gemini models with fallback
    const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    let lastError: any = null;
    let responseText = "";

    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting scan with model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: { parts: [imagePart, promptPart] },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                name: { type: Type.STRING },
                set: { type: Type.STRING },
                cardNumber: { type: Type.STRING },
                language: { type: Type.STRING },
                rarity: { type: Type.STRING },
                marketPrice: { type: Type.NUMBER },
                suggestedImageUrl: { type: Type.STRING },
                confidenceScore: { type: Type.NUMBER },
                reasoning: { type: Type.STRING }
              },
              required: ["type", "name", "set", "marketPrice", "confidenceScore", "reasoning", "language"]
            }
          }
        });

        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Scan failed with model ${modelName}:`, err.message || err);
        lastError = err;
        // Optimization: Don't retry same model on Vercel to save time, move to next model
      }
    }

    if (!responseText) {
      return res.status(500).json({ error: "No se pudo analizar la imagen. " + (lastError?.message || "Intenta de nuevo.") });
    }

    const scanResult = JSON.parse(responseText.trim());
    const colPrice = await getCollectrPrice(scanResult.name, scanResult.set, scanResult.type || 'card');
    scanResult.collectrPrice = colPrice;
    res.json(scanResult);
  } catch (error: any) {
    console.error("Critical error in scan:", error);
    res.status(500).json({ error: "Error crítico al procesar el escaneo." });
  }
});

  // Helper function to parse pokemon queries into name and collector number parts
  function parsePokemonQuery(query: string) {
    let name = query.trim();
    let number = "";
    
    // Look for patterns like "199/165" or "092/088" or "GG44/GG70"
    const fractionMatch = query.match(/([a-zA-Z]*\d+)\/([a-zA-Z]*\d+)/);
    if (fractionMatch) {
      number = fractionMatch[1]; // Extract numerator (e.g., "199" or "092")
      name = name.replace(fractionMatch[0], "").trim();
    } else {
      // Look for single numbers at the end, like "Charizard 199"
      const endNumberMatch = query.match(/\b([a-zA-Z]*\d+)\b$/);
      if (endNumberMatch) {
        number = endNumberMatch[1];
        name = name.replace(endNumberMatch[0], "").trim();
      }
    }
    
    return { name, number };
  }

  // Helper function to extract best market price from tcgplayer prices object
  function getBestPrice(tcgplayer: any): number {
    if (!tcgplayer || !tcgplayer.prices) return 0;
    const p = tcgplayer.prices;
    const types = ["normal", "holofoil", "reverseHolofoil", "1stEditionHolofoil", "unlimitedHolofoil"];
    for (const t of types) {
      if (p[t]) {
        if (p[t].market !== undefined && p[t].market !== null) return p[t].market;
        if (p[t].mid !== undefined && p[t].mid !== null) return p[t].mid;
      }
    }
    return 0;
  }

  // Helper function to map common Spanish TCG set names to English set names for the official API
  function translateSpanishQuery(query: string): string {
    let lower = query.toLowerCase();
    
    const setMap: { [key: string]: string } = {
      "fuerzas temporales": "Temporal Forces",
      "llamas obsidianas": "Obsidian Flames",
      "mascarada crepuscular": "Twilight Masquerade",
      "evoluciones celestiales": "Evolving Skies",
      "fallas de la paradoja": "Paradox Rift",
      "fuerzas de la paradoja": "Paradox Rift",
      "chispas de sobretension": "Surging Sparks",
      "chispas de sobretensión": "Surging Sparks",
      "corona estelar": "Stellar Crown",
      "destino de paldea": "Paldean Fates",
      "destinos de paldea": "Paldean Fates",
      "astros brillantes": "Brilliant Stars",
      "origen perdido": "Lost Origin",
      "tempestad plateada": "Silver Tempest",
      "voltaje vivido": "Vivid Voltage",
      "voltaje vívido": "Vivid Voltage",
      "destino oculto": "Hidden Fates",
      "destinos ocultos": "Hidden Fates",
      "camino de campeones": "Champion's Path",
      "camino del campeon": "Champion's Path",
      "fuerza salvaje": "Wild Force",
      "juez cibernetico": "Cyber Judge",
      "juez cibernético": "Cyber Judge",
      "resplandor astral": "Astral Radiance",
      "estilos de combate": "Battle Styles",
      "reino escalofriante": "Chilling Reign",
      "cielos evolutivos": "Evolving Skies",
      "voltaje vibrante": "Vivid Voltage",
      "camino de campeón": "Champion's Path"
    };

    let result = query;
    for (const [es, en] of Object.entries(setMap)) {
      if (lower.includes(es)) {
        const regex = new RegExp(es, "gi");
        result = result.replace(regex, en);
      }
    }
    return result;
  }

  // Shared helper to build official TCG API search query from raw string
  function buildTcgplayerQuery(query: string): string {
    // Translate common Spanish set terms to English first
    const translated = translateSpanishQuery(query);
    
    const { name, number } = parsePokemonQuery(translated);
    let qParts: string[] = [];
    
    if (name) {
      // Split into terms to allow searching words in either card name or set name
      const terms = name.split(/\s+/).filter(t => t.length >= 2);
      if (terms.length > 0) {
        const termsQuery = terms.map(t => {
          const cleanT = t.replace(/["\\\(\)]/g, "");
          return `(name:"*${cleanT}*" OR set.name:"*${cleanT}*")`;
        }).join(" AND ");
        qParts.push(termsQuery);
      } else {
        const cleanName = name.replace(/["\\\(\)]/g, "");
        qParts.push(`(name:"*${cleanName}*" OR set.name:"*${cleanName}*")`);
      }
    }
    
    if (number) {
      qParts.push(`number:"${number}"`);
    }
    
    return qParts.join(" AND ");
  }

  // API Route for real-time Pokémon TCG card suggestions / autocomplete
  app.post("/api/pokemon/suggest", async (req, res) => {
    const { query } = req.body || {};
    try {
      if (!query || query.trim().length < 2) {
        return res.json({ suggestions: [] });
      }

      const isSealed = /box|booster|etb|upc|deck|bundle|display|pack|tin/i.test(query);
      
      if (isSealed) {
        const sealedTerms = [
          "Booster Box Scarlet & Violet 151",
          "Elite Trainer Box Scarlet & Violet 151",
          "Ultra Premium Collection Scarlet & Violet 151",
          "Booster Box Obsidian Flames",
          "Elite Trainer Box Obsidian Flames",
          "Booster Box Paldea Evolved",
          "Elite Trainer Box Paldea Evolved",
          "Booster Box Paradox Rift",
          "Booster Box Temporal Forces",
          "Booster Box Twilight Masquerade",
          "Booster Box Stellar Crown",
          "Booster Box Surging Sparks",
          "Charizard ex Super Premium Collection"
        ];
        const queryLower = query.toLowerCase();
        const matches = sealedTerms
          .filter(t => t.toLowerCase().includes(queryLower))
          .map(t => ({
            id: `sealed-${t.toLowerCase().replace(/\s+/g, "-")}`,
            type: 'sealed',
            name: t,
            set: t.includes("151") ? "151" : (t.includes("Obsidian") ? "Obsidian Flames" : (t.includes("Paldea") ? "Paldea Evolved" : "Pokémon TCG")),
            cardNumber: '',
            rarity: 'Sealed Product',
            marketPrice: t.includes("Booster Box") ? 140.00 : (t.includes("Trainer Box") ? 45.00 : 120.00),
            imageUrl: 'https://images.pokemontcg.io/logo.png',
            suggestedImageUrl: 'https://images.pokemontcg.io/logo.png',
            language: 'Inglés'
          }));
        return res.json({ suggestions: matches.slice(0, 5) });
      }

      const q = buildTcgplayerQuery(query);
      const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=8`;
      
      const tcgApiKey = process.env.POKEMON_TCG_API_KEY;
      const headers: any = { "User-Agent": "aistudio-build" };
      if (tcgApiKey) {
        headers["X-Api-Key"] = tcgApiKey;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const response = await fetch(url, {
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`PokemonTCG API error: ${response.status} ${response.statusText}`);
        return res.json({ suggestions: [] });
      }

      const data = await response.json() as any;
      const cards = data.data || [];

      const suggestions = cards.map((card: any) => {
        const tcgPrice = getBestPrice(card.tcgplayer);
        const img = card.images?.small || card.images?.large || '';
        return {
          id: card.id,
          type: 'card',
          name: card.name,
          set: card.set?.name || 'Unknown Set',
          cardNumber: `${card.number}/${card.set?.printedTotal || ''}`,
          rarity: card.rarity || 'Common',
          marketPrice: tcgPrice || 0.99,
          imageUrl: img,
          suggestedImageUrl: img,
          language: 'Inglés'
        };
      });

      res.json({ suggestions });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error("Autocomplete request timed out");
      } else {
        console.error("Error in autocomplete:", error);
      }
      res.json({ suggestions: [] });
    }
  });

  // API Route for text-based Pokémon TCG items quick search and pricing lookup
  app.post("/api/pokemon/search", async (req, res) => {
    const { query } = req.body || {};
    try {
      if (!query) {
        return res.status(400).json({ error: "No search query provided" });
      }

      // Optimization: Try to be fast to avoid Vercel timeouts (10s limit)
      const isSealed = /box|booster|etb|upc|deck|bundle|display|pack|tin/i.test(query);

      if (!isSealed) {
        const q = buildTcgplayerQuery(query);
        const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=5`;
        
        const tcgApiKey = process.env.POKEMON_TCG_API_KEY;
        const headers: any = { "User-Agent": "aistudio-build" };
        if (tcgApiKey) {
          headers["X-Api-Key"] = tcgApiKey;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // reduced to 4 seconds for faster fallback

        try {
          console.log(`Searching official Pokemon TCG API for card query "${query}":`, url);
          const officialRes = await fetch(url, {
            headers,
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (officialRes.ok) {
            const data = (await officialRes.json()) as any;
            if (data.data && data.data.length > 0) {
              const card = data.data[0];
              const tcgPrice = getBestPrice(card.tcgplayer);
              const img = card.images?.small || card.images?.large || '';
              
              const detectedLanguage = (card.name && /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(card.name)) ? 'Japonés' : 'Inglés';
              
              // If we have a price and it's English, return immediately to save time
              if (tcgPrice > 0 && detectedLanguage === 'Inglés') {
                return res.json({
                  id: card.id,
                  type: 'card',
                  name: card.name,
                  set: card.set?.name || 'Unknown Set',
                  cardNumber: `${card.number}/${card.set?.printedTotal || ''}`,
                  rarity: card.rarity || 'Common',
                  marketPrice: tcgPrice,
                  imageUrl: img,
                  suggestedImageUrl: img,
                  language: detectedLanguage,
                  confidenceScore: 0.95,
                  reasoning: "Encontrado directamente en la base de datos oficial de TCG."
                });
              }
              // Otherwise continue to Gemini for better estimation if needed (but faster)
            }
          }
        } catch (apiErr) {
          console.warn("Official TCG API search failed or timed out, falling back to AI:", apiErr);
        }
      }

      // If TCG API failed, was slow, or we need AI valuation
      const ai = getAiClient();
      // Use faster models first for Vercel
      const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
      let responseText = "";
      let lastError = null;

      for (const modelName of modelsToTry) {
        try {
          console.log(`Searching with model: ${modelName}`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: {
              parts: [{
                text: `Identify and price this Pokémon TCG item: "${query}"
Format response as JSON: { "type": "card"|"sealed", "name": string, "set": string, "cardNumber": string, "rarity": string, "tcgplayerPrice": number, "confidenceScore": number, "reasoning": string, "language": string }`
              }]
            },
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  name: { type: Type.STRING },
                  set: { type: Type.STRING },
                  cardNumber: { type: Type.STRING },
                  rarity: { type: Type.STRING },
                  marketPrice: { type: Type.NUMBER },
                  confidenceScore: { type: Type.NUMBER },
                  reasoning: { type: Type.STRING },
                  language: { type: Type.STRING }
                },
                required: ["type", "name", "set", "marketPrice", "confidenceScore", "reasoning", "language"]
              }
            }
          });

          if (response && response.text) {
            responseText = response.text;
            break;
          }
        } catch (err: any) {
          console.warn(`Model ${modelName} failed:`, err.message || err);
          lastError = err;
          // If quota error, skip to next model immediately
        }
      }

      if (!responseText) {
        // Return 500 so frontend handles it correctly
        return res.status(500).json({ error: "El servicio de IA no está disponible temporalmente. " + (lastError?.message || "Intenta de nuevo.") });
      }

      const searchResult = JSON.parse(responseText.trim());
      const collectrPrice = await getCollectrPrice(searchResult.name, searchResult.set, searchResult.type || 'card');
      searchResult.collectrPrice = collectrPrice;
      res.json(searchResult);
    } catch (error: any) {
      console.error("Critical error in search:", error);
      res.status(500).json({ error: "Ocurrió un error crítico durante la búsqueda." });
    }
  });

async function startServer() {
  const PORT = 3000;
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind to port for local/Cloud Run environments
  if (process.env.VERCEL !== "1") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}

// In Vercel, we don't call listen, but we still need to setup the app
if (process.env.VERCEL === "1") {
  // Setup standard production middlewares for Vercel
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  // Note: We don't need the SPA fallback here as vercel.json handles it,
  // and we don't want it to swallow our API routes if misconfigured.
} else {
  startServer();
}
