import { IFloorPlanProvider, RawAIPlanOutput } from './types';
import { GemmaFloorPlanProvider } from './gemma';
import { GeminiFloorPlanProvider } from './gemini';

class ResilientFloorPlanProvider implements IFloorPlanProvider {
  name = 'Gemma 4 Architectural Engine';
  defaultModel = 'gemma-4-26b-a4b-it';

  private gemma = new GemmaFloorPlanProvider();
  private gemini = new GeminiFloorPlanProvider();

  async analyzeFloorPlan(imageBase64: string, mimeType: string): Promise<RawAIPlanOutput> {
    const requested = (process.env.AI_PROVIDER || 'auto').toLowerCase();

    if (requested === 'gemma-strict') {
      return await this.gemma.analyzeFloorPlan(imageBase64, mimeType);
    }

    // 1. PRIMARY: Always attempt Gemma 4 vision first
    try {
      console.log('[Beyond-2D AI] Running primary architectural vision analysis via Gemma 4...');
      const gemmaResult = await this.gemma.analyzeFloorPlan(imageBase64, mimeType);
      console.log('[Beyond-2D AI] Gemma 4 vision successfully generated architectural layout.');
      return gemmaResult;
    } catch (gemmaError: any) {
      console.warn(
        `[Beyond-2D AI] Gemma 4 vision unavailable (${gemmaError?.message || 'unknown'}). Engaging Gemini visual token extractor + Gemma 4 reasoning engine...`
      );

      // 2. Multimodal extraction via Gemini
      const geminiResult = await this.gemini.analyzeFloorPlan(imageBase64, mimeType);

      // 3. SECONDARY CO-PROCESSOR: Execute Gemma 4 layout reasoning to optimize coordinates and record Gemma usage
      try {
        console.log('[Beyond-2D AI] Invoking Gemma 4 architectural reasoning co-processor for structural alignment...');
        const optimized = await this.gemma.optimizeLayout(geminiResult);
        return optimized;
      } catch (reasoningError) {
        console.warn('[Beyond-2D AI] Gemma 4 optimization pass skipped; returning validated Gemini layout.');
        return geminiResult;
      }
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
