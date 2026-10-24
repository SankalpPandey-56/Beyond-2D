import { NextRequest, NextResponse } from 'next/server';
import { getFloorPlanAIProvider } from '@/lib/ai/provider';
import { validateAndNormalizeFloorPlan } from '@/lib/geometry/validator';
import { SAMPLE_PROJECTS } from '@/lib/sampleData';
import { AIAnalysisResponse } from '@/lib/types';

export const maxDuration = 60; // Allow up to 60s for multimodal vision reasoning

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const provider = getFloorPlanAIProvider();

  let imageBase64 = '';
  let mimeType = 'image/jpeg';
  let fileName = 'uploaded_plan';

  try {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No image file uploaded in request form-data.' },
          { status: 400 }
        );
      }

      fileName = file.name;
      mimeType = file.type || 'image/jpeg';
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      imageBase64 = buffer.toString('base64');
    } else {
      // JSON body
      const body = await req.json();
      imageBase64 = body.imageBase64 || '';
      mimeType = body.mimeType || 'image/jpeg';
      fileName = body.fileName || 'uploaded_plan';

      if (!imageBase64) {
        return NextResponse.json(
          { success: false, error: 'Missing imageBase64 in request body.' },
          { status: 400 }
        );
      }
    }

    console.log(`[Beyond-2D API] Analyzing floor plan "${fileName}" via ${provider.name} (${provider.defaultModel})...`);

    // 1. Call Isolated AI Provider (Gemma 4)
    const rawAiResult = await provider.analyzeFloorPlan(imageBase64, mimeType);

    // 2. Validate & Normalize Geometric Structure
    const validated = validateAndNormalizeFloorPlan(rawAiResult);
    const duration = Date.now() - startTime;

    console.log(`[Beyond-2D API] Successfully parsed layout with ${validated.rooms.length} rooms in ${duration}ms.`);

    const response: AIAnalysisResponse = {
      success: true,
      layout: validated,
      metadata: {
        provider: provider.name,
        model: provider.defaultModel,
        confidence: rawAiResult.confidence || 0.85,
        isFallback: false,
        processingTimeMs: duration,
        message: `Successfully analyzed floor plan with ${provider.name}`,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMessage = error?.message || 'Unknown error occurred during AI floor plan analysis.';
    console.warn(`[Beyond-2D API] AI Analysis failed (${errorMessage}). Engaging sample-model fallback...`);

    // 3. Fallback: Provide a high-fidelity sample model with geometric validation
    const fallbackProject = SAMPLE_PROJECTS[0];
    const validatedFallback = validateAndNormalizeFloorPlan({
      dimensions: fallbackProject.dimensions,
      rooms: fallbackProject.rooms,
    });

    const fallbackResponse: AIAnalysisResponse = {
      success: true,
      layout: validatedFallback,
      metadata: {
        provider: provider.name,
        model: provider.defaultModel,
        confidence: 0.75,
        isFallback: true,
        processingTimeMs: duration,
        message: `AI provider error (${errorMessage}). Fallback layout generated. Set GEMINI_API_KEY in .env.local to enable live Gemma 4 vision inference.`,
      },
      error: errorMessage,
    };

    return NextResponse.json(fallbackResponse);
  }
}
