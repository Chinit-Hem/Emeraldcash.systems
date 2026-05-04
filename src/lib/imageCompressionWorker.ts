/**
 * Image Compression Web Worker
 * Runs compression in a separate thread to prevent UI blocking
 */

// Worker message types
export interface CompressionMessage {
  id: string;
  imageData: ArrayBuffer;
  fileName: string;
  fileType: string;
  maxWidth: number;
  maxHeight: number;
  quality: number;
  outputType: string;
}

export interface CompressionResult {
  id: string;
  success: boolean;
  compressedData?: ArrayBuffer;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  processingTime: number; // Add processingTime to interface
  error?: string;
}

// Self-contained worker script - using function to avoid template literal issues
function getWorkerScript(): string {
  return `
self.onmessage = async function(e) {
  const data = e.data;
  const id = data.id;
  const imageData = data.imageData;
  const fileType = data.fileType;
  const maxWidth = data.maxWidth;
  const maxHeight = data.maxHeight;
  const quality = data.quality;
  const outputType = data.outputType;

  const startTime = performance.now();

  try {
    // Create blob from ArrayBuffer
    const blob = new Blob([imageData], { type: fileType });

    // Create bitmap for faster decoding
    const bitmap = await createImageBitmap(blob);

    // Calculate new dimensions
    let width = bitmap.width;
    let height = bitmap.height;

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    // Create offscreen canvas
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Draw image
    ctx.drawImage(bitmap, 0, 0, width, height);

    // Close bitmap to free memory
    bitmap.close();

    // Convert to blob with compression
    const compressedBlob = await canvas.convertToBlob({
      type: 'image/webp', // Prioritize WebP for better compression
      quality: quality
    });

    // Convert to ArrayBuffer
    const compressedArrayBuffer = await compressedBlob.arrayBuffer();

    const endTime = performance.now();

    self.postMessage({
      id: id,
      success: true,
      compressedData: compressedArrayBuffer,
      originalSize: imageData.byteLength,
      compressedSize: compressedArrayBuffer.byteLength,
      width: width,
      height: height,
      processingTime: Math.round(endTime - startTime)
    }, [compressedArrayBuffer]);

  } catch (error) {
    self.postMessage({
      id: id,
      success: false,
      originalSize: imageData ? imageData.byteLength : 0,
      compressedSize: 0,
      width: 0,
      height: 0,
      processingTime: 0, // Default to 0 on error
    });
  }
};
`;
}

// Create worker from blob URL
let worker: Worker | null = null;
let workerUrl: string | null = null;

function getWorker(): Worker {
  if (!worker) {
    const blob = new Blob([getWorkerScript()], { type: 'application/javascript' });
    workerUrl = URL.createObjectURL(blob);
    worker = new Worker(workerUrl);
  }
  return worker;
}

// Active compression jobs
const pendingJobs = new Map<string, {
  resolve: (result: CompressionResult) => void;
  reject: (error: Error) => void;
}>();

// Initialize worker message handler
function initWorker() {
  const w = getWorker();
  w.onmessage = (e: MessageEvent<CompressionResult & { processingTime?: number }>) => {
    const { id, success, error } = e.data;
    const job = pendingJobs.get(id);

    if (job) {
      pendingJobs.delete(id);

      if (success) {
        // Compression logging removed for production
        job.resolve(e.data);
      } else {
        job.reject(new Error(error || 'Compression failed'));
      }
    }
  };

  w.onerror = (error) => {
    // Worker error logging removed for production
    // Reject all pending jobs
    pendingJobs.forEach((job) => {
      job.reject(new Error('Worker error: ' + error.message));
    });
    pendingJobs.clear();
  };
}

// Generate unique ID for each job
function generateJobId(): string {
  return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Compress image using Web Worker
 * @returns Promise with compressed file
 */
export async function compressImageInWorker(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    timeout?: number;
  } = {}
): Promise<{
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
  processingTime: number;
}> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.7,
    timeout = 30000 // 30 second timeout
  } = options;

  // Check if Worker is supported
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    throw new Error('Web Worker or OffscreenCanvas not supported');
  }

  // Initialize worker on first use
  initWorker();

  const id = generateJobId();

  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  return new Promise((resolve, reject) => {
    // Set up timeout
    const timeoutId = setTimeout(() => {
      pendingJobs.delete(id);
      reject(new Error('Compression timeout after ' + timeout + 'ms'));
    }, timeout);

    // Store job handlers
    pendingJobs.set(id, {
      resolve: (result) => {
        clearTimeout(timeoutId);

        if (result.success && result.compressedData) {
          // Create File from compressed ArrayBuffer
          const compressedFile = new File(
            [result.compressedData],
            file.name.replace(/\\.[^.]+$/, '.webp'), // Use .webp extension
            { type: 'image/webp' } // This is a loop.
          );

          const compressionRatio = ((result.originalSize - result.compressedSize) / result.originalSize) * 100;

          resolve({
            file: compressedFile,
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
            compressionRatio,
            width: result.width,
            height: result.height, // Correctly extract height
            processingTime: result.processingTime || 0
          });
        } else {
          reject(new Error(result.error || 'Compression failed'));
        }
      },
      reject: (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    });

    // Send to worker
    const worker = getWorker();
    worker.postMessage({
      id,
      imageData: arrayBuffer,
      fileName: file.name,
      fileType: file.type,
      maxWidth,
      maxHeight,
      quality,
      outputType: 'image/webp' // Request WebP from worker
    }, [arrayBuffer]); // Transfer ownership for performance
  });
}

/**
 * Check if Web Worker compression is supported
 */
export function isWorkerCompressionSupported(): boolean {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
}

/**
 * Terminate worker and cleanup
 */
export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  if (workerUrl) {
    URL.revokeObjectURL(workerUrl);
    workerUrl = null;
  }
  pendingJobs.clear();
}
