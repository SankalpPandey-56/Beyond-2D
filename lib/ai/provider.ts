import { IFloorPlanProvider } from './types';
import { GemmaFloorPlanProvider } from './gemma';
import { GeminiFloorPlanProvider } from './gemini';

export function getFloorPlanAIProvider(): IFloorPlanProvider {
  const provider = (process.env.AI_PROVIDER || 'gemma').toLowerCase();

  if (provider === 'gemini') {
    return new GeminiFloorPlanProvider();
  }

  // Default to Gemma 4
  return new GemmaFloorPlanProvider();
}
