import { stlRequestBodySchema, type StlRequestBody } from "../schema";
import { generateStlFromJscadCode } from "~/lib/stl/generate";

export const maxDuration = 30;

export async function POST(request: Request) {
  let requestBody: StlRequestBody;

  try {
    requestBody = stlRequestBodySchema.parse(await request.json());
  } catch {
    return Response.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  try {
    const { code } = requestBody;

    // Generate STL from JSCAD code
    const result = await generateStlFromJscadCode(code);

    if (!result.success) {
      return Response.json(
        { error: result.error ?? "STL generation failed" },
        { status: 400 }
      );
    }

    const stlBuffer = result.stlBuffer!;

    // Return the binary STL data
    return new Response(stlBuffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": "attachment; filename=model.stl",
        "Content-Length": stlBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error("STL generation error:", error);
    return Response.json(
      { error: "An unexpected error occurred during STL generation" },
      { status: 500 }
    );
  }
} 