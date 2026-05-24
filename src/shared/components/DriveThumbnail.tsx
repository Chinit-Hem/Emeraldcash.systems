"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";

import { driveThumbnailUrl } from "@/shared/utils/drive";

type DriveThumbnailProps = {
  fileId: string | null | undefined;
  alt: string;
  className?: string;
  thumbSize?: number;
  thumbSzParam?: string;
  fullSzParam?: string;
};

function useEscapeToClose(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);
}

export default function DriveThumbnail({
  fileId,
  alt,
  className,
  thumbSize = 40,
  thumbSzParam = "w100-h100",
  fullSzParam = "w1000-h1000",
}: DriveThumbnailProps) {
  const [open, setOpen] = useState(false);
  const safeFileId = String(fileId ?? "").trim();
  const hasImage = !!safeFileId;

  const thumbUrl = useMemo(
    () => (hasImage ? driveThumbnailUrl(safeFileId, thumbSzParam) : ""),
    [hasImage, safeFileId, thumbSzParam]
  );
  const fullUrl = useMemo(
    () => (hasImage ? driveThumbnailUrl(safeFileId, fullSzParam) : ""),
    [hasImage, safeFileId, fullSzParam]
  );
  const driveFileUrl = useMemo(
    () => (hasImage ? `https://drive.google.com/file/d/${encodeURIComponent(safeFileId)}/view` : ""),
    [hasImage, safeFileId]
  );

  useEscapeToClose(open, () => setOpen(false));

  if (!hasImage) {
    return (
      <div
        className={className}
        style={{ width: thumbSize, height: thumbSize }}
        aria-label="No image"
      >
        <div className="h-full w-full rounded-lg bg-black/5 ring-1 ring-black/10" />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        style={{ width: thumbSize, height: thumbSize }}
        aria-label="Open image"
      >
        <Image
          src={thumbUrl}
          alt={alt}
          width={thumbSize}
          height={thumbSize}
          unoptimized
          loading="lazy"
          sizes={`${thumbSize}px`}
          className="h-full w-full rounded-lg object-cover ring-1 ring-black/10 bg-white"
        />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-[min(92vw,900px)] h-[min(84vh,900px)] rounded-2xl overflow-hidden bg-white ring-1 ring-black/10 shadow-2xl"
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
              <a
                href={driveFileUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-white/90 px-3 py-1.5 text-sm font-semibold text-gray-900 ring-1 ring-black/10 hover:bg-white"
              >
                Open
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-white/90 px-3 py-1.5 text-sm font-semibold text-gray-900 ring-1 ring-black/10 hover:bg-white"
              >
                Close
              </button>
            </div>

            <div className="absolute inset-0">
              <Image
                src={fullUrl}
                alt={alt}
                fill
                priority
                unoptimized
                sizes="(max-width: 768px) 92vw, 900px"
                className="object-contain bg-black"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
