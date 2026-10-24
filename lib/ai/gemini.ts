import fs from 'fs';
import path from 'path';
import { IFloorPlanProvider, RawAIPlanOutput } from './types';

export class GeminiFloorPlanProvider implements IFloorPlanProvider {
  name = 'Gemini';
  defaultModel = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

  private getApiKey(): string {
    let key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!key) {
      try {
        const envLocalPath = path.join(process.cwd(), '.env.local');
        if (fs.existsSync(envLocalPath)) {
          const content = fs.readFileSync(envLocalPath, 'utf-8');
          const match = content.match(/(?:GEMINI_API_KEY|GOOGLE_API_KEY)\s*=\s*([^\r\n]+)/);
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
    const model = this.defaultModel;

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const promptText = `
You are an expert architectural analysis engine. Analyze this 2D architectural floor plan image.
Extract the structural layout and return ONLY a valid JSON object matching this schema:
{
  "dimensions": {
    "width": 10.0,
    "length": 8.0,
    "wallHeight": 2.8,
    "wallThickness": 0.2
  },
  "rooms": [
    {
      "id": "room_1",
      "name": "Living Room",
      "type": "living",
      "relX": 0.0,
      "relZ": 0.0,
      "relW": 0.55,
      "relD": 0.55,
      "openings": [
        { "type": "door", "wallSide": "south", "position": 0.5 }
      ]
    }
  ],
  "confidence": 0.92
}
All relX, relZ, relW, relD must be between 0.0 and 1.0. Output pure JSON without markdown code ticks.
`.trim();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const requestBody = {
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
        response_mime_type: 'application/json',
        temperature: 0.1,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API HTTP ${response.status}: ${errorText}`);
      }

      const json = await response.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('Gemini returned an empty response.');
      }

      const sanitized = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();

      return JSON.parse(sanitized) as RawAIPlanOutput;
    } finally {
      clearTimeout(timeout);
    }
  }
}
