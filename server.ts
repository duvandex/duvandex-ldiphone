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
    tcgplayerPrice: 5.00, // Safe default fallback value
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
    tcgplayerPrice: 1.00,
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

async function startServer() {
  const app = express();
  const PORT = 3000;

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

    // Attempt scanning using allowed Gemini models with fallback, retries, and backoff logic
    const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    let lastError: any = null;
    let responseText = "";

    for (const modelName of modelsToTry) {
      // Try each model up to 3 times to mitigate transient 503/UNAVAILABLE errors
      const maxRetries = 3;
      let skipRemainingRetries = false;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Attempting scan with model: ${modelName} (Attempt ${attempt}/${maxRetries})`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts: [imagePart, promptPart] },
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description: "Must be 'card' or 'sealed' depending on whether it is a single card or a sealed product (like ETB, booster box, UPC, tin, booster pack, etc.)",
                  },
                  name: {
                    type: Type.STRING,
                    description: "The official name of the Pokémon card or product (e.g. 'Charizard ex' or '151 Ultra Premium Collection')"
                  },
                  set: {
                    type: Type.STRING,
                    description: "The name of the official TCG set (e.g. 'Scarlet & Violet 151', 'Obsidian Flames')"
                  },
                  cardNumber: {
                    type: Type.STRING,
                    description: "The card collector number (e.g. '199/165', '223/197'). For sealed products, return an empty string or omit."
                  },
                  language: {
                    type: Type.STRING,
                    description: "The language of the card/product (e.g. 'Inglés', 'Español', 'Japonés', 'Alemán', 'Francés', 'Italiano', 'Coreano', 'Chino')"
                  },
                  rarity: {
                    type: Type.STRING,
                    description: "The rarity of the card (e.g. 'Illustration Rare', 'Special Illustration Rare', 'Secret Rare', 'Common', 'Uncommon'). For sealed products, return 'Sealed Product'."
                  },
                  tcgplayerPrice: {
                    type: Type.NUMBER,
                    description: "The current estimated TCGplayer market price in USD as a floating number (e.g. 119.99)."
                  },
                  suggestedImageUrl: {
                    type: Type.STRING,
                    description: "A high-quality direct public URL to the official card art or product image, or a valid representative official image URL, or a placeholder."
                  },
                  confidenceScore: {
                    type: Type.NUMBER,
                    description: "Confidence rating from 0 to 1 of the identification."
                  },
                  reasoning: {
                    type: Type.STRING,
                    description: "A short professional explanation of how the card/product was identified and the pricing source info."
                  }
                },
                required: ["type", "name", "set", "tcgplayerPrice", "confidenceScore", "reasoning", "language"]
              }
            }
          });

          responseText = response.text || "";
          if (responseText) {
            console.log(`Scan successful with model: ${modelName}`);
            break; // Success! Break the retry loop
          }
        } catch (err: any) {
          console.warn(`Scan failed with model ${modelName} on attempt ${attempt}:`, err.message || err);
          lastError = err;

          // Detect 429 Quota Exceeded / RESOURCE_EXHAUSTED / 503 UNAVAILABLE
          const isRetryableError = 
            err.status === "RESOURCE_EXHAUSTED" || 
            err.code === 429 || 
            err.status === 429 ||
            err.code === 503 ||
            err.status === 503 ||
            (err.message && (
              err.message.includes("429") || 
              err.message.includes("503") ||
              err.message.toLowerCase().includes("quota") || 
              err.message.toLowerCase().includes("limit") || 
              err.message.toLowerCase().includes("exhausted") ||
              err.message.toLowerCase().includes("unavailable") ||
              err.message.toLowerCase().includes("busy")
            ));

          if (isRetryableError) {
            if (attempt < maxRetries) {
              // Exponential backoff: 2s, 4s, 8s
              const delay = Math.pow(2, attempt) * 1000;
              console.log(`Retrying model ${modelName} in ${delay}ms...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
              console.warn(`Max retries reached for model ${modelName}. Trying next model.`);
            }
          } else {
            // For other non-retryable errors, skip this model
            console.warn(`Non-retryable error for model ${modelName}. Skipping.`);
            break;
          }
        }
      }
      if (responseText) {
        break; // Success! Break the model loop
      }
    }


      if (!responseText) {
        throw new Error(
          lastError?.message || 
          "El servicio de análisis de Pokémon está experimentando alta demanda en todos los modelos disponibles."
        );
      }

      const scanResult = JSON.parse(responseText.trim());
      const colPrice = await getCollectrPrice(scanResult.name, scanResult.set, scanResult.type || 'card');
      scanResult.collectrPrice = colPrice;
      res.json(scanResult);
    } catch (error: any) {
      console.error("Error in pokemon scan after all fallbacks, sending user manual fallback template:", error);
      const fallbackResult = fallbackParseScan();
      res.json(fallbackResult);
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
            tcgplayerPrice: t.includes("Booster Box") ? 140.00 : (t.includes("Trainer Box") ? 45.00 : 120.00),
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
          tcgplayerPrice: tcgPrice || 0.99,
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

      const isSealed = /box|booster|etb|upc|deck|bundle|display|pack|tin/i.test(query);

      if (!isSealed) {
        const q = buildTcgplayerQuery(query);
        const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=5`;
        
        console.log(`Searching official Pokemon TCG API for card query "${query}":`, url);
        const officialRes = await fetch(url, {
          headers: { "User-Agent": "aistudio-build" }
        });

        if (officialRes.ok) {
          const officialData = await officialRes.json() as any;
          const cards = officialData.data || [];
          if (cards.length > 0) {
            const card = cards[0];
            let tcgPrice = getBestPrice(card.tcgplayer);
            
            console.log(`Found direct card match on official Pokemon TCG API: ${card.name} (${card.id})`);
            
            let detectedLanguage = "Inglés";
            const queryLower = query.toLowerCase();
            if (queryLower.includes("español") || queryLower.includes("spanish")) detectedLanguage = "Español";
            else if (queryLower.includes("japon") || queryLower.includes("japanese")) detectedLanguage = "Japonés";
            else if (queryLower.includes("aleman") || queryLower.includes("german")) detectedLanguage = "Alemán";
            else if (queryLower.includes("frances") || queryLower.includes("french")) detectedLanguage = "Francés";
            else if (queryLower.includes("italian")) detectedLanguage = "Italiano";
            else if (queryLower.includes("corean") || queryLower.includes("korean")) detectedLanguage = "Coreano";
            else if (queryLower.includes("chin") || queryLower.includes("chinese")) detectedLanguage = "Chino";

            let notes = `Identificado exitosamente a través de la API oficial de Pokémon TCG. Expansión: ${card.set?.name}. Precio de mercado de TCGplayer actualizado.`;

            // If the price is 0 (missing in API) or the card language is not English, use Gemini to estimate/adjust the price!
            if (tcgPrice === 0 || detectedLanguage !== "Inglés") {
              try {
                console.log(`Price is 0 or card is non-English (${detectedLanguage}). Consulting Gemini to estimate accurate price...`);
                const ai = getAiClient();
                const response = await ai.models.generateContent({
                  model: "gemini-flash-latest",
                  contents: {
                    parts: [{
                      text: `Actúa como un experto valuador de mercado de Pokémon TCG.
Determina el precio de mercado real estimado en USD para la siguiente carta de Pokémon:
Nombre: ${card.name}
Expansión/Set: ${card.set?.name || 'Perfect Order'}
Número de carta: ${card.number}/${card.set?.printedTotal || ''}
Rareza: ${card.rarity || 'Illustration Rare'}
Idioma de la carta: ${detectedLanguage}

Toma en cuenta que los precios varían significativamente según el idioma (por ejemplo, las cartas en chino, japonés o español suelen tener un valor de mercado diferente al de las cartas en inglés). Si el precio de mercado para este idioma no está disponible, calcula el valor proporcional basado en el mercado internacional actual.

Responde ÚNICAMENTE con un JSON con el formato: { "price": number, "reasoning": string en español }`
                    }]
                  },
                  config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                        price: { type: Type.NUMBER },
                        reasoning: { type: Type.STRING }
                      },
                      required: ["price", "reasoning"]
                    }
                  }
                });

                if (response && response.text) {
                  const resData = JSON.parse(response.text.trim());
                  if (resData.price && resData.price > 0) {
                    tcgPrice = resData.price;
                    notes = `Sincronizado con IA para idioma ${detectedLanguage}: ${resData.reasoning}`;
                    console.log(`Gemini estimated price for ${card.name} (${detectedLanguage}): $${tcgPrice}. Reasoning: ${resData.reasoning}`);
                  }
                }
              } catch (geminiErr) {
                console.warn("Failed to get Gemini price estimation for card:", geminiErr);
              }
            }

            const collectrPrice = await getCollectrPrice(card.name, card.set?.name || '', 'card');

            return res.json({
              type: 'card',
              name: card.name,
              set: card.set?.name || 'Unknown Set',
              cardNumber: `${card.number}/${card.set?.printedTotal || ''}`,
              rarity: card.rarity || 'Common',
              tcgplayerPrice: tcgPrice || 0.99,
              collectrPrice: collectrPrice,
              suggestedImageUrl: card.images?.large || card.images?.small || '',
              imageUrl: card.images?.large || card.images?.small || '',
              confidenceScore: 1.0,
              language: detectedLanguage,
              reasoning: notes
            });
          }
        }
      }

      console.log(`Falling back to Gemini model for search query "${query}"`);
      const ai = getAiClient();

      const promptPart = {
        text: `You are a professional Pokemon TCG and sealed product collector expert.
Analyze the user's query about a Pokemon TCG card or sealed product: "${query}"

Your tasks:
1. Identify whether it is a single card or a sealed product (ETB, booster box, booster pack, UPC, tin, etc.).
2. Determine the exact official item name, the set name, the card number (e.g. "151/165" or "GG44/GG70") if it is a card, and its rarity.
3. Identify the language of the card or product from the query if specified (e.g., if query says "en español", "japanese", "ingles"), otherwise default to "Inglés" (e.g., 'Inglés', 'Español', 'Japonés', 'Alemán', 'Francés', 'Italiano', 'Coreano', 'Chino').
4. Determine the current TCGplayer market price in USD based on current trends, historical value, and the language of the item. Be as accurate as possible for the queried item, considering that different languages have different market values (e.g. Japanese or Spanish cards are priced differently than English cards).
5. Provide a representative high-quality suggested image URL if possible (e.g. from official sources or typical pokemon assets, or a fallback. Use a valid public link or suggest an official-looking CDN URL, or return empty/placeholder string if absolutely none).
6. Output the result in the requested JSON structure. Keep description/reasoning brief but highly accurate.`,
      };

      const modelsToTry = ["gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3.5-flash"];
      let lastError: any = null;
      let responseText = "";

      for (const modelName of modelsToTry) {
        const maxRetries = 3;
        let skipRemainingRetries = false;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`Attempting search with model: ${modelName} (Attempt ${attempt}/${maxRetries})`);
            const response = await ai.models.generateContent({
              model: modelName,
              contents: { parts: [promptPart] },
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      description: "Must be 'card' or 'sealed' depending on whether it is a single card or a sealed product (like ETB, booster box, UPC, tin, booster pack, etc.)",
                    },
                    name: {
                      type: Type.STRING,
                      description: "The official name of the Pokémon card or product (e.g. 'Charizard ex' or '151 Ultra Premium Collection')"
                    },
                    set: {
                      type: Type.STRING,
                      description: "The name of the official TCG set (e.g. 'Scarlet & Violet 151', 'Obsidian Flames')"
                    },
                    cardNumber: {
                      type: Type.STRING,
                      description: "The card collector number (e.g. '199/165', '223/197'). For sealed products, return an empty string or omit."
                    },
                    language: {
                      type: Type.STRING,
                      description: "The language of the card/product (e.g. 'Inglés', 'Español', 'Japonés', 'Alemán', 'Francés', 'Italiano', 'Coreano', 'Chino')"
                    },
                    rarity: {
                      type: Type.STRING,
                      description: "The rarity of the card (e.g. 'Illustration Rare', 'Special Illustration Rare', 'Secret Rare', 'Common', 'Uncommon'). For sealed products, return 'Sealed Product'."
                    },
                    tcgplayerPrice: {
                      type: Type.NUMBER,
                      description: "The current estimated TCGplayer market price in USD as a floating number (e.g. 119.99)."
                    },
                    suggestedImageUrl: {
                      type: Type.STRING,
                      description: "A high-quality direct public URL to the official card art or product image, or a valid representative official image URL, or a placeholder."
                    },
                    confidenceScore: {
                      type: Type.NUMBER,
                      description: "Confidence rating from 0 to 1 of the identification."
                    },
                    reasoning: {
                      type: Type.STRING,
                      description: "A short professional explanation of how the card/product was identified and the pricing source info."
                    }
                  },
                  required: ["type", "name", "set", "tcgplayerPrice", "confidenceScore", "reasoning", "language"]
                }
              }
            });

            if (response && response.text) {
              responseText = response.text;
              console.log(`Search successful with model: ${modelName}`);
              break;
            }
          } catch (err: any) {
            console.warn(`Search failed with model ${modelName} on attempt ${attempt}:`, err.message || err);
            lastError = err;

            const isQuotaError = 
              err.status === "RESOURCE_EXHAUSTED" || 
              err.code === 429 || 
              err.status === 429 ||
              (err.message && (
                err.message.includes("429") || 
                err.message.toLowerCase().includes("quota") || 
                err.message.toLowerCase().includes("limit") || 
                err.message.toLowerCase().includes("exhausted")
              ));

            if (isQuotaError) {
              console.warn(`Quota limit reached for model ${modelName}. Skipping further retries for this model.`);
              skipRemainingRetries = true;
              break;
            }

            if (attempt < maxRetries) {
              const delay = attempt * 1000 + 500;
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }
        }
        if (responseText) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      if (!responseText) {
        throw new Error(
          lastError?.message || 
          "El servicio de búsqueda de Pokémon está experimentando alta demanda."
        );
      }

      const searchResult = JSON.parse(responseText.trim());
      const collectrPrice = await getCollectrPrice(searchResult.name, searchResult.set, searchResult.type || 'card');
      searchResult.collectrPrice = collectrPrice;
      res.json(searchResult);
    } catch (error: any) {
      console.error("Error in pokemon search after all fallbacks, sending user manual fallback query template:", error);
      const fallbackResult = fallbackParseQuery(query);
      res.json(fallbackResult);
    }
  });

  // API Route for bulk Pokémon TCG prices synchronization (Cards and Sealed products)
  app.post("/api/pokemon/sync", async (req, res) => {
    try {
      const { items } = req.body || {};
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "No items provided or invalid format" });
      }

      console.log(`Starting bulk Pokémon TCG synchronization for ${items.length} items...`);
      const updates: any[] = [];

      // 1. Block withCardId: Process cards that have a valid pokemontcg.io card ID
      const withCardId = items.filter(
        (item: any) =>
          item.type === "card" &&
          item.id &&
          !item.id.startsWith("manual-") &&
          item.id.includes("-")
      );

      console.log(`Found ${withCardId.length} card items with valid card ID.`);
      for (const item of withCardId) {
        try {
          const url = `https://api.pokemontcg.io/v2/cards/${item.id}`;
          const response = await fetch(url, {
            headers: { "User-Agent": "aistudio-build" },
          });
          if (response.ok) {
            const data = (await response.json()) as any;
            if (data && data.data) {
              const card = data.data;
              const tcgPrice = getBestPrice(card.tcgplayer);
              
              let finalPrice = tcgPrice;
              let syncNotes = `Sincronizado con la API oficial de Pokémon TCG. Expansión: ${card.set?.name || item.set}.`;
              const itemLang = item.language || "Inglés";

              if (finalPrice === 0 || itemLang !== "Inglés") {
                try {
                  console.log(`Sync card ${item.name} (${itemLang}) has price 0 or is non-English. Calling Gemini to estimate...`);
                  const aiClientInst = getAiClient();
                  const geminiResponse = await aiClientInst.models.generateContent({
                    model: "gemini-flash-latest",
                    contents: {
                      parts: [{
                        text: `Actúa como un experto valuador de mercado de Pokémon TCG.
Estima el precio actual de mercado en USD para la siguiente carta de Pokémon:
Nombre: ${card.name}
Expansión/Set: ${card.set?.name || item.set}
Número de carta: ${card.number || item.cardNumber || ''}
Rareza: ${card.rarity || item.rarity || ''}
Idioma de la carta: ${itemLang}

Toma en cuenta que los precios varían significativamente según el idioma (por ejemplo, las cartas en chino, japonés o español suelen tener un valor de mercado diferente al de las cartas en inglés). Si hay un precio de referencia de TCGplayer para este idioma, utilízalo.

Responde ÚNICAMENTE con un JSON con el formato: { "price": number, "reasoning": string en español }`
                      }]
                    },
                    config: {
                      responseMimeType: "application/json",
                      responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                          price: { type: Type.NUMBER },
                          reasoning: { type: Type.STRING }
                        },
                        required: ["price", "reasoning"]
                      }
                    }
                  });

                  if (geminiResponse && geminiResponse.text) {
                    const resData = JSON.parse(geminiResponse.text.trim());
                    if (resData.price && resData.price > 0) {
                      finalPrice = resData.price;
                      syncNotes = `Sincronizado con IA para idioma ${itemLang}: ${resData.reasoning}`;
                    }
                  }
                } catch (geminiErr) {
                  console.warn("Failed to get Gemini price estimation for card sync:", geminiErr);
                }
              }

              if (finalPrice > 0 || tcgPrice > 0) {
                const collectrPrice = await getCollectrPrice(card.name, card.set?.name || item.set, 'card');
                updates.push({
                  id: item.id,
                  tcgplayerPrice: finalPrice || tcgPrice || 0.99,
                  collectrPrice: collectrPrice,
                  imageUrl: card.images?.large || card.images?.small || item.imageUrl,
                  notes: syncNotes,
                });
              }
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (err) {
          console.error(`Error syncing withCardId for item ${item.id}:`, err);
        }
      }

      // 2. Block withoutCardId: Process cards that don't have a valid card ID (manually added or similar)
      const withoutCardId = items.filter(
        (item: any) =>
          item.type === "card" &&
          (!item.id || item.id.startsWith("manual-") || !item.id.includes("-"))
      );

      console.log(`Found ${withoutCardId.length} card items without valid card ID.`);
      for (const item of withoutCardId) {
        try {
          const q = buildTcgplayerQuery(`${item.name} ${item.set} ${item.cardNumber || ""}`);
          const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=1`;
          const response = await fetch(url, {
            headers: { "User-Agent": "aistudio-build" },
          });
          if (response.ok) {
            const data = (await response.json()) as any;
            if (data && data.data && data.data.length > 0) {
              const card = data.data[0];
              const tcgPrice = getBestPrice(card.tcgplayer);
              
              let finalPrice = tcgPrice;
              let syncNotes = `Sincronizado con búsqueda en la API de Pokémon TCG. Expansión: ${card.set?.name || item.set}.`;
              const itemLang = item.language || "Inglés";

              if (finalPrice === 0 || itemLang !== "Inglés") {
                try {
                  console.log(`Sync card without card ID ${item.name} (${itemLang}) has price 0 or is non-English. Calling Gemini to estimate...`);
                  const aiClientInst = getAiClient();
                  const geminiResponse = await aiClientInst.models.generateContent({
                    model: "gemini-flash-latest",
                    contents: {
                      parts: [{
                        text: `Actúa como un experto valuador de mercado de Pokémon TCG.
Estima el precio actual de mercado en USD para la siguiente carta de Pokémon:
Nombre: ${card.name}
Expansión/Set: ${card.set?.name || item.set}
Número de carta: ${card.number || item.cardNumber || ''}
Rareza: ${card.rarity || item.rarity || ''}
Idioma de la carta: ${itemLang}

Toma en cuenta que los precios varían significativamente según el idioma (por ejemplo, las cartas en chino, japonés o español suelen tener un valor de mercado diferente al de las cartas en inglés). Si hay un precio de referencia de TCGplayer para este idioma, utilízalo.

Responde ÚNICAMENTE con un JSON con el formato: { "price": number, "reasoning": string en español }`
                      }]
                    },
                    config: {
                      responseMimeType: "application/json",
                      responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                          price: { type: Type.NUMBER },
                          reasoning: { type: Type.STRING }
                        },
                        required: ["price", "reasoning"]
                      }
                    }
                  });

                  if (geminiResponse && geminiResponse.text) {
                    const resData = JSON.parse(geminiResponse.text.trim());
                    if (resData.price && resData.price > 0) {
                      finalPrice = resData.price;
                      syncNotes = `Sincronizado con IA para idioma ${itemLang}: ${resData.reasoning}`;
                    }
                  }
                } catch (geminiErr) {
                  console.warn("Failed to get Gemini price estimation for card sync without ID:", geminiErr);
                }
              }

              if (finalPrice > 0 || tcgPrice > 0) {
                const collectrPrice = await getCollectrPrice(card.name, card.set?.name || item.set, 'card');
                updates.push({
                  id: item.id,
                  tcgplayerPrice: finalPrice || tcgPrice || 0.99,
                  collectrPrice: collectrPrice,
                  imageUrl: card.images?.large || card.images?.small || item.imageUrl,
                  notes: syncNotes,
                });
              }
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 150));
        } catch (err) {
          console.error(`Error syncing withoutCardId for item ${item.id}:`, err);
        }
      }

      // 3. Block for sealed products: Process sealed products using Gemini
      const sealedItems = items.filter((item: any) => item.type === "sealed").slice(0, 15);
      console.log(`Found ${sealedItems.length} sealed products to sync (Max 15).`);
      
      const ai = getAiClient();

      for (const item of sealedItems) {
        let success = false;
        const modelsToTry = ["gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3.5-flash"];
        
        for (const modelName of modelsToTry) {
          try {
            console.log(`Estimating price for sealed product "${item.name}" from set "${item.set}" using model "${modelName}"...`);
            const response = await ai.models.generateContent({
              model: modelName,
              contents: {
                parts: [
                  {
                    text: `Actúa como analista de mercado de productos sellados de Pokémon TCG.
Estima el precio actual de mercado en USD para el siguiente producto sellado:
Nombre: ${item.name}
Expansión/Set: ${item.set}

Responde SOLO un JSON con la estructura { "price": number, "reasoning": string en español } donde "price" es el precio en USD y "reasoning" explica brevemente por qué.`,
                  },
                ],
              },
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    price: {
                      type: Type.NUMBER,
                      description: "The estimated current market price in USD.",
                    },
                    reasoning: {
                      type: Type.STRING,
                      description: "A brief reasoning in Spanish explaining the price estimation.",
                    },
                  },
                  required: ["price", "reasoning"],
                },
              },
            });

            const responseText = response.text;
            if (responseText) {
              const parsedResult = JSON.parse(responseText.trim());
              const precioEstimado = Number(parsedResult.price);
              const reasoning = parsedResult.reasoning;

              if (precioEstimado && precioEstimado > 0) {
                const collectrPrice = await getCollectrPrice(item.name, item.set, 'sealed');
                updates.push({
                  id: item.id,
                  tcgplayerPrice: precioEstimado,
                  collectrPrice: collectrPrice,
                  imageUrl: item.imageUrl,
                  notes: "Sincronizado con IA: " + reasoning,
                });
                success = true;
                break; // Proceed to the next sealed item
              }
            }
          } catch (err) {
            console.error(`Failed to sync sealed item "${item.name}" with model "${modelName}":`, err);
          }
        }

        // Add 400ms delay between estimations to avoid rate limit
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      console.log(`Sincronización finalizada. Enviando ${updates.length} actualizaciones al cliente.`);
      res.json({ updates });
    } catch (error: any) {
      console.error("Error in pokemon sync endpoint:", error);
      res.status(500).json({ error: "Internal server error during price synchronization" });
    }
  });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
