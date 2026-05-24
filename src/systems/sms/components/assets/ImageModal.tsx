"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

interface ImageModalProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageModal({ src, alt, isOpen, onClose }: ImageModalProps) {
  const [imageError, setImageError] = useState(false);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setImageError(false);
    }
  }, [isOpen]);

  // Handle escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`View ${alt}`}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Image container */}
      <div
        className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {imageError ? (
          <div className="flex h-64 w-64 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
            <span className="text-sm font-medium">Failed to load image</span>
          </div>
        ) : (
          <Image
            src={src}
            alt={alt}
            width={1200}
            height={900}
            className="max-h-[90vh] w-auto max-w-[90vw] rounded-lg object-contain"
            onError={() => setImageError(true)}
            priority
          />
        )}
      </div>

      {/* Image info */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-white">
        <span className="text-sm font-medium">{alt}</span>
      </div>
    </div>
  );
}
