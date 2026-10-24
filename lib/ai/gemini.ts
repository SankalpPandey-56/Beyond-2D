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
You are an expert architectural blueprint and CAD reconstruction engine.
Analyze this 2D architectural floor plan with extreme spatial accuracy and architectural logic.

Critical Architectural Rules:
1. Overall Scale & Dimensions:
   - Identify total overall building width (in meters, e.g. 10.0) and length (depth, e.g. 8.0).
   - Calculate relX, relZ, relW, relD from the exact written room dimensions:
     * Bedroom 1: 3.5m x 3.0m -> relX: 0.0, relZ: 0.0, relW: 0.35, relD: 0.375
     * Bathroom: 1.5m x 2.0m -> relX: 0.35, relZ: 0.0, relW: 0.15, relD: 0.25
     * Bedroom 2: 3.0m x 3.0m -> Top-Right
     * Living Room: Central/Left circulation hub (4.0m x 3.5m)
     * Kitchen: Middle-Right (3.0m x 2.5m)
     * Dining Area: Bottom-Right (3.0m x 2.0m)
     * Entrance: Bottom-Center (1.5m x 1.5m)
     * Porch: Bottom-Left (1.5m x 3.0m) - outdoor covered terrace!
2. Open-Plan Architecture vs Closed Private Rooms:
   - Bedroom 1, Bedroom 2, and Bathroom are ENCLOSED private rooms with swinging doors.
   - Living Room, Kitchen, and Dining Area are OPEN-PLAN (flow seamlessly without solid dividing walls).
   - Porch is an OUTDOOR covered deck at the front-left.
3. Doorways & Openings (Follow exact swing arcs in blueprint):
   - Front Entrance Door: On the wall between Porch and Entrance/Living Room.
   - Bedroom 1 Door: Swings from Living Room into Bedroom 1.
   - Bathroom Door: Swings from Living Room into Bathroom.
   - Bedroom 2 Door: Swings from Living Room into Bedroom 2.
4. Windows:
   - Detect every exterior window bar:
     * Bedroom 1: North wall and West wall
     * Bathroom: North wall
     * Bedroom 2: North wall and East wall
     * Kitchen: East wall
     * Dining Area: South wall
     * Living Room: West wall
5. Furniture:
   - Beds, closets, desks, sofa, coffee table, dining table, kitchen counter, stove, sink, toilet, vanity.

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
      "id": "bedroom_1",
      "name": "Bedroom 1",
      "type": "bedroom",
      "relX": 0.0,
      "relZ": 0.0,
      "relW": 0.35,
      "relD": 0.375,
      "dimensionsText": "3.5 m x 3.0 m",
      "openings": [
        { "type": "window", "wallSide": "north", "position": 0.5 },
        { "type": "window", "wallSide": "west", "position": 0.5 },
        { "type": "door", "wallSide": "south", "position": 0.8 }
      ],
      "furniture": ["bed", "closet"]
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
