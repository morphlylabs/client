import { stlRequestBodySchema, type StlRequestBody } from "./schema";
import { ChatSDKError } from "~/lib/errors";
import { auth } from "~/lib/auth";
import { generateStlFromJscadCode } from "~/lib/stl/generate";

export const maxDuration = 30;

export async function POST(request: Request) {
  let requestBody: StlRequestBody;

  try {
    requestBody = stlRequestBodySchema.parse(await request.json());
  } catch {
    return new ChatSDKError("bad_request:api", "Invalid request body").toResponse();
  }

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return new ChatSDKError("unauthorized:stl").toResponse();
    }

    const { code } = requestBody;

    // Generate STL from JSCAD code
    const result = await generateStlFromJscadCode(code);

    if (!result.success) {
      return new ChatSDKError(
        "bad_request:stl",
        result.error ?? "STL generation failed"
      ).toResponse();
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
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("STL generation error:", error);
    return new ChatSDKError(
      "bad_request:stl",
      "An unexpected error occurred during STL generation"
    ).toResponse();
  }
} 