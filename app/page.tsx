"use client";

import { useState, useRef } from "react";
import { PRODUCT_TYPES, AESTHETICS, PHOTO_STYLES, PROPS, TECH } from "@/lib/options";

// Define specific types for our dropdown options to satisfy TypeScript's strictness
type ProductType = (typeof PRODUCT_TYPES)[number];
type Aesthetic = (typeof AESTHETICS)[number];
type PhotoStyle = (typeof PHOTO_STYLES)[number];
type Prop = (typeof PROPS)[number];


const TEMPLATE_CONFIG: Record<string, { baseUrl: string; placement: { x: number; y: number; width: number; height: number; rotation?: number } }> = {
  "White ceramic coffee mug": {
    baseUrl: "https://images.pexels.com/photos/1579926/pexels-photo-1579926.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    placement: { x: 320, y: 310, width: 180, height: 180, rotation: -0.05 },
  },
  "Canvas tote bag resting on a chair": {
    baseUrl: "https://images.pexels.com/photos/6813036/pexels-photo-6813036.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    placement: { x: 250, y: 200, width: 300, height: 300, rotation: 0.02 },
  },
  "Framed art print on a gallery wall": {
    baseUrl: "https://images.pexels.com/photos/1040499/pexels-photo-1040499.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    placement: { x: 305, y: 260, width: 200, height: 280, rotation: 0 },
  },
  "Stainless steel water bottle": {
    baseUrl: "https://images.pexels.com/photos/7845123/pexels-photo-7845123.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    placement: { x: 450, y: 200, width: 220, height: 350, rotation: 0 },
  }
};

async function compositeImageOnCanvas(
  canvas: HTMLCanvasElement,
  baseImageUrl: string,
  artworkFile: File,
  placementConfig: { x: number; y: number; width: number; height: number; rotation?: number }
): Promise<string> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  const baseImage = new Image();
  baseImage.crossOrigin = "anonymous";
  baseImage.src = baseImageUrl;
  await new Promise((resolve, reject) => { baseImage.onload = resolve; baseImage.onerror = reject; });
  canvas.width = baseImage.width;
  canvas.height = baseImage.height;
  ctx.drawImage(baseImage, 0, 0);
  const artworkImage = new Image();
  artworkImage.src = URL.createObjectURL(artworkFile);
  await new Promise((resolve, reject) => { artworkImage.onload = resolve; artworkImage.onerror = reject; });
  ctx.save();
  const rotation = placementConfig.rotation || 0;
  ctx.translate(placementConfig.x + placementConfig.width / 2, placementConfig.y + placementConfig.height / 2);
  ctx.rotate(rotation);
  ctx.drawImage(artworkImage, -placementConfig.width / 2, -placementConfig.height / 2, placementConfig.width, placementConfig.height);
  ctx.restore();
  return canvas.toDataURL("image/png");
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  // Use our new, more specific types for the state variables
  const [productType, setProductType] = useState<ProductType>(PRODUCT_TYPES[0]);
  const [aesthetic, setAesthetic] = useState<Aesthetic>(AESTHETICS[0]);
  const [photoStyle, setPhotoStyle] = useState<PhotoStyle>(PHOTO_STYLES[0]);
  const [propsSel, setPropsSel] = useState<Prop>(PROPS[0]);
  const [techSel, setTechSel] = useState<string[]>([]);
  const [freestyle, setFreestyle] = useState("");
  const [overlayDescription, setOverlayDescription] = useState("");
  const [renderMode, setRenderMode] = useState<"ai" | "canvas">("ai");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  async function handleGenerate() {
    if (!file) { alert("Please upload your artwork first."); return; }
    setLoading(true);
    setError(null);
    setImages([]);
    if (renderMode === "canvas") {
      const config = TEMPLATE_CONFIG[productType];
      if (!config) {
        setError(`Sorry, no Canvas template available for "${productType}". Try AI Generation instead.`);
        setLoading(false);
        return;
      }
      try {
        if (!canvasRef.current) throw new Error("Canvas element not found.");
        const resultUrl = await compositeImageOnCanvas(canvasRef.current, config.baseUrl, file, config.placement);
        setImages([resultUrl]);
      } catch (err) { setError(err instanceof Error ? err.message : "Failed to render on canvas.");
      } finally { setLoading(false); }
    } else {
      const form = new FormData();
      form.set("file", file);
      form.set("productType", productType);
      form.set("aesthetic", aesthetic);
      form.set("photoStyle", photoStyle);
      form.set("props", propsSel);
      techSel.forEach(t => form.append("tech", t));
      form.set("freestyle", freestyle);
      form.set("overlayDescription", overlayDescription || "user-provided art (graphic/logo/illustration)");
      try {
        const res = await fetch("/api/generate", { method: "POST", body: form });
        if (!res.ok) throw new Error(`Server error: ${res.statusText}`);
        const { images: out } = await res.json();
        setImages(out);
      } catch (err) { setError(err instanceof Error ? err.message : "An unknown error occurred during AI generation.");
      } finally { setLoading(false); }
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6 space-y-8 bg-gray-50 min-h-screen">
      <header className="text-center space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">AI Mockup Generator</h1>
        <p className="text-gray-600">Instantly create product mockups using high-speed templates.</p>
      </header>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="border rounded-lg shadow-sm p-4 bg-white">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">1. Upload Your Artwork</h2>
            <input type="file" accept="image/png,image/jpeg" onChange={e => setFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            <p className="text-xs text-gray-500 mt-2">PNG with transparency recommended for best results.</p>
            {file && <p className="mt-2 text-sm font-medium text-green-700 break-words">File: {file.name}</p>}
          </div>
          <div className="border rounded-lg shadow-sm p-4 bg-white space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">2. Select Render Mode</h2>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="renderMode" value="ai" checked={renderMode === "ai"} onChange={() => setRenderMode("ai")} className="h-4 w-4 text-blue-600 focus:ring-blue-500"/>
                <div><span className="font-medium text-gray-900">AI Generation</span><p className="text-xs text-gray-500">Flexible scenes</p></div>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="renderMode" value="canvas" checked={renderMode === "canvas"} onChange={() => setRenderMode("canvas")} className="h-4 w-4 text-blue-600 focus:ring-blue-500"/>
                <div><span className="font-medium text-gray-900">Canvas Template</span><p className="text-xs text-gray-500">Instant results</p></div>
              </label>
            </div>
            {renderMode === 'canvas' && !TEMPLATE_CONFIG[productType] && (<p className="text-xs text-orange-600 bg-orange-50 p-2 rounded">Note: No pre-built template found for this product.</p>)}
          </div>
          <div className={`border rounded-lg shadow-sm p-4 space-y-4 bg-white transition-opacity duration-300 ${renderMode === 'canvas' ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
            <h2 className="text-lg font-semibold mb-1 text-gray-800">3. Customize AI Scene</h2>
            {renderMode === 'canvas' && <p className="text-sm text-gray-600 italic -mt-2 mb-3">AI controls are disabled in Canvas Template mode.</p>}
            <select className="w-full border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" value={productType} onChange={e => setProductType(e.target.value as ProductType)}>
              {PRODUCT_TYPES.map(o => <option key={o}>{o}</option>)}
            </select>
            <select className="w-full border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" value={aesthetic} onChange={e => setAesthetic(e.target.value as Aesthetic)} disabled={renderMode === 'canvas'}>
              {AESTHETICS.map(o => <option key={o}>{o}</option>)}
            </select>
            <select className="w-full border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" value={photoStyle} onChange={e => setPhotoStyle(e.target.value as PhotoStyle)} disabled={renderMode === 'canvas'}>
              {PHOTO_STYLES.map(o => <option key={o}>{o}</option>)}
            </select>
             <select className="w-full border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" value={propsSel} onChange={e => setPropsSel(e.target.value as Prop)} disabled={renderMode === 'canvas'}>
                {PROPS.map(o => <option key={o}>{o}</option>)}
              </select>
          </div>
          <button onClick={handleGenerate} disabled={loading || !file} className="w-full px-4 py-3 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200">
            {loading ? "Generating…" : "Generate Mockup"}
          </button>
        </div>
        <div className="md:col-span-2 space-y-4">
          {loading && (<div className="flex justify-center items-center h-full min-h-[300px] border-2 border-dashed rounded-lg bg-gray-50"><p className="text-gray-500 animate-pulse">Generating...</p></div>)}
          {error && <div className="text-red-600 bg-red-100 border border-red-300 rounded-lg p-3">{error}</div>}
          <div className={`grid grid-cols-1 gap-4 ${images.length > 1 ? "lg:grid-cols-2" : ""}`}>
            {images.map((src, i) => (
              <div key={i} className="border rounded-lg shadow-sm bg-white p-2 space-y-2">
                <img src={src} className="w-full h-auto rounded aspect-square object-cover" alt={`Generated Mockup ${i + 1}`} />
                <a className="inline-block px-4 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium" href={src} download={`mockup-${i + 1}.png`}>Download</a>
              </div>
            ))}
          </div>
          {!loading && images.length === 0 && !error && (<div className="flex justify-center items-center h-full min-h-[300px] border-2 border-dashed rounded-lg bg-gray-50"><p className="text-gray-500 text-center px-4">Upload artwork and click generate to see results here.</p></div>)}
        </div>
      </section>
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
    </main>
  );
}

