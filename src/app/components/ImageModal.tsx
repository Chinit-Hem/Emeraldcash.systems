"use client";

import { ChevronLeft, ChevronRight, Copy, Download, ExternalLink, X } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";

type ImageModalProps = {
  isOpen: boolean;
  imageUrl: string;
  images?: string[];
  initialIndex?: number;
  alt: string;
  onClose: () => void;
};

function imageDownloadName(alt: string, index: number): string {
  const baseName = alt
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${baseName || "vehicle-image"}-${index + 1}`;
}

export default function ImageModal({
  isOpen,
  imageUrl,
  images,
  initialIndex = 0,
  alt,
  onClose,
}: ImageModalProps) {
  const gallery = useMemo(() => {
    const source = images?.length ? images : imageUrl ? [imageUrl] : [];
    return Array.from(new Set(source.filter(Boolean)));
  }, [imageUrl, images]);

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [copied, setCopied] = useState(false);
  const activeImageUrl = gallery[activeIndex] || gallery[0] || imageUrl;
  const hasMultipleImages = gallery.length > 1;

  const goToPrevious = useCallback(() => {
    if (gallery.length === 0) return;
    setActiveIndex((index) => (index - 1 + gallery.length) % gallery.length);
  }, [gallery.length]);

  const goToNext = useCallback(() => {
    if (gallery.length === 0) return;
    setActiveIndex((index) => (index + 1) % gallery.length);
  }, [gallery.length]);

  const copyImageLink = useCallback(async () => {
    if (!activeImageUrl || !navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(activeImageUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [activeImageUrl]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (hasMultipleImages && event.key === "ArrowLeft") {
        goToPrevious();
      } else if (hasMultipleImages && event.key === "ArrowRight") {
        goToNext();
      }
    },
    [goToNext, goToPrevious, hasMultipleImages, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveIndex(Math.min(Math.max(initialIndex, 0), Math.max(gallery.length - 1, 0)));
  }, [gallery.length, initialIndex, isOpen]);

  useEffect(() => {
    setCopied(false);
  }, [activeImageUrl]);

  useEffect(() => {
    if (!copied) return;

    const timeoutId = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  if (!isOpen || !activeImageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#181818] text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 py-3 sm:px-6 sm:py-5">
        <div className="flex items-center justify-between gap-4 pb-3">
          <p className="min-w-0 truncate text-sm font-medium text-white/75">{alt}</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70"
            aria-label="Close image viewer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="relative flex min-h-[54vh] flex-1 items-center justify-center bg-black sm:min-h-[62vh]">
          <img
            src={activeImageUrl}
            alt={alt}
            className="h-auto max-h-[68vh] w-full select-none object-contain sm:max-h-[72vh]"
            draggable={false}
          />

          {hasMultipleImages && (
            <>
              <button
                type="button"
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white transition hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/70 sm:left-4 sm:h-14 sm:w-14"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-9 w-9 sm:h-11 sm:w-11" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white transition hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/70 sm:right-4 sm:h-14 sm:w-14"
                aria-label="Next image"
              >
                <ChevronRight className="h-9 w-9 sm:h-11 sm:w-11" aria-hidden="true" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
                {activeIndex + 1} / {gallery.length}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 px-1 py-4 sm:gap-5">
          <button
            type="button"
            onClick={copyImageLink}
            className="flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/70"
          >
            <Copy className="h-5 w-5" aria-hidden="true" />
            <span>{copied ? "Copied" : "Copy link"}</span>
          </button>
          <a
            href={activeImageUrl}
            download={imageDownloadName(alt, activeIndex)}
            className="flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/70"
          >
            <Download className="h-5 w-5" aria-hidden="true" />
            <span>Save</span>
          </a>
          <a
            href={activeImageUrl}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/70"
          >
            <ExternalLink className="h-5 w-5" aria-hidden="true" />
            <span>View image</span>
          </a>
        </div>

        {hasMultipleImages && (
          <section className="rounded-md bg-[#242424] px-4 py-4 shadow-2xl sm:px-5">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold text-white sm:text-lg">More images</h2>
              <span className="text-xs font-medium text-white/55">
                {activeIndex + 1} of {gallery.length}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {gallery.map((image, index) => {
                const isActive = index === activeIndex;

                return (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`relative h-20 w-24 shrink-0 overflow-hidden bg-black transition focus:outline-none focus:ring-2 focus:ring-white/80 sm:h-24 sm:w-32 ${
                      isActive ? "ring-2 ring-white" : "opacity-80 hover:opacity-100"
                    }`}
                    aria-label={`Show image ${index + 1}`}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <img
                      src={image}
                      alt={`${alt} ${index + 1}`}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
