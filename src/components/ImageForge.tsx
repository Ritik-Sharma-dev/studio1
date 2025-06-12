
'use client';

import { useState } from 'react';
import NextImage from 'next/image'; // Renamed to NextImage to avoid conflict
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, RotateCcw, AlertCircle, Image as ImageIcon, Loader2 } from 'lucide-react';
import { generateImage } from '@/ai/flows/generate-image';
import { editImage } from '@/ai/flows/edit-image';

export default function ImageForge() {
  const [prompt, setPrompt] = useState<string>('');
  const [editPrompt, setEditPrompt] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [imageHistory, setImageHistory] = useState<string[]>([]);

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to generate an image.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setImageUrl(null); // Clear previous image while generating new one

    try {
      const result = await generateImage({ prompt });
      setImageUrl(result.imageUrl);
      updateImageHistory(result.imageUrl);
    } catch (e) {
      console.error(e);
      setError('Could not generate image. Please try again.');
    } finally {
      setIsLoading(false);
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
    setError(null);

    try {
      const result = await editImage({ existingImageDataUri: imageUrl, newPrompt: editPrompt });
      setImageUrl(result.editedImageDataUri);
      updateImageHistory(result.editedImageDataUri);
    } catch (e) {
      console.error(e);
      setError('Could not edit image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateImageHistory = (newImageUrl: string) => {
    setImageHistory(prevHistory => {
      const updatedHistory = [newImageUrl, ...prevHistory];
      return updatedHistory.slice(0, 3);
    });
  };

  const handleDownloadImage = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    
    const safePrompt = prompt || editPrompt || 'ai_image';
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
    // imageHistory remains as per spec (not clearing history)
  };

  const handleHistoryImageClick = (histImageUrl: string) => {
    setImageUrl(histImageUrl);
    setError(null); // Clear any errors when loading from history
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-4 sm:p-8 bg-background font-body">
      <Card className="w-full max-w-3xl shadow-xl rounded-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline text-primary">ImageForge AI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Generation Section */}
          <div className="space-y-2">
            <Label htmlFor="prompt" className="text-lg font-medium">Enter image prompt</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="prompt"
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A majestic lion wearing a crown"
                disabled={isLoading}
                className="flex-grow text-base"
              />
              <Button 
                onClick={handleGenerateImage} 
                disabled={isLoading || !prompt.trim()} 
                className="w-full sm:w-auto"
              >
                {isLoading && !editPrompt ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Generate
              </Button>
            </div>
          </div>

          {/* Image Display Section */}
          <div 
            className="aspect-[4/3] w-full bg-muted rounded-lg flex items-center justify-center overflow-hidden border border-border shadow-inner relative"
          >
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-background/80">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-lg text-muted-foreground">
                  {editPrompt && imageUrl ? 'Editing image...' : 'Generating image...'}
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

            {!isLoading && !imageUrl && (
              <div className="text-center text-muted-foreground p-6">
                <ImageIcon size={60} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">Your masterpiece awaits.</p>
                <p className="text-sm">Enter a prompt above to begin.</p>
              </div>
            )}
          </div>
          
          {error && !isLoading && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle className="font-semibold">Something went wrong</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Editing Section - Visible only if an image is present and not loading initial image */}
          {imageUrl && !isLoading && (
            <div className="space-y-2 border-t border-border pt-6 mt-6">
              <Label htmlFor="editPrompt" className="text-lg font-medium">Edit with new prompt</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="editPrompt"
                  type="text"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="e.g., Add a surreal background, change colors to vibrant"
                  disabled={isLoading}
                  className="flex-grow text-base"
                />
                <Button 
                  onClick={handleEditImage} 
                  disabled={isLoading || !editPrompt.trim()} 
                  variant="outline"
                  className="w-full sm:w-auto border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                >
                  {isLoading && editPrompt ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Apply Edit
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons - Visible only if an image is present and not loading */}
          {imageUrl && !isLoading && (
            <div className="flex flex-wrap gap-2 justify-center pt-4">
              <Button variant="outline" onClick={handleDownloadImage} className="hover:bg-secondary">
                <Download className="mr-2 h-4 w-4" /> Download Image
              </Button>
              <Button variant="outline" onClick={handleReset} className="hover:bg-secondary">
                <RotateCcw className="mr-2 h-4 w-4" /> Reset All
              </Button>
            </div>
          )}

          {/* Image History Section */}
          {imageHistory.length > 0 && (
            <div className="space-y-3 pt-6 border-t border-border mt-6">
              <h3 className="text-xl font-semibold text-center text-foreground/80">Image History</h3>
              <div className="flex gap-3 justify-center flex-wrap">
                {imageHistory.map((histImg, index) => (
                  <button
                    key={index}
                    onClick={() => handleHistoryImageClick(histImg)}
                    className="w-28 h-28 rounded-lg overflow-hidden border-2 border-transparent hover:border-primary focus:border-primary focus:outline-none shadow-md hover:shadow-lg transition-all duration-200"
                    aria-label={`Load image ${index + 1} from history`}
                  >
                    <NextImage
                      src={histImg}
                      alt={`History image ${index + 1}`}
                      width={112} // Slightly smaller than container for border visibility
                      height={112}
                      objectFit="cover"
                      className="transition-transform duration-200 hover:scale-105"
                      data-ai-hint="past image"
                      unoptimized={histImg.startsWith('data:')}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
