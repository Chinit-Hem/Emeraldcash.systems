"use client";

 

import React, { useState } from "react";

interface ImageZoomProps {
  src: string;
  alt: string;
}

export default function ImageZoom({ src, alt }: ImageZoomProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <>
      <div
        onClick={() => setIsZoomed(true)}
        className="relative overflow-hidden rounded-lg bg-gray-200 cursor-pointer group print:hidden"
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-96 object-cover group-hover:opacity-75 transition"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium">
            Zoom
          </button>
        </div>
      </div>

      {/* Zoomed Modal */}
      {isZoomed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <div
            className="relative max-w-4xl max-h-screen flex items-center justify-center"
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-screen object-contain"
            />
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Print Version */}
      <img src={src} alt={alt} className="hidden print:block w-full h-auto" />
    </>
  );
}
