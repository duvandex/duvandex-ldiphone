import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Lazy-loaded Gemini Client
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings -> Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Fetch market price from the Collectr API
async function getCollectrPrice(name: string, set: string, type: 'card' | 'sealed'): Promise<number | null> {
  const apiKey = process.env.COLLECTR_API_KEY;
  if (!apiKey) return null;

  try {
    const searchQuery = `${name} ${set}`.trim();
    const url = `https://getcollectr.com/api/v1/products/search?q=${encodeURIComponent(searchQuery)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'x-api-key': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'aistudio-build'
      }
    });

    if (!response.ok) return null;
    const data = await response.json() as any;
    
    let products = data.data || data.products || data.results || (Array.isArray(data) ? data : []);
    if (!Array.isArray(products) || products.length === 0) return null;

    const lowerTarget = name.toLowerCase();
    const match = products.find((p: any) => p.name?.toLowerCase().includes(lowerTarget)) || products[0];
    
    if (match) {
      return match.price || match.marketPrice || match.market_price || match.prices?.market || null;
    }
    return null;
  } catch (error) {
    console.error("[Collectr] Error:", error);
    return null;
  }
}

const app = express();
export default app;

app.use(express.json({ limit: "25mb" }));

// SCANDEX API: Image Analysis
app.post("/api/pokemon/scan", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "No image provided" });

    const ai = getAiClient();
    const prompt = `Identify this Pokemon TCG card or sealed product. 
    Return a JSON object with:
    {
      "name": "Exact Name",
      "set": "Expansion Name",
      "cardNumber": "Number/Total (if card)",
      "rarity": "Rarity",
      "type": "card" or "sealed",
      "language": "Detect language (default English)"
    }`;

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: image.split(',')[1] || image } }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            set: { type: Type.STRING },
            cardNumber: { type: Type.STRING },
            rarity: { type: Type.STRING },
            type: { type: Type.STRING },
            language: { type: Type.STRING }
          },
          required: ["name", "set", "type"]
        }
      }
    });

    const analysis = JSON.parse(result.text);
    const collectrPrice = await getCollectrPrice(analysis.name, analysis.set, analysis.type);

    res.json({ ...analysis, collectrPrice });
  } catch (error: any) {
    console.error("[Scan Error]:", error);
    res.status(500).json({ error: error.message });
  }
});

// SCANDEX API: Text Search Suggestions
app.post("/api/pokemon/search", async (req, res) => {
  try {
    const { query } = req.body;
    const ai = getAiClient();
    
    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Search for Pokemon TCG items matching: "${query}". 
      Return a JSON array of up to 5 objects: 
      [{ "name": "Name", "set": "Set", "cardNumber": "Num", "type": "card|sealed", "marketPrice": 0, "imageUrl": "url" }]`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              set: { type: Type.STRING },
              cardNumber: { type: Type.STRING },
              type: { type: Type.STRING },
              marketPrice: { type: Type.NUMBER },
              imageUrl: { type: Type.STRING }
            }
          }
        }
      }
    });

    res.json(JSON.parse(result.text));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
