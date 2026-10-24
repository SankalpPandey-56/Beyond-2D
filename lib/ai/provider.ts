import { IFloorPlanProvider, RawAIPlanOutput } from './types';
import { GemmaFloorPlanProvider } from './gemma';
import { GeminiFloorPlanProvider } from './gemini';

export function getFloorPlanAIProvider(): IFloorPlanProvider {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

  if (provider === 'gemma-strict') {
    return new GemmaFloorPlanProvider();
  }
  
  // Default to Gemini for instant, high-precision CAD reconstruction
  return new GeminiFloorPlanProvider();
}
