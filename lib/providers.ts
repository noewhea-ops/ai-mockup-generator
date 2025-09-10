// lib/providers.ts

type GenArgs = { prompt: string; overlayDataUrl?: string };

// --- Final Placeholder/Mock Implementation ---
// This version uses placeholder data to ensure the app runs without errors.
// The connection to the live AI models is currently blocked by external permissions.

const mockGenerate = async (delay: number): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, delay));
  // These are example images that will show up when you test the "AI Generation" mode.
  const placeholders = [
      "https://images.pexels.com/photos/126271/pexels-photo-126271.jpeg?auto=compress&cs=tinysrgb&w=600",
      "https://images.pexels.com/photos/991509/pexels-photo-991509.jpeg?auto=compress&cs=tinysrgb&w=600",
      "https://images.pexels.com/photos/1648377/pexels-photo-1648377.jpeg?auto=compress&cs=tinysrgb&w=600"
  ];
  return placeholders[Math.floor(Math.random() * placeholders.length)];
};

export const imageProvider = {
  /**
   * This function returns placeholder images because the live AI service is inaccessible.
   */
  async generate({ prompt, overlayDataUrl }: GenArgs): Promise<string> {
    console.log("AI Generation is in placeholder mode due to external API permission issues.");
    console.log("Returning a mock image instead of calling the AI.");

    // We are calling the mock function to return a sample image.
    return mockGenerate(500 + Math.random() * 500);
  }
};

