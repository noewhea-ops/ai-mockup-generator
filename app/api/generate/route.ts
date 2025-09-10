import { NextRequest, NextResponse } from "next/server";
import { buildPrompt } from "@/lib/prompt";
import { imageProvider } from "@/lib/providers"; // The adapter we made

// This setting is important for handling file uploads
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const args = {
      productType: String(form.get("productType")),
      aesthetic: String(form.get("aesthetic")),
      photoStyle: String(form.get("photoStyle")),
      props: String(form.get("props")),
      tech: form.getAll("tech").map(String),
      freestyle: String(form.get("freestyle") || ""),
      overlayDescription: String(form.get("overlayDescription") || "user-provided art"),
    };

    // Convert the uploaded file into a format the AI can understand
    const arrayBuf = await file.arrayBuffer();
    const b64 = Buffer.from(arrayBuf).toString("base64");
    const uploadedImageDataUrl = `data:${file.type};base64,${b64}`;

    // --- Generate 1 Mockup (Simplified) ---
    const singlePrompt = buildPrompt(args);

    // Ask the AI to generate a single image
    const image = await imageProvider.generate({ prompt: singlePrompt, overlayDataUrl: uploadedImageDataUrl });

    // Send the finished image back to the webpage in an array
    return NextResponse.json({ images: [image] });

  } catch (error) {
    console.error("Error in /api/generate:", error);
    return NextResponse.json({ error: "Failed to generate images." }, { status: 500 });
  }
}
