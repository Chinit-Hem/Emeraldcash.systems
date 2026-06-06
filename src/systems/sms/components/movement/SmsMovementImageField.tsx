"use client";

import { ImageIcon, Upload, X } from "lucide-react";
import { memo } from "react";
import {
  smsDropzoneClass,
  smsLabelClass,
} from "@/systems/sms/components/SmsShared";
import type { MovementMode } from "@/systems/sms/types/sms-movement";

type SmsMovementImageFieldProps = {
  mode: MovementMode;
  imageFile: File | null;
  loading: boolean;
  onImageFileChange: (file: File | null) => void;
};

const movementImageCopy = {
  send: {
    imageLabel: "Transfer Image (Optional)",
    uploadLabel: "Upload transfer photo",
    removeLabel: "Remove transfer image",
  },
  return: {
    imageLabel: "Send Back Image",
    uploadLabel: "Upload send back photo",
    removeLabel: "Remove return image",
  },
} as const;

export const SmsMovementImageField = memo(function SmsMovementImageField({
  mode,
  imageFile,
  loading,
  onImageFileChange,
}: SmsMovementImageFieldProps) {
  const copy = movementImageCopy[mode];

  return (
    <div>
      <label className={smsLabelClass}>{copy.imageLabel}</label>
      <div className={smsDropzoneClass}>
        {imageFile ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-gray-900 dark:text-white" data-no-translate>
                  {imageFile.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400" data-no-translate>
                  {(imageFile.size / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onImageFileChange(null)}
              disabled={loading}
              className="rounded-lg p-2 text-gray-500 transition hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              aria-label={copy.removeLabel}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center text-sm text-gray-600 dark:text-gray-300">
            <Upload className="h-6 w-6 text-gray-400 dark:text-gray-500" />
            <span className="font-semibold text-gray-800 dark:text-white">{copy.uploadLabel}</span>
            <span>JPG, PNG, WebP, or GIF</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">No file chosen</span>
            <input
              type="file"
              title={copy.uploadLabel}
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={loading}
              onChange={(event) => onImageFileChange(event.target.files?.[0] || null)}
            />
          </label>
        )}
      </div>
    </div>
  );
});
