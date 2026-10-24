import { spawn } from 'child_process';
import path from 'path';
import { RawAIPlanOutput } from '@/lib/ai/types';
import { validateAndNormalizeFloorPlan } from '@/lib/geometry/validator';
import { BuildingDimensions, RoomData, WallData } from '@/lib/types';

export interface PlanPopDiagnostics {
  semanticImageBase64: string;
  cvStats: {
    semanticResolution: string;
    wallMaskPixelCount: number;
    totalExtractedWalls: number;
    recoveredRoomsCount: number;
    detectedDoorsCount: number;
    detectedWindowsCount: number;
    pipeline: string;
  };
  warnings: string[];
}

export interface PlanPopResult {
  success: boolean;
  layout: {
    dimensions: BuildingDimensions;
    rooms: RoomData[];
    walls: WallData[];
  };
  diagnostics?: PlanPopDiagnostics;
  error?: string;
}

export async function runPlanPopComputerVision(
  aiOutput: RawAIPlanOutput,
  imageWidth = 1024,
  imageHeight = 768
): Promise<PlanPopResult> {
  return new Promise((resolve) => {
    try {
      const scriptPath = path.join(process.cwd(), 'lib', 'cv', 'planpop_pipeline.py');
      const pyProcess = spawn('python3', [scriptPath]);

      const inputPayload = JSON.stringify({
        image_dims: { width: imageWidth, height: imageHeight },
        ai_layout: aiOutput,
      });

      let stdoutData = '';
      let stderrData = '';

      pyProcess.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      pyProcess.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      pyProcess.on('close', (code) => {
        if (code === 0 && stdoutData.trim()) {
          try {
            const parsed = JSON.parse(stdoutData) as PlanPopResult;
            if (parsed.success && parsed.layout) {
              return resolve(parsed);
            }
          } catch (jsonErr) {
            console.warn('[PlanPop Bridge] JSON parse error from python output:', jsonErr);
          }
        }

        console.warn(`[PlanPop Bridge] Python CV exited with code ${code}. Stderr: ${stderrData}. Engaging TypeScript fallback.`);
        
        // Fallback to TypeScript geometric validator
        const validated = validateAndNormalizeFloorPlan(aiOutput);
        resolve({
          success: true,
          layout: validated,
          diagnostics: {
            semanticImageBase64: '',
            cvStats: {
              semanticResolution: `${imageWidth}x${imageHeight}`,
              wallMaskPixelCount: 0,
              totalExtractedWalls: validated.walls.length,
              recoveredRoomsCount: validated.rooms.length,
              detectedDoorsCount: validated.walls.reduce((acc, w) => acc + (w.openings?.filter(o => o.type === 'door').length || 0), 0),
              detectedWindowsCount: validated.walls.reduce((acc, w) => acc + (w.openings?.filter(o => o.type === 'window').length || 0), 0),
              pipeline: 'TypeScript CAD Fallback',
            },
            warnings: [stderrData || 'Executed via TS geometry fallback engine'],
          },
        });
      });

      pyProcess.on('error', (err) => {
        console.warn('[PlanPop Bridge] Failed to spawn python3:', err.message);
        const validated = validateAndNormalizeFloorPlan(aiOutput);
        resolve({
          success: true,
          layout: validated,
          error: err.message,
        });
      });

      // Write payload to stdin
      pyProcess.stdin.write(inputPayload);
      pyProcess.stdin.end();
    } catch (err: any) {
      console.warn('[PlanPop Bridge] Unexpected error:', err.message);
      const validated = validateAndNormalizeFloorPlan(aiOutput);
      resolve({
        success: true,
        layout: validated,
        error: err.message,
      });
    }
  });
}
