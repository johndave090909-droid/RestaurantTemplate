import React, { useState, useEffect } from 'react';
import { generateImage } from '@/src/lib/gemini';

interface GeneratedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  prompt: string;
  fallbackUrl?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  className?: string;
}

export default function GeneratedImage({ 
  prompt, 
  fallbackUrl, 
  aspectRatio = "1:1",
  className,
  ...props 
}: GeneratedImageProps) {
  const [src, setSrc] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchImage = async () => {
      const cacheKey = `gen_img_${btoa(prompt).substring(0, 32)}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        setSrc(cached);
        setLoading(false);
        return;
      }

      try {
        const generated = await generateImage(prompt);
        if (generated) {
          setSrc(generated);
          localStorage.setItem(cacheKey, generated);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Failed to generate image:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchImage();
  }, [prompt]);

  if (loading) {
    return (
      <div className={`bg-gray-100 animate-pulse flex items-center justify-center ${className}`}>
        <span className="text-[10px] text-gray-400 uppercase tracking-widest">Generating...</span>
      </div>
    );
  }

  const finalSrc = src || fallbackUrl;

  if (!finalSrc) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-[10px] text-gray-400 uppercase tracking-widest">Image Error</span>
      </div>
    );
  }

  return (
    <img 
      src={finalSrc} 
      className={className} 
      referrerPolicy="no-referrer"
      {...props} 
    />
  );
}
