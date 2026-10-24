import fs from 'fs';
import path from 'path';
import { IFloorPlanProvider, RawAIPlanOutput } from './types';

export class GeminiFloorPlanProvider implements IFloorPlanProvider {
  name = 'Gemini Architectural Vision';
  defaultModel = 'gemini-3.5-flash';

  private getApiKey(): string {
    let key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!key) {
      try {
        const envLocalPath = path.join(process.cwd(), '.env.local');
        if (fs.existsSync(envLocalPath)) {
          const content = fs.readFileSync(envLocalPath, 'utf-8');
          const match = content.match(/(?:GEMINI_API_KEY|GOOGLE_API_KEY|GEMMA_API_KEY)\s*=\s*([^\r\n]+)/);
          if (match && match[1]) {
            key = match[1].trim().replace(/^['"]|['"]$/g, '');
          } else {
            const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 10 && !l.startsWith('#'));
            if (lines.length > 0) key = lines[0];
          }
        }
      } catch (e) {
        console.warn('[Beyond-2D API] Error reading .env.local from disk:', e);
      }
    }

    if (!key) {
      throw new Error(
        'Missing API Key for Gemini. Set GEMINI_API_KEY or GOOGLE_API_KEY in your environment or .env.local file.'
      );
    }
    return key;
  }

  async analyzeFloorPlan(imageBase64: string, mimeType: string): Promise<RawAIPlanOutput> {
    const apiKey = this.getApiKey();
    const candidateModels = ['gemini-3.1-flash-lite-preview', 'gemini-3.5-flash', 'gemini-3.6-flash'];

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const promptText = `
You are an expert architectural blueprint and CAD floor plan reconstruction engine.
Analyze this 2D architectural floor plan image with extreme precision and spatial accuracy.

Rules for Blueprint Extraction:
1. Detect written dimension numbers on the plan:
   - Identify total overall building width (in meters, e.g. 10.0) and length (depth, e.g. 8.0).
   - Identify each room's labeled dimensions (e.g. '3.5 m x 3.0 m', '1.5 m x 2.0 m', etc.).
2. Room Identification:
   - Extract every labeled room (e.g., Bedroom 1, Bedroom 2, Bathroom, Kitchen, Living Room, Porch, Dining Area, Entrance).
3. Coordinate Topology (Flush alignment, NO GAPS):
   - relX: left edge normalized (0.0 to 1.0, West to East).
   - relZ: top edge normalized (0.0 to 1.0, North to South).
   - relW: width fraction (0.0 to 1.0).
   - relD: depth fraction (0.0 to 1.0).
   - Adjacent rooms MUST share exact boundaries (e.g., if Room A relX=0 and relW=0.4, then adjacent Room B relX must be exactly 0.4).
   - All rooms must form a tight, flush, gapless floor plan spanning up to 1.0.
4. Doors vs Windows:
   - DOORS: Passage openings between rooms or main entrance door (swing arc or doorway opening). Specify "type": "door".
   - WINDOWS: Exterior wall openings with parallel lines or labeled W. Specify "type": "window".
   - Every exterior-facing bedroom, living room, dining room, and kitchen must have its proper windows on the exterior walls!
   - DO NOT classify exterior windows as doors!
5. Furniture & Fixtures:
   - Identify furniture present in each room (bed, closet, desk, sofa, coffee table, dining table, kitchen counter, sink, stove, toilet, vanity).

Return ONLY valid JSON matching this schema:
{
  "dimensions": {
    "width": 10.0,
    "length": 8.0,
    "wallHeight": 2.8,
    "wallThickness": 0.22
  },
  "rooms": [
    {
      "id": "bedroom_1",
      "name": "Bedroom 1",
      "type": "bedroom",
      "relX": 0.0,
      "relZ": 0.0,
      "relW": 0.4,
      "relD": 0.4,
      "dimensionsText": "3.5 m x 3.0 m",
      "furniture": ["bed", "closet"],
      "openings": [
        { "type": "window", "wallSide": "north", "position": 0.5 },
        { "type": "door", "wallSide": "south", "position": 0.8 }
      ]
    }
  ],
  "confidence": 0.98
}

Types: "bedroom", "living", "kitchen", "bathroom", "dining", "entrance", "porch", "hallway".
Ensure relX + relW <= 1.0 and relZ + relD <= 1.0. Output pure JSON without markdown code ticks.
`.trim();

    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        console.log(`[Beyond-2D API] Attempting architectural analysis with ${model}...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const requestBody = {
          contents: [
            {
              parts: [
                { text: promptText },
                {
                  inline_data: {
                    mime_type: mimeType || 'image/png',
                    data: cleanBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.1,
          },
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 55000); // 55s timeout ensures complex vision inference completes

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errText}`);
        }

        const json = await response.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
          throw new Error('Empty response from model.');
        }

        const sanitized = rawText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```$/i, '')
          .trim();

        const parsed = JSON.parse(sanitized) as RawAIPlanOutput;
        this.defaultModel = model;
        return parsed;
      } catch (err: any) {
        console.warn(`[Beyond-2D API] ${model} failed (${err.message}). Trying next candidate...`);
        lastError = err;
      }
    }

    throw lastError || new Error('All AI vision models failed to analyze the floor plan.');
  }
}
