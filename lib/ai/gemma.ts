import { IFloorPlanProvider, RawAIPlanOutput } from './types';

export class GemmaFloorPlanProvider implements IFloorPlanProvider {
  name = 'Gemma 4';
  defaultModel = process.env.GEMMA_MODEL || 'gemma-4-31b-it';

  private getApiKey(): string {
    const key = process.env.GEMMA_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!key) {
      throw new Error(
        'Missing API Key for Gemma 4. Set GEMINI_API_KEY or GOOGLE_API_KEY in your environment or .env.local file.'
      );
    }
    return key;
  }

  async analyzeFloorPlan(imageBase64: string, mimeType: string): Promise<RawAIPlanOutput> {
    const apiKey = this.getApiKey();
    const model = this.defaultModel;

    // Clean base64 payload if it includes data URL prefix
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const promptText = `
You are an expert architectural analysis engine. Analyze this 2D architectural floor plan image.
Identify all rooms, their semantic labels, spatial bounds, overall building dimensions, and openings (doors/windows).

Return ONLY a valid JSON object matching this exact structure:
{
  "dimensions": {
    "width": 10.5,
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
      "relZ": 0.0,
      "relW": 0.55,
      "relD": 0.55,
      "openings": [
        { "type": "door", "wallSide": "south", "position": 0.5 }
      ]
    }
  ],
  "confidence": 0.88
}

Guidelines for coordinate normalization:
- relX: normalized 0.0 to 1.0 (left to right horizontal position of room).
- relZ: normalized 0.0 to 1.0 (top to bottom vertical position of room).
- relW: width fraction of room (0.05 to 1.0).
- relD: depth/length fraction of room (0.05 to 1.0).
- Room types should be one of: "living", "bedroom", "kitchen", "bathroom", "hallway", "dining", "office", "balcony".
- Ensure relX + relW <= 1.0 and relZ + relD <= 1.0.
- All major functional areas should be accounted for.
- Output pure JSON with no markdown wrapping or preamble.
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
        temperature: 0.15,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000); // 35s timeout for vision reasoning

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemma 4 API HTTP ${response.status}: ${errorText}`);
      }

      const json = await response.json();
      const candidate = json.candidates?.[0];
      const rawText = candidate?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('Gemma 4 returned an empty response with no content parts.');
      }

      // Parse JSON from returned text (strip code blocks if present)
      const sanitized = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();

      const parsed = JSON.parse(sanitized) as RawAIPlanOutput;
      return parsed;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Gemma 4 request timed out after 35 seconds.');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
