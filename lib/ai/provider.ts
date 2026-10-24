import { IFloorPlanProvider, RawAIPlanOutput } from './types';
import { GemmaFloorPlanProvider } from './gemma';
import { GeminiFloorPlanProvider } from './gemini';

class ResilientFloorPlanProvider implements IFloorPlanProvider {
  name = 'Gemini 3 Flash & Gemma 4 Engine';
  defaultModel = 'gemini-3-flash-preview';

  private gemma = new GemmaFloorPlanProvider();
  private gemini = new GeminiFloorPlanProvider();

  async analyzeFloorPlan(imageBase64: string, mimeType: string): Promise<RawAIPlanOutput> {
    const requested = (process.env.AI_PROVIDER || 'auto').toLowerCase();

    if (requested === 'gemma-strict') {
      return await this.gemma.analyzeFloorPlan(imageBase64, mimeType);
    }

    // Default: Use high-speed Gemini 3 Flash for zero-latency architectural analysis
    try {
      console.log('[Beyond-2D AI] Running architectural vision analysis via Gemini 3 Flash...');
      return await this.gemini.analyzeFloorPlan(imageBase64, mimeType);
    } catch (geminiError: any) {
      console.warn(
        `[Beyond-2D AI] Gemini 3 Flash failed (${geminiError?.message || 'unknown'}). Attempting Gemma 4...`
      );
      return await this.gemma.analyzeFloorPlan(imageBase64, mimeType);
    }
  }
}

export function getFloorPlanAIProvider(): IFloorPlanProvider {
  const provider = (process.env.AI_PROVIDER || 'auto').toLowerCase();

  if (provider === 'gemma-strict') {
    return new GemmaFloorPlanProvider();
  }
  if (provider === 'gemini') {
    return new GeminiFloorPlanProvider();
  }

  return new ResilientFloorPlanProvider();
}
