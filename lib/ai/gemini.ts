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
    const candidateModels = ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemma-4-26b-a4b-it'];

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const promptText = `
You are an expert architectural blueprint and floor plan analysis engine.
Analyze this 2D architectural floor plan image with extreme precision.

Instructions:
1. Detect written dimension numbers on the plan:
   - Overall width (e.g., 10.0 m) and length/depth (e.g., 8.0 m).
   - Individual room dimensions (e.g., "3.5 m x 3.0 m", "1.5 m x 2.0 m", "3.0 m x 3.0 m", etc.).
2. Identify every labeled room and architectural zone:
   - Bedroom 1, Bedroom 2, Bathroom, Living Room, Kitchen, Dining Area, Entrance, Porch/Balcony.
3. Compute precise normalized coordinates (0.0 to 1.0):
   - X axis: 0.0 on West (left) to 1.0 on East (right).
   - Z axis: 0.0 on North (top) to 1.0 on South (bottom).
   - relX, relZ: top-left corner normalized position.
   - relW, relD: width and depth fractions.
   - For example: if total width is 10.0m and Bedroom 1 is 3.5m wide, relW = 0.35, relX = 0.0.
4. Detect doors (curved swing arcs) and windows (double lines on exterior walls).
5. Detect furniture present in each room (bed, closet, desk, sofa, coffee table, tv, dining table, kitchen counter, sink, stove, toilet, vanity).

Return ONLY a valid JSON object matching this schema:
{
  "dimensions": {
    "width": 10.0,
    "length": 8.0,
    "wallHeight": 2.8,
    "wallThickness": 0.22
  },
  "rooms": [
    {
      "id": "room_1",
      "name": "Bedroom 1",
      "type": "bedroom",
      "relX": 0.0,
      "relZ": 0.0,
      "relW": 0.35,
      "relD": 0.375,
      "dimensionsText": "3.5 m x 3.0 m",
      "furniture": ["bed", "closet"],
      "openings": [
        { "type": "window", "wallSide": "north", "position": 0.5 },
        { "type": "door", "wallSide": "south", "position": 0.8 }
      ]
    }
  ],
  "confidence": 0.95
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
        const timeout = setTimeout(() => controller.abort(), 22000);

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
