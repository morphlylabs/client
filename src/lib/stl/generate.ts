import { serialize } from "@jscad/stl-serializer";
import * as modeling from "@jscad/modeling";

export interface StlGenerationResult {
  success: boolean;
  stlBuffer?: Buffer;
  error?: string;
}

export async function generateStlFromJscadCode(code: string): Promise<StlGenerationResult> {
  try {
    const safeEval = new Function(
      "modeling",
      `
        try {
          const { primitives, booleans, transforms } = modeling;
          const { cube, sphere, cylinder, cuboid, torus } = primitives;
          const { union, subtract, intersect } = booleans;
          const { translate, rotate, scale } = transforms;

          ${code}

          if (typeof main !== 'function') {
            throw new Error('main() function is required');
          }

          const result = main();

          const isArray = Array.isArray(result);
          const allAreGeom3 = isArray
            ? result.every(g => modeling.geometries.geom3.isA(g))
            : modeling.geometries.geom3.isA(result);

          if (!allAreGeom3) {
            throw new Error('Returned geometry is not a valid 3D solid (geom3)');
          }

          return result;
        } catch (error) {
          throw new Error('Code execution failed: ' + error.message);
        }
      `
    );

    const geometry = safeEval(modeling);
    
    if (!geometry) {
      return { success: false, error: "No geometry returned from main() function" };
    }

    const normalized = Array.isArray(geometry) ? geometry : [geometry];
    const stlData = serialize({ binary: true }, ...normalized);
    
    // The serialize function returns an array: [header, metadata, geometry_data]
    // We need to combine all parts for a complete STL file
    const stlBuffer = Buffer.concat([
      Buffer.from(stlData[0] as unknown as ArrayBuffer),
      Buffer.from(stlData[1] as unknown as ArrayBuffer),
      Buffer.from(stlData[2] as unknown as ArrayBuffer)
    ]);

    return { success: true, stlBuffer };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: `STL generation failed: ${errorMessage}` };
  }
} 