import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image, Wand2, Download, Maximize2, Minimize2, ZoomIn, ZoomOut,
  Sparkles, Palette, ArrowLeft, Plus, Trash2,
  ChevronDown, Settings2, Layers, Grid3X3,
  ImagePlus, MessageSquare, X, Check, Copy,
  Loader2, AlertCircle, RotateCcw, Upload, Key
} from "lucide-react";

const IMAGE_MODELS = [
  { id: "gemini-3.1-flash-image-preview", name: "Nano Banana 2", badge: "Latest", description: "4K output, search grounding, thinking", provider: "gemini" },
  { id: "gemini-2.5-flash-image", name: "Nano Banana", badge: "Stable", description: "Fast, high-volume generation", provider: "gemini" },
  { id: "chatgpt-image-latest", name: "ChatGPT Image", badge: "Latest", description: "Latest ChatGPT image model, editing support", provider: "openai", supportsImageInput: true },
  { id: "gpt-image-1.5", name: "GPT Image 1.5", badge: "New", description: "Best quality, image input support", provider: "openai", supportsImageInput: true },
  { id: "gpt-image-1", name: "GPT Image 1", badge: "OpenAI", description: "High-quality with image editing", provider: "openai", supportsImageInput: true },
  { id: "gpt-image-1-mini", name: "GPT Image Mini", badge: "Fast", description: "Quick generation, lower cost", provider: "openai", supportsImageInput: true },
  { id: "dall-e-3", name: "DALL·E 3", badge: "OpenAI", description: "Creative generation, no image input", provider: "openai" },
  { id: "dall-e-2", name: "DALL·E 2", badge: "Legacy", description: "Variations & edits, basic quality", provider: "openai" },
];

const ASPECT_RATIOS = [
  { label: "1:1", value: "1:1", icon: "⬜" },
  { label: "16:9", value: "16:9", icon: "▬" },
  { label: "9:16", value: "9:16", icon: "▮" },
  { label: "4:3", value: "4:3", icon: "▭" },
  { label: "3:4", value: "3:4", icon: "▯" },
];

const RESOLUTIONS = [
  { label: "1K", value: "1024" },
  { label: "2K", value: "2048" },
  { label: "4K", value: "4096" },
];

const STYLE_PRESETS = [
  { label: "None", value: "", color: "bg-gray-600" },
  { label: "Photo", value: "photorealistic", color: "bg-blue-600" },
  { label: "Digital", value: "digital art", color: "bg-purple-600" },
  { label: "Oil", value: "oil painting", color: "bg-amber-600" },
  { label: "Watercolor", value: "watercolor", color: "bg-cyan-600" },
  { label: "Anime", value: "anime style", color: "bg-pink-600" },
  { label: "3D", value: "3d render", color: "bg-emerald-600" },
  { label: "Sketch", value: "pencil sketch", color: "bg-gray-400" },
  { label: "Pixel", value: "pixel art", color: "bg-orange-600" },
];

const SUGGESTIONS = [
  "A dreamy sunset over snow-capped mountains",
  "Minimalist tech logo with clean geometric lines",
  "Fantasy character portrait with glowing runes",
  "Cyberpunk cityscape at night with neon signs",
  "Watercolor painting of a Japanese garden in spring",
  "Steampunk airship floating above Victorian London",
  "Macro photo of dewdrops on a spider web at dawn",
  "Abstract neural network visualization, glowing nodes",
  "Cozy cabin interior with fireplace and bookshelves",
  "Futuristic space station orbiting a gas giant",
  "Art deco poster for a 1920s jazz club",
  "Underwater kingdom with bioluminescent coral reefs",
  "Isometric pixel art of a tiny medieval village",
  "Double exposure portrait blending forest and woman",
  "Product shot of luxury perfume bottle, dramatic lighting",
  "Vintage travel poster for Mars colonization",
  "Mystical library with floating books and starlight",
  "3D render of chrome liquid metal sculpture",
  "Hand-drawn botanical illustration of exotic orchids",
  "Neon-lit Tokyo alley in the rain, reflections",
  "Surreal melting clock landscape, Dalí inspired",
  "Cute robot gardener tending to a rooftop garden",
  "Ancient Greek temple at golden hour, misty",
  "Flat design app icon for a meditation app",
  "Dramatic storm clouds over a lavender field",
  "Retro-futuristic car design concept, chrome and fins",
  "Low-poly geometric wolf head, vibrant gradients",
  "Enchanted mushroom forest with fairy lights",
  "Minimalist line art portrait, single continuous line",
  "Photorealistic gemstone collection on velvet, top-down",
  "Sci-fi battle mech in a dystopian wasteland",
  "Whimsical hot air balloon festival at sunset",
  "Dark fantasy throne room with dragon skulls",
  "Clean UI dashboard mockup, glassmorphism style",
  "Aurora borealis over a frozen Scandinavian lake",
  "Graffiti street art mural of a phoenix rising",
  "Elegant wedding invitation design, gold foil",
  "Microscopic view of crystal structures, vivid colors",
  "Samurai standing in cherry blossom rain",
  "Mid-century modern living room, warm tones",
  "Fractal art mandala with cosmic colors",
  "Food photography: artisan sourdough bread, rustic table",
  "Cinematic shot of a lone astronaut on the moon",
  "Kawaii pastel illustration of a cat café",
  "Gothic cathedral interior with stained glass light beams",
  "Blueprint-style technical drawing of a rocket engine",
  "Tropical beach at sunset with palm silhouettes",
  "Origami crane field, paper art, soft shadows",
  "Vaporwave aesthetic mountain landscape, pink and teal",
  "Wildlife photography: majestic eagle mid-flight",
  "Art nouveau poster of a flower goddess",
  "Tilt-shift miniature effect of a bustling city",
  "Ethereal angel wings made of light and smoke",
  "Retro 8-bit game screenshot of a dungeon crawler",
  "Professional headshot background, soft gradient bokeh",
  "Bonsai tree growing from a cracked geode",
  "Cybernetic eye close-up, circuits and human iris",
  "Provence countryside with sunflower fields, oil painting",
  "Abstract data visualization, flowing particle streams",
  "Steaming cup of coffee with latte art, moody light",
  "Alien planet landscape with two moons rising",
  "Pop art portrait in bold primary colors",
  "Snowy mountain cabin with warm glowing windows",
  "Mechanical clockwork heart, brass and copper",
  "Zen rock garden with raked sand patterns",
  "Concept art: floating islands connected by bridges",
  "Photorealistic diamond ring on marble surface",
  "Vintage comic book cover, superhero action pose",
  "Misty bamboo forest path, morning light",
  "Abstract oil painting, bold brushstrokes, emotion",
  "Futuristic city skyline reflected in calm water",
  "Tattoo design: sacred geometry with lotus flower",
  "Children's book illustration of a friendly dragon",
  "Moody film noir detective scene, shadow and light",
  "Holographic gradient abstract shapes, iridescent",
  "Ancient map with sea monsters and compass rose",
  "Fashion editorial shot, avant-garde dress, studio",
  "Terrarium ecosystem in a glass sphere",
  "Circuit board landscape, macro photography style",
  "Magical potion bottles on an alchemist's shelf",
  "Minimalist mountain range silhouette, gradient sky",
  "Baroque still life with fruits and flowers",
  "Drone view of autumn forest, river winding through",
  "Glitch art portrait, digital distortion effects",
  "Cozy reading nook by a rain-streaked window",
  "Crystal cave interior with purple amethyst walls",
  "Logo design for an AI startup, neural motif",
  "Northern lights reflected in a wolf's eye",
];

const MARQUEE_ROWS = [
  SUGGESTIONS.slice(0, 11),
  SUGGESTIONS.slice(11, 22),
  SUGGESTIONS.slice(22, 33),
  SUGGESTIONS.slice(33, 44),
  SUGGESTIONS.slice(44, 55),
  SUGGESTIONS.slice(55, 66),
  SUGGESTIONS.slice(66, 77),
  SUGGESTIONS.slice(77, 88),
];

interface GeneratedImage {
  id: string;
  prompt: string;
  data: string;
  mimeType: string;
  model: string;
  timestamp: number;
}

export default function ImageWorkstation() {
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(IMAGE_MODELS[0]);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [resolution, setResolution] = useState("1024");
  const [stylePreset, setStylePreset] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [numImages, setNumImages] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [copied, setCopied] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<{data: string; mimeType: string; preview: string}[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [lastPinchDist, setLastPinchDist] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const [modelPickerPos, setModelPickerPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setShowSettings(mq.matches);
  }, []);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 20 * 1024 * 1024) { setError("Image must be under 20MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setUploadedImages(prev => [...prev, { data: result.split(",")[1], mimeType: file.type, preview: result }]);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    Array.from(e.dataTransfer.files).forEach(processFile);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(processFile);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [processFile]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;
    const modelDef = selectedModel as typeof IMAGE_MODELS[number] & { supportsImageInput?: boolean };
    if (uploadedImages.length > 0 && selectedModel.provider !== "gemini" && !modelDef.supportsImageInput) {
      setError(`${selectedModel.name} does not support reference images. Remove them or switch to a Gemini or GPT Image model.`);
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prompt: prompt.trim(),
          model: selectedModel.id,
          aspect_ratio: aspectRatio,
          resolution,
          style_preset: stylePreset || undefined,
          negative_prompt: negativePrompt.trim() || undefined,
          num_images: numImages,
          input_images: uploadedImages.length > 0
            ? uploadedImages.map(img => ({ data: img.data, mimeType: img.mimeType }))
            : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Error ${res.status}`);
      }
      const data = await res.json();
      const newImages: GeneratedImage[] = (data.images || []).map((img: { data: string; mimeType: string }, i: number) => ({
        id: `${Date.now()}-${i}`,
        prompt: prompt.trim(),
        data: img.data,
        mimeType: img.mimeType,
        model: selectedModel.name,
        timestamp: Date.now(),
      }));
      if (newImages.length > 0) {
        setImages(prev => [...newImages, ...prev]);
        setSelectedImage(newImages[0]);
      }
    } catch (e: any) {
      setError(e.message || "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, selectedModel, aspectRatio, resolution, stylePreset, negativePrompt, numImages, isGenerating, uploadedImages]);

  const handleDownload = useCallback((img: GeneratedImage) => {
    const ext = img.mimeType.includes("png") ? "png" : "jpg";
    const a = document.createElement("a");
    a.href = `data:${img.mimeType};base64,${img.data}`;
    a.download = `image-${img.id}.${ext}`;
    a.click();
  }, []);

  const handleCopy = useCallback((img: GeneratedImage) => {
    navigator.clipboard.writeText(img.data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
    if (selectedImage?.id === id) setSelectedImage(null);
  }, [selectedImage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
  };

  const openFullscreen = useCallback(() => {
    if (!selectedImage) return;
    setZoom(1); setPan({ x: 0, y: 0 }); setFullscreen(true);
  }, [selectedImage]);

  const closeFullscreen = useCallback(() => {
    setFullscreen(false); setZoom(1); setPan({ x: 0, y: 0 }); setLastPinchDist(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(8, Math.max(0.25, z - e.deltaY * 0.002)));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    setIsPanning(true); setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [pan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning || e.pointerType === "touch") return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  }, [isPanning, panStart]);

  const handlePointerUp = useCallback(() => { setIsPanning(false); }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastPinchDist !== null) {
        const scale = dist / lastPinchDist;
        setZoom(z => Math.min(8, Math.max(0.25, z * scale)));
      }
      setLastPinchDist(dist);
    } else if (e.touches.length === 1 && zoom > 1) {
      if (!isPanning) { setIsPanning(true); setPanStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y }); }
      else { setPan({ x: e.touches[0].clientX - panStart.x, y: e.touches[0].clientY - panStart.y }); }
    }
  }, [lastPinchDist, zoom, isPanning, pan, panStart]);

  const handleTouchEnd = useCallback(() => { setLastPinchDist(null); setIsPanning(false); }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFullscreen();
      if (e.key === "+" || e.key === "=") setZoom(z => Math.min(8, z * 1.2));
      if (e.key === "-") setZoom(z => Math.max(0.25, z / 1.2));
      if (e.key === "0") { setZoom(1); setPan({ x: 0, y: 0 }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, closeFullscreen]);

  const settingsPanel = (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Grid3X3 className="w-3.5 h-3.5" />Aspect Ratio
        </h3>
        <div className="grid grid-cols-5 gap-1.5">
          {ASPECT_RATIOS.map((ratio) => (
            <button key={ratio.value} onClick={() => setAspectRatio(ratio.value)}
              className={`p-2 rounded-lg text-center transition-all ${
                aspectRatio === ratio.value
                  ? "iw-active-option border border-white/[0.1]"
                  : "bg-white/[0.03] border border-white/[0.06] text-gray-500 hover:text-gray-300"
              }`} data-testid={`button-ratio-${ratio.value}`}>
              <span className="text-sm leading-none">{ratio.icon}</span>
              <span className={`text-[10px] block mt-1 ${aspectRatio === ratio.value ? "iw-active-option-text" : ""}`}>{ratio.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Maximize2 className="w-3.5 h-3.5" />Resolution
        </h3>
        <div className="flex gap-1.5">
          {RESOLUTIONS.map((res) => (
            <button key={res.value} onClick={() => setResolution(res.value)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                resolution === res.value
                  ? "iw-active-option border border-white/[0.1] iw-active-option-text"
                  : "bg-white/[0.03] border border-white/[0.06] text-gray-500 hover:text-gray-300"
              }`} data-testid={`button-res-${res.value}`}>
              {res.label}
            </button>
          ))}
        </div>
        {selectedModel.id === "gemini-2.5-flash-image" && resolution === "4096" && (
          <p className="text-[10px] text-amber-400/70 mt-1.5">4K requires Nano Banana 2</p>
        )}
        {selectedModel.provider === "openai" && (
          <p className="text-[10px] text-gray-500 mt-1.5">DALL·E uses fixed sizes per aspect ratio</p>
        )}
      </div>

      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Palette className="w-3.5 h-3.5" />Style
        </h3>
        <div className="grid grid-cols-3 gap-1.5">
          {STYLE_PRESETS.map((style) => (
            <button key={style.value || "none"} onClick={() => setStylePreset(style.value)}
              className={`p-2 rounded-lg text-center transition-all ${
                stylePreset === style.value
                  ? "iw-active-option border border-white/[0.1]"
                  : "bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12]"
              }`} data-testid={`button-style-${style.label.toLowerCase()}`}>
              <div className={`w-4 h-4 rounded-full ${style.color} mx-auto mb-1`} />
              <span className="text-[10px] text-gray-400">{style.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Layers className="w-3.5 h-3.5" />Advanced
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">Negative Prompt</label>
            <input type="text" value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)}
              placeholder="Things to avoid..."
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder-gray-600 focus:border-violet-500/40 outline-none transition-colors"
              data-testid="input-negative-prompt" />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 flex items-center justify-between mb-1">
              <span>Images</span>
              <span className="iw-active-option-text">{numImages}</span>
            </label>
            <input type="range" min={1} max={selectedModel.provider === "openai" && selectedModel.id === "dall-e-3" ? 1 : 4}
              value={numImages} onChange={e => setNumImages(Number(e.target.value))}
              className="w-full accent-violet-500" data-testid="input-num-images" />
            {selectedModel.id === "dall-e-3" && (
              <p className="text-[10px] text-gray-500 mt-0.5">DALL·E 3 supports 1 image per request</p>
            )}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-white/[0.06]">
        <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
          <span>Model</span><span className="text-gray-400">{selectedModel.name}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
          <span>Provider</span><span className="text-gray-400 capitalize">{selectedModel.provider}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
          <span>Ratio</span><span className="text-gray-400">{aspectRatio}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-500">
          <span>Style</span><span className="text-gray-400">{stylePreset || "None"}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#07070c] text-white flex flex-col" data-testid="image-workstation">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="iw-aurora iw-aurora-1" />
        <div className="iw-aurora iw-aurora-2" />
        <div className="iw-aurora iw-aurora-3" />
        <div className="iw-aurora iw-aurora-4" />
      </div>

      <header className="border-b border-white/[0.06] iw-glass shrink-0 z-50 relative iw-spotlight">
        <div className="flex h-14 items-center px-3 md:px-4 gap-2 md:gap-3">
          <button onClick={() => setLocation("/aios")}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors shrink-0"
            data-testid="button-back-dashboard">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs hidden sm:inline">Back</span>
          </button>

          <div className="h-5 w-px bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-2 shrink-0">
            <img src="/favicon.png" alt="" className="w-7 h-7 object-contain"
              style={{ filter: 'drop-shadow(0 0 8px rgba(6,182,212,0.4)) drop-shadow(0 0 3px rgba(139,92,246,0.25))' }} />
            <div className="flex flex-col items-start leading-none">
              <div className="flex items-baseline gap-0">
                <span className="text-[15px] font-bold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">Ai</span>
                <span className="text-[15px] font-light tracking-tight ace-text-shimmer">Assist</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="h-[1px] w-3 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                <span className="text-[7px] font-semibold tracking-[0.25em] uppercase ace-text-shimmer">Secure</span>
                <div className="h-[1px] w-3 bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
              </div>
            </div>
          </div>

          <div className="flex-1" />

          <div className="relative" ref={modelPickerRef}>
            <button onClick={() => {
              if (!showModelPicker && modelPickerRef.current) {
                const rect = modelPickerRef.current.getBoundingClientRect();
                setModelPickerPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
              }
              setShowModelPicker(!showModelPicker);
            }}
              className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] transition-colors text-xs md:text-sm"
              data-testid="button-model-picker">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span>{selectedModel.name}</span>
              <span className="text-[10px] px-1 py-0.5 rounded iw-badge-gradient text-white/80">{selectedModel.badge}</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
          </div>

          <button onClick={() => {
              if (window.innerWidth < 768) setShowMobileSettings(!showMobileSettings);
              else setShowSettings(!showSettings);
            }}
            className={`p-2 rounded-lg transition-colors ${showSettings || showMobileSettings ? "bg-white/[0.08] text-white" : "text-gray-500 hover:text-gray-300"}`}
            data-testid="button-toggle-settings">
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {showMobileSettings && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="md:hidden overflow-hidden border-b border-white/[0.06] iw-glass z-40 relative">
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {settingsPanel}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex overflow-hidden relative z-10">
        <div className="flex-1 flex flex-col min-w-0">
          <div className={`flex-1 flex items-center justify-center p-3 md:p-6 relative overflow-hidden transition-colors ${isDragging ? "bg-violet-500/[0.05]" : ""}`}
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}>

            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" data-testid="input-file-upload" />

            <AnimatePresence>
              {isDragging && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-4 border-2 border-dashed border-violet-500/40 rounded-2xl flex items-center justify-center bg-violet-500/[0.05] backdrop-blur-sm z-30">
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-violet-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-violet-300">Drop images here</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div key="loading" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center gap-4 relative z-10">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl iw-badge-gradient border border-white/[0.08] flex items-center justify-center">
                      <Loader2 className="w-8 h-8 iw-text-gradient animate-spin" style={{ WebkitTextFillColor: 'unset' }} />
                    </div>
                    <div className="absolute -inset-4 rounded-3xl iw-glow-ring border border-cyan-500/20" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-300">Generating with {selectedModel.name}...</p>
                    <p className="text-xs text-gray-600 mt-1">This may take 10-30 seconds</p>
                  </div>
                </motion.div>
              ) : selectedImage ? (
                <motion.div key="viewer" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="relative max-w-full max-h-full flex flex-col items-center z-10">
                  <div className="rounded-2xl overflow-hidden shadow-2xl shadow-cyan-900/10 max-h-[calc(100vh-300px)] md:max-h-[calc(100vh-240px)] border border-white/[0.08] cursor-zoom-in iw-img-frame"
                    onClick={openFullscreen}>
                    <img key={selectedImage.id} src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`}
                      alt={selectedImage.prompt}
                      className="max-w-full max-h-[calc(100vh-300px)] md:max-h-[calc(100vh-240px)] object-contain"
                      data-testid="img-generated" />
                  </div>
                  <div className="mt-3 flex items-center gap-1 iw-glass rounded-xl px-2.5 py-1.5">
                    <button onClick={() => handleDownload(selectedImage)}
                      className="p-1.5 rounded-lg hover:bg-white/[0.05] text-gray-400 hover:text-white transition-colors" data-testid="button-download">
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleCopy(selectedImage)}
                      className="p-1.5 rounded-lg hover:bg-white/[0.05] text-gray-400 hover:text-white transition-colors" data-testid="button-copy">
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <div className="h-4 w-px bg-white/10" />
                    <button onClick={openFullscreen}
                      className="p-1.5 rounded-lg hover:bg-white/[0.05] text-gray-400 hover:text-white transition-colors" data-testid="button-fullscreen">
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setSelectedImage(null)}
                      className="p-1.5 rounded-lg hover:bg-white/[0.05] text-gray-400 hover:text-white transition-colors" data-testid="button-new">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-2 max-w-xs text-center truncate px-2">
                    {selectedImage.model} — {selectedImage.prompt}
                  </p>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="w-full h-full flex flex-col items-center justify-center relative z-10 overflow-hidden">
                  <div className="w-full flex flex-col items-center">
                    <div className="text-center mb-3 px-4">
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl iw-badge-gradient border border-white/[0.06] flex items-center justify-center mx-auto mb-2">
                        <ImagePlus className="w-5 h-5 md:w-6 md:h-6 text-white/50" />
                      </div>
                      <h2 className="text-sm md:text-base font-semibold iw-text-gradient mb-0.5">Create Something Beautiful</h2>
                      <p className="text-[11px] text-gray-500">Pick a prompt or type your own</p>
                    </div>
                  </div>

                  <div className="w-full flex flex-col justify-center gap-2 md:gap-2.5 overflow-hidden marquee-container">
                    {MARQUEE_ROWS.map((row, rowIdx) => (
                      <div key={rowIdx} className="relative overflow-hidden w-full" style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)' }}>
                        <div className={`marquee-track marquee-row-${rowIdx}`}
                          style={{ ['--marquee-duration' as string]: `${120 + rowIdx * 15}s`, animationDirection: rowIdx % 2 === 0 ? 'normal' : 'reverse' } as React.CSSProperties}>
                          {[...row, ...row].map((s, i) => (
                            <button key={`${rowIdx}-${i}`}
                              onClick={() => { setPrompt(s); textareaRef.current?.focus(); }}
                              className="marquee-pill group shrink-0"
                              data-testid={`button-suggestion-${rowIdx}-${i % row.length}`}>
                              <span className="marquee-pill-border" />
                              <span className="relative z-10 px-3 py-1.5 md:px-3.5 md:py-2 text-[11px] md:text-xs text-gray-400 group-hover:text-white transition-colors whitespace-nowrap">
                                {s}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {images.length > 0 && (
            <div className="px-3 md:px-4 pb-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">Session ({images.length})</span>
                <button onClick={() => { setImages([]); setSelectedImage(null); }}
                  className="text-[10px] text-gray-600 hover:text-red-400 transition-colors">Clear</button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {images.map((img) => (
                  <div key={img.id} className={`shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-xl transition-all overflow-visible relative cursor-pointer ${
                      selectedImage?.id === img.id ? "iw-selected-ring border-transparent" : "border border-white/[0.06] hover:border-white/[0.15]"
                    }`} onClick={() => setSelectedImage(img)} data-testid={`button-gallery-${img.id}`}>
                    <img src={`data:${img.mimeType};base64,${img.data}`} alt={img.prompt} className="w-full h-full object-cover pointer-events-none" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity items-center justify-center hidden md:flex">
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(img.id); }} className="p-1">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={() => setSelectedImage(null)}
                  className="shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-xl border border-dashed border-white/[0.08] hover:border-violet-500/30 flex items-center justify-center transition-colors"
                  data-testid="button-new-image">
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          )}

          <div className="p-3 md:p-4 border-t border-white/[0.06] bg-[#0d0d14] relative z-10">
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-2">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1 break-words">{error}</span>
                    <button onClick={() => setError(null)}><X className="w-3 h-3 shrink-0" /></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {uploadedImages.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-violet-400/70 font-medium">Reference</span>
                  <span className="text-[10px] text-gray-600">({uploadedImages.length})</span>
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {uploadedImages.map((img, i) => (
                    <div key={i} className="relative shrink-0 w-14 h-14 rounded-lg overflow-visible group" data-testid={`ref-image-${i}`}>
                      <div className="w-full h-full rounded-lg overflow-hidden border border-white/10">
                        <img src={img.preview} alt={`Reference ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                      <button onClick={() => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-lg shadow-black/40 transition-colors z-10"
                        data-testid={`button-remove-ref-${i}`}>
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <textarea ref={textareaRef} value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="Describe the image you want to create..."
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 text-sm text-white placeholder-gray-600 resize-none transition-all outline-none pr-10"
                  rows={2} data-testid="input-prompt" />
                <div className="absolute right-2 bottom-2 flex items-center gap-0.5">
                  <button onClick={() => {
                      const model = selectedModel as typeof IMAGE_MODELS[number] & { supportsImageInput?: boolean };
                      if (selectedModel.provider !== "gemini" && !model.supportsImageInput) {
                        setError(`${selectedModel.name} does not support reference images. Switch to a Gemini or GPT Image model.`);
                        return;
                      }
                      fileInputRef.current?.click();
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/[0.05] text-gray-500 hover:text-gray-300 transition-colors" data-testid="button-attach-image"
                    title="Upload reference image">
                    <ImagePlus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating}
                className="self-end px-4 md:px-5 py-2.5 md:py-3 rounded-xl iw-gen-btn disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm flex items-center gap-2 shrink-0"
                data-testid="button-generate">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                <span className="hidden sm:inline">Generate</span>
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showSettings && (
            <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              className="border-l border-white/[0.06] iw-glass overflow-y-auto overflow-x-hidden shrink-0 hidden md:block">
              <div className="w-[280px] p-4">
                {settingsPanel}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {createPortal(
        <AnimatePresence>
          {showModelPicker && (
            <>
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" style={{ zIndex: 99998 }} onClick={() => setShowModelPicker(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 flex items-start justify-center pt-[15vh]" style={{ zIndex: 99999, pointerEvents: 'none' }}>
                <div className="w-80 md:w-96 iw-glass rounded-2xl shadow-2xl iw-moving-border max-h-[65vh] overflow-y-auto" style={{ pointerEvents: 'auto' }}>
                  {IMAGE_MODELS.map((model) => (
                    <button key={model.id} onClick={() => { setSelectedModel(model); setShowModelPicker(false); }}
                      className={`w-full p-3 flex items-start gap-3 hover:bg-white/[0.05] transition-colors text-left ${selectedModel.id === model.id ? "iw-active-option" : ""}`}
                      data-testid={`button-model-${model.id}`}>
                      <div className="w-7 h-7 rounded-lg iw-badge-gradient flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-white/80" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${selectedModel.id === model.id ? "iw-text-gradient" : ""}`}>{model.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded iw-badge-gradient text-white/80">{model.badge}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{model.description}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5 font-mono truncate">{model.id}</p>
                      </div>
                      {selectedModel.id === model.id && <Check className="w-4 h-4 text-cyan-400 ml-auto shrink-0 mt-1" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      <AnimatePresence>
        {fullscreen && selectedImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col" data-testid="fullscreen-viewer">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" />
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-violet-600/[0.04] blur-[120px]" />
              <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-600/[0.03] blur-[100px]" />
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 25% 25%, rgba(139,92,246,0.03) 0%, transparent 50%),
                  radial-gradient(circle at 75% 75%, rgba(6,182,212,0.02) 0%, transparent 50%)`,
              }} />
              <svg className="absolute inset-0 w-full h-full opacity-[0.015]">
                <defs>
                  <pattern id="fs-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                    <line x1="60" y1="0" x2="60" y2="60" stroke="white" strokeWidth="0.5" />
                    <line x1="0" y1="60" x2="60" y2="60" stroke="white" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#fs-grid)" />
              </svg>
            </div>

            <div className="relative z-10 flex items-center justify-between px-4 py-3 shrink-0">
              <div className="flex items-center gap-3">
                <img src="/favicon.png" alt="" className="w-6 h-6 object-contain"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(6,182,212,0.3))' }} />
                <span className="text-xs text-white/40 truncate max-w-[200px] md:max-w-none">{selectedImage.prompt}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-white/30 mr-2 hidden sm:inline">{Math.round(zoom * 100)}%</span>
                <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                  className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors" title="Reset (0)">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={() => setZoom(z => Math.max(0.25, z / 1.3))}
                  className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors" title="Zoom out (-)">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button onClick={() => setZoom(z => Math.min(8, z * 1.3))}
                  className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors" title="Zoom in (+)">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={() => handleDownload(selectedImage)}
                  className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors">
                  <Download className="w-4 h-4" />
                </button>
                <div className="h-4 w-px bg-white/10 mx-1" />
                <button onClick={closeFullscreen}
                  className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors" title="Close (Esc)">
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div ref={canvasRef}
              className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing touch-none select-none"
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}>
              <div className="absolute inset-0 flex items-center justify-center"
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transition: isPanning ? 'none' : 'transform 0.1s ease-out' }}>
                <img src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`}
                  alt={selectedImage.prompt}
                  className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg pointer-events-none"
                  style={{ filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.5)) drop-shadow(0 0 80px rgba(139,92,246,0.08))' }}
                  draggable={false} />
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-center gap-4 py-3 px-4">
              <span className="text-[10px] text-white/20">{selectedImage.model}</span>
              <div className="h-3 w-px bg-white/10" />
              <span className="text-[10px] text-white/20">Scroll to zoom · Drag to pan · Esc to close</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
