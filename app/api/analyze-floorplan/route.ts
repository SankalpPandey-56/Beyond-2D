import { NextRequest, NextResponse } from 'next/server';
import { getFloorPlanAIProvider } from '@/lib/ai/provider';
import { validateAndNormalizeFloorPlan } from '@/lib/geometry/validator';
import { runPlanPopComputerVision } from '@/lib/cv/planpop_bridge';
import { SAMPLE_PROJECTS } from '@/lib/sampleData';
import { AIAnalysisResponse } from '@/lib/types';

export const maxDuration = 60; // Allow up to 60s for multimodal vision reasoning

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

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

    // Priority 1: Version B Python FastAPI + OpenCV + Shapely Engine (port 8001 or hosted)
    try {
      const fastApiBase = process.env.FASTAPI_BACKEND_URL ? process.env.FASTAPI_BACKEND_URL.replace(/\/$/, '') : 'http://localhost:8001';
      const fastApiUrl = `${fastApiBase}/api/analyze-floorplan`;
      const pyFormData = new FormData();
      const buffer = Buffer.from(imageBase64, 'base64');
      const blob = new Blob([buffer], { type: mimeType });
      pyFormData.append('file', blob, fileName);

      const pyRes = await fetch(fastApiUrl, {
        method: 'POST',
        body: pyFormData,
      });

      if (pyRes.ok) {
        const pyData = await pyRes.json();
        if (pyData && pyData.success && pyData.layout) {
          console.log(`[Beyond-2D API] Successfully processed via Version B FastAPI in ${Date.now() - startTime}ms.`);
          return NextResponse.json(pyData, {
            headers: { 'Access-Control-Allow-Origin': '*' }
          });
        }
      }
    } catch (fastApiErr) {
      console.warn('[Beyond-2D API] FastAPI 8001 not reachable, falling back to Next.js pipeline:', fastApiErr);
    }

    console.log(`[Beyond-2D API] Analyzing floor plan "${fileName}" via ${provider.name} (${provider.defaultModel})...`);

    // 1. Semantic Architectural AI Analysis
    const rawAiResult = await provider.analyzeFloorPlan(imageBase64, mimeType);

    // 2. PlanPop-Style Semantic Color-Coding & OpenCV Computer Vision Extraction
    console.log(`[Beyond-2D API] Running PlanPop semantic color-coded CV extraction with real image pixels...`);
    const planpopResult = await runPlanPopComputerVision(rawAiResult, imageBase64);
    const duration = Date.now() - startTime;

    console.log(
      `[Beyond-2D API] PlanPop CV successfully extracted ${planpopResult.layout.walls?.length} walls and ${planpopResult.layout.rooms.length} rooms in ${duration}ms.`
    );

    const response: AIAnalysisResponse = {
      success: true,
      layout: planpopResult.layout,
      metadata: {
        provider: provider.name,
        model: provider.defaultModel,
        confidence: rawAiResult.confidence || 0.95,
        isFallback: false,
        processingTimeMs: duration,
        message: `PlanPop CV extracted ${planpopResult.layout.walls?.length} walls, ${planpopResult.diagnostics?.cvStats?.detectedDoorsCount ?? 0} doors, and ${planpopResult.diagnostics?.cvStats?.detectedWindowsCount ?? 0} windows.`,
      },
      diagnostics: planpopResult.diagnostics,
    };

    return NextResponse.json(response, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
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
        message: `AI provider error (${errorMessage}). Fallback layout generated. Set GEMINI_API_KEY in .env.local to enable live inference.`,
      },
      error: errorMessage,
    };

    return NextResponse.json(fallbackResponse, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}
