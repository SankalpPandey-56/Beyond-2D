import fs from 'fs';
import path from 'path';
import { IFloorPlanProvider, RawAIPlanOutput } from './types';

export class GemmaFloorPlanProvider implements IFloorPlanProvider {
  name = 'Gemma 4';
  defaultModel = process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it';
  candidateModels = ['gemma-4-26b-a4b-it', 'gemma-4-31b-it'];

  private getApiKey(): string {
    let key = process.env.GEMMA_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

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
        'Missing API Key for Gemma 4. Set GEMINI_API_KEY or GOOGLE_API_KEY in your environment or .env.local file.'
      );
    }
    return key;
  }

  async analyzeFloorPlan(imageBase64: string, mimeType: string): Promise<RawAIPlanOutput> {
    const apiKey = this.getApiKey();
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const promptText = `
You are an expert architectural analysis engine. Analyze this 2D architectural floor plan image.
Identify all rooms, their semantic labels, spatial bounds, overall building dimensions, and openings (doors/windows).

Return ONLY a valid JSON object matching this exact structure:
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
      "name": "Living Room",
      "type": "living",
      "relX": 0.0,
      "relZ": 0.38,
      "relW": 0.55,
      "relD": 0.44,
      "openings": [
        { "type": "door", "wallSide": "south", "position": 0.5 }
      ]
    }
  ],
  "confidence": 0.92
}

Guidelines for coordinate normalization:
- relX: normalized 0.0 to 1.0 (left to right / West to East horizontal position of room).
- relZ: normalized 0.0 to 1.0 (top to bottom / North to South position of room).
- relW: width fraction of room (0.05 to 1.0).
- relD: depth/length fraction of room (0.05 to 1.0).
- Room types: "living", "bedroom", "kitchen", "bathroom", "hallway", "dining", "porch", "balcony".
- Output pure JSON with no markdown wrapping or preamble.
`.trim();

    let lastError: any = null;

    for (const model of this.candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 28000);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: promptText },
                  {
                    inline_data: {
                      mime_type: mimeType || 'image/jpeg',
                      data: cleanBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.15,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const json = await response.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error('Empty response from model');

        const sanitized = rawText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```$/i, '')
          .trim();

        return JSON.parse(sanitized) as RawAIPlanOutput;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemma 4 Provider] Model ${model} failed: ${err.message}. Trying next candidate...`);
      }
    }

    throw lastError || new Error('All Gemma 4 candidate models failed.');
  }

  // Layout reasoning & optimization engine using Gemma 4
  async optimizeLayout(plan: RawAIPlanOutput): Promise<RawAIPlanOutput> {
    const apiKey = this.getApiKey();
    const promptText = `
You are Gemma 4, an advanced architectural layout optimizer and geometric solver.
Examine this preliminary 2D floor plan detection:
${JSON.stringify(plan, null, 2)}

Refine and optimize this floor plan:
1. Snap adjacent room boundaries together so there are no overlapping walls or micro-gaps.
2. Ensure exterior perimeter rooms extend to the outer edges (0.0 and 1.0).
3. If doors or windows are missing, add standard architectural openings between adjoining rooms and exterior walls.
4. Verify room labels and accurate proportions.

Return ONLY pure, valid JSON with the exact same schema:
{
  "dimensions": { "width": number, "length": number, "wallHeight": number, "wallThickness": number },
  "rooms": [...],
  "confidence": number
}
`.trim();

    for (const model of this.candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) continue;

        const json = await response.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;

        const sanitized = rawText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```$/i, '')
          .trim();

        const optimized = JSON.parse(sanitized) as RawAIPlanOutput;
        if (optimized.rooms && optimized.rooms.length > 0) {
          console.log(`[Beyond-2D AI] Successfully optimized layout with Gemma 4 (${model})!`);
          return optimized;
        }
      } catch (err) {
        // Fallback gracefully to original plan
      }
    }

    return plan;
  }
}
