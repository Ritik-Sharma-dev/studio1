
'use client';

import { useState, useEffect, useRef } from 'react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Slider } from "@/components/ui/slider";
import {
  Download,
  RotateCcw,
  AlertCircle,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Upload,
  Paintbrush,
  RotateCw, 
  FlipHorizontal,
  FlipVertical,
  Crop,
  Undo,
  Redo,
} from 'lucide-react';
import { generateImage } from '@/ai/flows/generate-image';
import { editImage } from '@/ai/flows/edit-image';
import { useToast } from "@/hooks/use-toast";

const VisionaryLogo = () => (
  <svg
    width="56"
    height="56"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-primary"
  >
    <path d="M12 2L9.17157 4.82843L6.34315 2L4.82843 4.82843L2 6.34315L4.82843 9.17157L2 12L4.82843 14.8284L2 17.6569L4.82843 19.1716L6.34315 22L9.17157 19.1716L12 22L14.8284 19.1716L17.6569 22L19.1716 19.1716L22 17.6569L19.1716 14.8284L22 12L19.1716 9.17157L22 6.34315L19.1716 4.82843L17.6569 2L14.8284 4.82843L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="3" fill="currentColor"/>
  </svg>
);


export default function ImageForge() {
  const [prompt, setPrompt] = useState<string>('');
  const [editPrompt, setEditPrompt] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploadedImage, setIsUploadedImage] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [imageHistory, setImageHistory] = useState<string[]>([]);
  const [activeLoader, setActiveLoader] = useState<'generate' | 'edit' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Manual Edit State
  const [isManualEditingOpen, setIsManualEditingOpen] = useState(false);
  const [imageForManualEdit, setImageForManualEdit] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [brightness, setBrightness] = useState(100); // 0-200, 100 is default
  const [contrast, setContrast] = useState(100);   // 0-200, 100 is default
  const [saturation, setSaturation] = useState(100); // 0-200, 100 is default
  const [manualEditHistory, setManualEditHistory] = useState<string[]>([]);
  const [manualEditHistoryIndex, setManualEditHistoryIndex] = useState(-1);


  const updateImageHistory = (newImageUrl: string) => {
    setImageHistory(prevHistory => {
      const updatedHistory = [newImageUrl, ...prevHistory.filter(url => url !== newImageUrl)];
      return updatedHistory.slice(0, 5);
    });
  };

  const pushToManualEditHistory = (dataUrl: string) => {
    const newHistory = manualEditHistory.slice(0, manualEditHistoryIndex + 1);
    newHistory.push(dataUrl);
    setManualEditHistory(newHistory);
    setManualEditHistoryIndex(newHistory.length - 1);
  };

  const drawImageOnCanvas = (
    imageToDrawUrl: string | null = imageForManualEdit,
    currentBrightness = brightness,
    currentContrast = contrast,
    currentSaturation = saturation
  ) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || !imageToDrawUrl) return;

    const img = new window.Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.filter = `brightness(${currentBrightness}%) contrast(${currentContrast}%) saturate(${currentSaturation}%)`;
      ctx.drawImage(img, 0, 0);
    };
    img.src = imageToDrawUrl;
  };


  useEffect(() => {
    if (isManualEditingOpen && manualEditHistory[manualEditHistoryIndex]) {
      drawImageOnCanvas(manualEditHistory[manualEditHistoryIndex], brightness, contrast, saturation);
    }
  }, [brightness, contrast, saturation, isManualEditingOpen, manualEditHistory, manualEditHistoryIndex]);


  useEffect(() => {
    if (isManualEditingOpen && imageForManualEdit && manualEditHistory.length === 0) {
        setManualEditHistory([imageForManualEdit]);
        setManualEditHistoryIndex(0);
        drawImageOnCanvas(imageForManualEdit, 100, 100, 100); // Draw with default filters initially
    } else if (isManualEditingOpen && manualEditHistory[manualEditHistoryIndex]) {
        drawImageOnCanvas(manualEditHistory[manualEditHistoryIndex], brightness, contrast, saturation);
    }
  }, [isManualEditingOpen, imageForManualEdit]); // Removed manualEditHistory from deps to avoid potential loops on its modification


  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to generate an image.');
      return;
    }
    setIsLoading(true);
    setActiveLoader('generate');
    setError(null);
    setImageUrl(null);
    setIsUploadedImage(false);

    try {
      const result = await generateImage({ prompt });
      setImageUrl(result.imageUrl);
      updateImageHistory(result.imageUrl);
      setEditPrompt('');
    } catch (e) {
      console.error(e);
      setError('Could not generate image. Please try again or refine your prompt.');
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "An error occurred while generating the image.",
      });
    } finally {
      setIsLoading(false);
      setActiveLoader(null);
    }
  };

  const handleEditImage = async () => {
    if (!editPrompt.trim()) {
      setError('Please enter a prompt to edit the image.');
      return;
    }
    if (!imageUrl) {
      setError('No image to edit. Please generate or upload an image first.');
      return;
    }
    setIsLoading(true);
    setActiveLoader('edit');
    setError(null);

    try {
      const result = await editImage({ existingImageDataUri: imageUrl, newPrompt: editPrompt });
      setImageUrl(result.editedImageDataUri);
      updateImageHistory(result.editedImageDataUri);
      setIsUploadedImage(false);
    } catch (e) {
      console.error(e);
      setError('Could not edit image. Please try again or refine your edit prompt.');
      toast({
        variant: "destructive",
        title: "Editing Failed",
        description: "An error occurred while editing the image.",
      });
    } finally {
      setIsLoading(false);
      setActiveLoader(null);
    }
  };

  const handleManualEdit = () => {
    if (!imageUrl) {
      toast({
        variant: 'destructive',
        title: 'No Image',
        description: 'Please generate or upload an image first to manually edit.',
      });
      return;
    }
    setImageForManualEdit(imageUrl);
    setManualEditHistory([imageUrl]);
    setManualEditHistoryIndex(0);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setIsManualEditingOpen(true);
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Invalid file type. Please upload an image.');
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: "Please select a valid image file (e.g., PNG, JPG).",
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        setImageUrl(dataUri);
        updateImageHistory(dataUri);
        setEditPrompt('');
        setError(null);
        setPrompt('');
        setIsUploadedImage(true);
        toast({
          title: "Image Uploaded",
          description: "Your image is ready to be edited.",
        });
      };
      reader.onerror = () => {
        setError('Failed to read the uploaded file.');
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: "There was an error reading your image file.",
        });
      };
      reader.readAsDataURL(file);
    }
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleDownloadImage = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    const safePrompt = prompt || editPrompt || 'visionary_image';
    const filename = safePrompt.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30);
    const extension = imageUrl.startsWith('data:image/') ? imageUrl.substring(imageUrl.indexOf('/') + 1, imageUrl.indexOf(';')) : 'png';
    link.download = `${filename || 'visionary_image'}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setPrompt('');
    setEditPrompt('');
    setImageUrl(null);
    setError(null);
    setIsUploadedImage(false);
  };

  const handleHistoryImageClick = (histImageUrl: string) => {
    setImageUrl(histImageUrl);
    setEditPrompt('');
    setError(null);
    setIsUploadedImage(histImageUrl.startsWith('data:image/') && !imageHistory.some(item => item === histImageUrl && !item.startsWith('blob:'))); // A bit of a heuristic
  };

  // Manual Edit Action Handlers
  const applyCanvasTransformation = (transformation: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, img: HTMLImageElement) => void) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const currentImageFromHistory = manualEditHistory[manualEditHistoryIndex];
    if (!ctx || !canvas || !currentImageFromHistory) return;

    const img = new window.Image();
    img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        tempCanvas.width = img.naturalWidth;
        tempCanvas.height = img.naturalHeight;
        tempCtx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
        tempCtx.drawImage(img, 0, 0);
        
        const filteredImage = new window.Image();
        filteredImage.onload = () => {
            // Determine new canvas dimensions BEFORE drawing for rotations
            let newWidth = filteredImage.naturalWidth;
            let newHeight = filteredImage.naturalHeight;
            if (transformation.name.includes("handleRotate")) { // Check if it's a rotation
                 const imgForDim = new window.Image();
                 imgForDim.src = currentImageFromHistory; // Use original for dimension check pre-filter
                 if (Math.abs(parseFloat(transformation.name.split("handleRotate")[1] || "0")) === 90) { // A bit hacky way to check degrees
                    newWidth = imgForDim.naturalHeight;
                    newHeight = imgForDim.naturalWidth;
                 } else {
                    newWidth = imgForDim.naturalWidth;
                    newHeight = imgForDim.naturalHeight;
                 }
            } else {
                 newWidth = filteredImage.naturalWidth;
                 newHeight = filteredImage.naturalHeight;
            }

            canvas.width = newWidth;
            canvas.height = newHeight;
            
            ctx.clearRect(0,0,canvas.width, canvas.height); 
            ctx.filter = 'none'; 
            transformation(ctx, canvas, filteredImage); 
            pushToManualEditHistory(canvas.toDataURL());
        }
        filteredImage.src = tempCanvas.toDataURL();
    };
    img.src = currentImageFromHistory;
  };


  const handleRotate = (degrees: number) => {
    const rotateTransformation = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, img: HTMLImageElement) => {
      const rad = degrees * Math.PI / 180;
      // Canvas dimensions are already set by applyCanvasTransformation based on rotated image dimensions
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      if (Math.abs(degrees) === 90){
        ctx.drawImage(img, -img.height / 2, -img.width / 2, img.height, img.width);
      } else {
        ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
      }
    };
    Object.defineProperty(rotateTransformation, 'name', { value: `handleRotate${degrees}` }); // For dimension check hack
    applyCanvasTransformation(rotateTransformation);
  };

  const handleFlip = (direction: 'horizontal' | 'vertical') => {
    applyCanvasTransformation((ctx, canvas, img) => {
      canvas.width = img.width; // Flipping doesn't change dimensions
      canvas.height = img.height;
      if (direction === 'horizontal') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      } else {
        ctx.translate(0, canvas.height);
        ctx.scale(1, -1);
      }
      ctx.drawImage(img, 0, 0);
    });
  };

  const handleCrop = () => {
    toast({ title: "Crop Tool", description: "Interactive cropping is coming soon!" });
  };

  const handleUndo = () => {
    if (manualEditHistoryIndex > 0) {
      setManualEditHistoryIndex(prev => prev - 1);
    }
  };

  const handleRedo = () => {
    if (manualEditHistoryIndex < manualEditHistory.length - 1) {
      setManualEditHistoryIndex(prev => prev + 1);
    }
  };

  const handleApplyManualChanges = () => {
    const canvas = canvasRef.current;
    if (canvas && manualEditHistory[manualEditHistoryIndex]) {
        const finalImage = new window.Image();
        finalImage.onload = () => {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            if(!tempCtx) return;
            tempCanvas.width = finalImage.naturalWidth;
            tempCanvas.height = finalImage.naturalHeight;
            tempCtx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
            tempCtx.drawImage(finalImage, 0, 0);
            
            const finalDataUrl = tempCanvas.toDataURL();
            setImageUrl(finalDataUrl);
            updateImageHistory(finalDataUrl);
            setIsManualEditingOpen(false);
        }
        finalImage.src = manualEditHistory[manualEditHistoryIndex];

    } else {
       setIsManualEditingOpen(false); 
    }
  };

  const handleCancelManualChanges = () => {
    setIsManualEditingOpen(false);
  };


  return (
    <div className="min-h-screen flex flex-col items-center bg-background text-foreground py-8 sm:py-12 px-4">
      <header className="flex flex-col items-center text-center gap-3 mb-10">
        <VisionaryLogo />
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary tracking-tight">
          Visionary
        </h1>
        <p className="text-md sm:text-lg text-muted-foreground max-w-md">
          Bring your ideas to life. Describe, upload, and watch AI create or transform.
        </p>
      </header>

      <div className="w-full max-w-xl md:max-w-2xl space-y-8">
        <Card className="shadow-2xl rounded-xl bg-card border-border/50">
          <CardContent className="p-6 space-y-4">
            <div>
              <Label htmlFor="prompt" className="text-lg font-semibold mb-2 block">Enter your vision or Upload</Label>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  id="prompt"
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., A futuristic cityscape at sunset..."
                  disabled={isLoading}
                  className="flex-grow text-base p-3 rounded-lg"
                />
                 <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelected}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  onClick={handleUploadButtonClick}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full sm:w-auto text-base px-6 py-3 rounded-lg font-semibold"
                  size="lg"
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Upload
                </Button>
                <Button
                  onClick={handleGenerateImage}
                  disabled={isLoading || !prompt.trim()}
                  className="w-full sm:w-auto text-base px-6 py-3 rounded-lg font-semibold"
                  size="lg"
                >
                  {isLoading && activeLoader === 'generate' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                  Generate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {(isLoading || imageUrl || error) && (
          <Card className="shadow-2xl rounded-xl bg-card border-border/50">
            <CardContent className="p-4 sm:p-6 space-y-6">
              <div
                className="aspect-video w-full bg-muted/50 rounded-lg flex items-center justify-center overflow-hidden border border-border/30 shadow-inner relative"
              >
                {isLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-card/80 backdrop-blur-sm">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="mt-4 text-lg text-muted-foreground">
                      {activeLoader === 'edit' ? 'Refining your vision...' : 'Conjuring your vision...'}
                    </p>
                  </div>
                )}

                {!isLoading && imageUrl && (
                  <NextImage
                    key={imageUrl}
                    src={imageUrl}
                    alt={isUploadedImage ? "Uploaded image" : (prompt || "Generated image")}
                    layout="fill"
                    objectFit="contain"
                    className="transition-opacity duration-500 ease-in-out"
                    onLoad={(e) => { (e.target as HTMLImageElement).style.opacity = '1'; }}
                    style={{ opacity: 0 }}
                    data-ai-hint={isUploadedImage ? "uploaded image" : "generated art"}
                    unoptimized={imageUrl.startsWith('data:')}
                  />
                )}

                {!isLoading && !imageUrl && !error && (
                  <div className="text-center text-muted-foreground p-6">
                    <ImageIcon size={60} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Your masterpiece will appear here.</p>
                    <p className="text-sm">Enter a prompt or upload an image to begin.</p>
                  </div>
                )}
                 {!isLoading && !imageUrl && error && (
                  <div className="text-center text-muted-foreground p-6">
                    <ImageIcon size={60} className="mx-auto mb-4 opacity-30" />
                     <p className="text-lg">Image processing failed.</p>
                  </div>
                )}
              </div>

              {error && !isLoading && (
                <Alert variant="destructive" className="mt-4 border-destructive/70 bg-destructive/10">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <AlertTitle className="font-semibold">Oops! Something went wrong.</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {imageUrl && !isLoading && (
                <div className="space-y-4 border-t border-border/50 pt-6 mt-6">
                  <div>
                    <Label htmlFor="editPrompt" className="text-lg font-semibold mb-2 block">Refine your image (AI)</Label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        id="editPrompt"
                        type="text"
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="e.g., Make it more vibrant, add a cat"
                        disabled={isLoading}
                        className="flex-grow text-base p-3 rounded-lg"
                      />
                      <Button
                        onClick={handleEditImage}
                        disabled={isLoading || !editPrompt.trim()}
                        variant="outline"
                        className="w-full sm:w-auto text-base px-6 py-3 rounded-lg font-semibold border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                        size="lg"
                      >
                        {isLoading && activeLoader === 'edit' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                        Apply AI Edit
                      </Button>
                       <Button
                        onClick={handleManualEdit}
                        disabled={isLoading || !imageUrl}
                        variant="outline"
                        className="w-full sm:w-auto text-base px-6 py-3 rounded-lg font-semibold"
                        size="lg"
                      >
                        <Paintbrush className="mr-2 h-5 w-5" />
                        Manual Edit
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center pt-4">
                    <Button variant="outline" onClick={handleDownloadImage} className="rounded-lg text-base">
                      <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                    <Button variant="outline" onClick={handleReset} className="rounded-lg text-base hover:border-destructive/50 hover:text-destructive">
                      <RotateCcw className="mr-2 h-4 w-4" /> Reset
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {imageHistory.length > 0 && !isManualEditingOpen && (
          <Card className="shadow-2xl rounded-xl bg-card border-border/50">
            <CardHeader className="pb-4 pt-6">
              <CardTitle className="text-2xl text-center font-semibold">Recent Visions</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {imageHistory.map((histImg, index) => (
                  <button
                    key={histImg}
                    onClick={() => handleHistoryImageClick(histImg)}
                    className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary focus:border-primary focus:outline-none shadow-md hover:shadow-lg transition-all duration-200 relative group"
                    aria-label={`Load image ${index + 1} from history`}
                  >
                    <NextImage
                      src={histImg}
                      alt={`History image ${index + 1}`}
                      layout="fill"
                      objectFit="cover"
                      className="transition-transform duration-200 group-hover:scale-105"
                      data-ai-hint="past image"
                      unoptimized={histImg.startsWith('data:')}
                    />
                     <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <RotateCcw size={24} className="text-white" />
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Manual Editing Sheet */}
      <Sheet open={isManualEditingOpen} onOpenChange={setIsManualEditingOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl p-0 flex flex-col">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Manual Image Editor</SheetTitle>
            <SheetDescription>
              Make precise adjustments to your image. Changes are applied to the canvas.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-grow overflow-y-auto p-4 space-y-6">
            <div className="aspect-video w-full bg-muted rounded-md flex items-center justify-center overflow-hidden border">
              <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">Transform</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Button variant="outline" onClick={() => handleRotate(-90)}><RotateCcw className="mr-2 h-4 w-4" /> Rotate -90°</Button>
                <Button variant="outline" onClick={() => handleRotate(90)}><RotateCw className="mr-2 h-4 w-4" /> Rotate +90°</Button>
                <Button variant="outline" onClick={() => handleFlip('horizontal')}><FlipHorizontal className="mr-2 h-4 w-4" /> Flip H</Button>
                <Button variant="outline" onClick={() => handleFlip('vertical')}><FlipVertical className="mr-2 h-4 w-4" /> Flip V</Button>
                <Button variant="outline" onClick={handleCrop}><Crop className="mr-2 h-4 w-4" /> Crop</Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="font-semibold">Adjustments</Label>
              <div className="space-y-2">
                <Label htmlFor="brightness">Brightness: {brightness}%</Label>
                <Slider id="brightness" value={[brightness]} min={0} max={200} step={1} onValueChange={(val) => setBrightness(val[0])} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contrast">Contrast: {contrast}%</Label>
                <Slider id="contrast" value={[contrast]} min={0} max={200} step={1} onValueChange={(val) => setContrast(val[0])} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="saturation">Saturation: {saturation}%</Label>
                <Slider id="saturation" value={[saturation]} min={0} max={200} step={1} onValueChange={(val) => setSaturation(val[0])} />
              </div>
            </div>
             <div className="space-y-2">
                <Label className="font-semibold">History</Label>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleUndo} disabled={manualEditHistoryIndex <= 0}><Undo className="mr-2 h-4 w-4" /> Undo</Button>
                    <Button variant="outline" onClick={handleRedo} disabled={manualEditHistoryIndex >= manualEditHistory.length - 1}><Redo className="mr-2 h-4 w-4" /> Redo</Button>
                </div>
            </div>
          </div>

          <SheetFooter className="p-4 border-t mt-auto">
            <SheetClose asChild>
              <Button variant="outline" onClick={handleCancelManualChanges}>Cancel</Button>
            </SheetClose>
            <Button onClick={handleApplyManualChanges}>Apply Changes</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
