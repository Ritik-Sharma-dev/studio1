
'use client';

import { useState, useEffect } from 'react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, RotateCcw, AlertCircle, Image as ImageIcon, Loader2, Sparkles } from 'lucide-react';
import { generateImage } from '@/ai/flows/generate-image';
import { editImage } from '@/ai/flows/edit-image';

const VisionaryLogo = () => (
  <svg
    width="56"
    height="56"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-primary" // Inherits primary color
  >
    <path d="M12 2L9.17157 4.82843L6.34315 2L4.82843 4.82843L2 6.34315L4.82843 9.17157L2 12L4.82843 14.8284L2 17.6569L4.82843 19.1716L6.34315 22L9.17157 19.1716L12 22L14.8284 19.1716L17.6569 22L19.1716 19.1716L22 17.6569L19.1716 14.8284L22 12L19.1716 9.17157L22 6.34315L19.1716 4.82843L17.6569 2L14.8284 4.82843L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="3" fill="currentColor"/>
  </svg>
);


export default function ImageForge() {
  const [prompt, setPrompt] = useState<string>('');
  const [editPrompt, setEditPrompt] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [imageHistory, setImageHistory] = useState<string[]>([]);
  const [activeLoader, setActiveLoader] = useState<'generate' | 'edit' | null>(null);


  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to generate an image.');
      return;
    }
    setIsLoading(true);
    setActiveLoader('generate');
    setError(null);
    setImageUrl(null);

    try {
      const result = await generateImage({ prompt });
      setImageUrl(result.imageUrl);
      updateImageHistory(result.imageUrl);
      setEditPrompt(''); // Clear edit prompt after new generation
    } catch (e) {
      console.error(e);
      setError('Could not generate image. Please try again or refine your prompt.');
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
      setError('No image to edit. Please generate an image first.');
      return;
    }
    setIsLoading(true);
    setActiveLoader('edit');
    setError(null);

    try {
      const result = await editImage({ existingImageDataUri: imageUrl, newPrompt: editPrompt });
      setImageUrl(result.editedImageDataUri);
      updateImageHistory(result.editedImageDataUri);
    } catch (e) {
      console.error(e);
      setError('Could not edit image. Please try again or refine your edit prompt.');
    } finally {
      setIsLoading(false);
      setActiveLoader(null);
    }
  };

  const updateImageHistory = (newImageUrl: string) => {
    setImageHistory(prevHistory => {
      const updatedHistory = [newImageUrl, ...prevHistory.filter(url => url !== newImageUrl)];
      return updatedHistory.slice(0, 5); // Show up to 5 history items
    });
  };

  const handleDownloadImage = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    
    const safePrompt = prompt || editPrompt || 'visionary_image';
    const filename = safePrompt.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30);
    const extension = imageUrl.startsWith('data:image/') ? imageUrl.substring(imageUrl.indexOf('/') + 1, imageUrl.indexOf(';')) : 'png';
    link.download = `${filename || 'generated_image'}.${extension}`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setPrompt('');
    setEditPrompt('');
    setImageUrl(null);
    setError(null);
    // Retain image history as per spec
  };

  const handleHistoryImageClick = (histImageUrl: string) => {
    setImageUrl(histImageUrl);
    setEditPrompt(''); // Clear edit prompt when loading from history
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-background text-foreground py-8 sm:py-12 px-4">
      <header className="flex flex-col items-center text-center gap-3 mb-10">
        <VisionaryLogo />
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary tracking-tight">
          Visionary
        </h1>
        <p className="text-md sm:text-lg text-muted-foreground max-w-md">
          Bring your ideas to life. Describe anything, and watch AI create it.
        </p>
      </header>

      <div className="w-full max-w-xl md:max-w-2xl space-y-8">
        <Card className="shadow-2xl rounded-xl bg-card border-border/50">
          <CardContent className="p-6 space-y-4">
            <div>
              <Label htmlFor="prompt" className="text-lg font-semibold mb-2 block">Enter your vision</Label>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  id="prompt"
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., A futuristic cityscape at sunset, synthwave style"
                  disabled={isLoading}
                  className="flex-grow text-base p-3 rounded-lg"
                />
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
                    alt={prompt || "Generated image"}
                    layout="fill"
                    objectFit="contain"
                    className="transition-opacity duration-500 ease-in-out"
                    onLoad={(e) => { (e.target as HTMLImageElement).style.opacity = '1'; }}
                    style={{ opacity: 0 }} 
                    data-ai-hint="generated art"
                    unoptimized={imageUrl.startsWith('data:')}
                  />
                )}

                {!isLoading && !imageUrl && !error && (
                  <div className="text-center text-muted-foreground p-6">
                    <ImageIcon size={60} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Your masterpiece will appear here.</p>
                    <p className="text-sm">Enter a prompt above to begin.</p>
                  </div>
                )}
                 {!isLoading && !imageUrl && error && ( // Show placeholder if error and no image
                  <div className="text-center text-muted-foreground p-6">
                    <ImageIcon size={60} className="mx-auto mb-4 opacity-30" />
                     <p className="text-lg">Image generation failed.</p>
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
                    <Label htmlFor="editPrompt" className="text-lg font-semibold mb-2 block">Refine your image</Label>
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
                        {isLoading && activeLoader === 'edit' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                        Apply Edit
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

        {imageHistory.length > 0 && (
          <Card className="shadow-2xl rounded-xl bg-card border-border/50">
            <CardHeader className="pb-4 pt-6">
              <CardTitle className="text-2xl text-center font-semibold">Recent Visions</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {imageHistory.map((histImg, index) => (
                  <button
                    key={index}
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
    </div>
  );
}
