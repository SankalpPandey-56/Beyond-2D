import { IFloorPlanProvider, RawAIPlanOutput } from './types';
import { GemmaFloorPlanProvider } from './gemma';
import { GeminiFloorPlanProvider } from './gemini';

class ResilientFloorPlanProvider implements IFloorPlanProvider {
  name = 'Gemma 4 (with Gemini Failover)';
  defaultModel = 'gemma-4-26b-a4b-it';

  private gemma = new GemmaFloorPlanProvider();
  private gemini = new GeminiFloorPlanProvider();

  async analyzeFloorPlan(imageBase64: string, mimeType: string): Promise<RawAIPlanOutput> {
    const requested = (process.env.AI_PROVIDER || 'gemma').toLowerCase();

    if (requested === 'gemini') {
      return await this.gemini.analyzeFloorPlan(imageBase64, mimeType);
    }

    // Attempt Gemma 4 first
    try {
      console.log('[Beyond-2D AI] Attempting vision analysis with Gemma 4...');
      return await this.gemma.analyzeFloorPlan(imageBase64, mimeType);
    } catch (gemmaError: any) {
      console.warn(
        `[Beyond-2D AI] Gemma 4 failed (${gemmaError?.message || 'unknown'}). Failing over to Gemini 3 Flash...`
      );
      // Seamless failover to Gemini
      const geminiResult = await this.gemini.analyzeFloorPlan(imageBase64, mimeType);
      geminiResult.notes = `Analyzed via Gemini 3 Flash failover (Gemma 4 was unavailable: ${gemmaError.message})`;
      return geminiResult;
    }
  }
}

export function getFloorPlanAIProvider(): IFloorPlanProvider {
  const provider = (process.env.AI_PROVIDER || 'auto').toLowerCase();

  if (provider === 'gemini') {
    return new GeminiFloorPlanProvider();
  }
  if (provider === 'gemma-strict') {
    return new GemmaFloorPlanProvider();
  }

  // Default: Resilient provider with Gemma 4 priority and Gemini failover
  return new ResilientFloorPlanProvider();
}
