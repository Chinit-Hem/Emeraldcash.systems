import {
  compressImage as compressImageClient,
  compressImageWithProgress,
  compressImageProgressive,
} from "@/shared/utils/clientImageCompression";

type CompressImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  type?: string;
  useWorker?: boolean;
  targetMinSizeKB?: number;
  targetMaxSizeKB?: number;
};

export function compressImage(file: File, options: CompressImageOptions = {}) {
  const { targetMinSizeKB, targetMaxSizeKB, ...clientOptions } = options;
  void targetMinSizeKB;
  void targetMaxSizeKB;
  return compressImageClient(file, clientOptions);
}

export { compressImageWithProgress, compressImageProgressive };

export { formatFileSize } from "@/shared/utils/format";
