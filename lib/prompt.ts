// lib/prompt.ts

type BuildArgs = {
  productType: string;
  aesthetic: string;
  photoStyle: string;
  props: string;
  tech: string[];
  freestyle?: string;
  overlayDescription: string; // description of the uploaded design
};

export function buildPrompt(a: BuildArgs) {
  const techLine = a.tech?.length ? `Technical specs: ${a.tech.join(", ")}.` : "";
  const free = a.freestyle ? `Freestyle modifiers: ${a.freestyle}.` : "";

  // The Gemini system prompt from step 9 should be set at the API client level.
  // This function generates the user content portion of the request.
  return `
Generate a photoreal product mockup scene.

Goal:
- Show a ${a.productType}.
- The user's uploaded artwork must appear as the product's printed design. Respect proportions, center alignment, and natural perspective/curvature; no warping artifacts.

Scene controls:
- Aesthetic & Environment: ${a.aesthetic}.
- Photography style: ${a.photoStyle}.
- Props & Composition: ${a.props}.${techLine}${free}

Design to apply (overlay): ${a.overlayDescription}

Output:
- Return a single finished mockup image (PNG or JPEG), high resolution, no text overlays, no watermarks, clean edges.
- Make it realistic: correct reflections, shadows, and lighting consistent with the scene.
`;
}