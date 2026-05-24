export async function fileToDataUrl(file: File): Promise<string> {
  if (typeof FileReader !== "undefined") {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") resolve(result);
        else reject(new Error("Invalid file data"));
      };
      reader.readAsDataURL(file);
    });
  }

  const mimeType = file.type || "application/octet-stream";

  const arrayBuffer =
    typeof file.arrayBuffer === "function" ? await file.arrayBuffer() : await new Response(file).arrayBuffer();

  const base64 = arrayBufferToBase64(arrayBuffer);
  return `data:${mimeType};base64,${base64}`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (typeof btoa !== "function") {
    throw new Error("This browser cannot convert files to base64. Please paste an image URL instead.");
  }

  // Convert ArrayBuffer to base64 string using chunked processing
  // This is more memory-efficient than using spread operator on large arrays
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192; // Process in 8KB chunks to avoid stack overflow

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    // Use standard for loop instead of spread operator for better performance
    for (let i = 0; i < chunk.length; i++) {
      binary += String.fromCharCode(chunk[i]);
    }
  }

  return btoa(binary);
}

// Manual base64 decoding table for fallback
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_LOOKUP = new Map<string, number>();
for (let i = 0; i < BASE64_CHARS.length; i++) {
  BASE64_LOOKUP.set(BASE64_CHARS[i], i);
}

/**
 * Manual base64 decoder - works when atob() fails or is not available
 * @param base64 - Base64 string to decode
 * @returns Decoded binary string
 */
function manualAtob(base64: string): string {
  // Remove padding
  const cleanBase64 = base64.replace(/=+$/, '');
  const output: number[] = [];
  
  for (let i = 0; i < cleanBase64.length; i += 4) {
    const encoded1 = BASE64_LOOKUP.get(cleanBase64[i] || '') || 0;
    const encoded2 = BASE64_LOOKUP.get(cleanBase64[i + 1] || '') || 0;
    const encoded3 = BASE64_LOOKUP.get(cleanBase64[i + 2] || '') || 0;
    const encoded4 = BASE64_LOOKUP.get(cleanBase64[i + 3] || '') || 0;
    
    const bytes24 = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
    
    output.push((bytes24 >> 16) & 0xFF);
    if (cleanBase64[i + 2] !== undefined) {
      output.push((bytes24 >> 8) & 0xFF);
    }
    if (cleanBase64[i + 3] !== undefined) {
      output.push(bytes24 & 0xFF);
    }
  }
  
  // Convert to binary string
  return output.map(byte => String.fromCharCode(byte)).join('');
}

/**
 * Convert Base64 string to File object
 * Handles various data URL formats including charset declarations and URL-safe base64
 * Aggressively cleans invalid characters (ellipsis, Unicode, whitespace) that cause atob() to fail
 * 
 * @param base64String - The base64 string or data URL to convert
 * @param filename - The filename for the resulting File object
 * @returns File object
 * @throws Error if the base64 string is invalid or cannot be decoded
 */
export function base64ToFile(base64String: string, filename: string): File {
  try {
    // Validate input
    if (!base64String || typeof base64String !== 'string') {
      throw new Error("Invalid input: base64String must be a non-empty string");
    }

    // Handle data URL format: data:[<mediatype>][;base64],<data>
    // Also handles: data:[<mediatype>][;charset=<charset>][;base64],<data>
    let mime = "image/jpeg";
    let base64Data = base64String;

    // Check if it's a data URL
    if (base64String.startsWith("data:")) {
      // Find the comma that separates header from data
      // The format is: data:[<mediatype>][;base64],<data>
      const commaIndex = base64String.indexOf(",");
      if (commaIndex === -1) {
        throw new Error("Invalid data URL: no comma found");
      }

      const header = base64String.substring(0, commaIndex);
      base64Data = base64String.substring(commaIndex + 1);

      // Extract MIME type from header
      const mimeMatch = header.match(/data:([^;]+)/);
      if (mimeMatch && mimeMatch[1]) {
        mime = mimeMatch[1];
      }
    }

    // Check if we have any data to process
    if (!base64Data || base64Data.length === 0) {
      throw new Error("No base64 data found after parsing");
    }

    // ===== STEP 1: Comprehensive character cleaning =====
    // Remove ALL characters that are not valid base64 characters
    // Valid base64: A-Z, a-z, 0-9, +, /, = (padding at end only)
    
    // First, remove all whitespace and control characters (including zero-width chars)
    // \s covers: spaces, tabs, newlines, carriage returns
    // \u0000-\u001F: C0 control characters
    // \u007F-\u009F: C1 control characters  
    // \u200B-\u200D: Zero-width spaces
    // \uFEFF: BOM (Byte Order Mark)
    base64Data = base64Data.replace(/[\s\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');
    
    // Step 2: Convert URL-safe base64 to standard base64
    // URL-safe base64 uses - and _ instead of + and /
    base64Data = base64Data.replace(/-/g, "+").replace(/_/g, "/");
    
    // Step 3: Remove ellipsis characters (common truncation indicator)
    base64Data = base64Data.replace(/…/g, '').replace(/\u2026/g, '');
    
    // Step 4: Remove ALL characters that are NOT valid base64
    // This is the critical step - keep only A-Z, a-z, 0-9, +, /
    // Note: We remove = here and will re-add padding later
    base64Data = base64Data.replace(/[^A-Za-z0-9+/]/g, '');

    // Check if we have any valid base64 characters after cleaning
    if (base64Data.length === 0) {
      throw new Error("No valid base64 characters found after cleaning");
    }

    // Check for truncated data - base64 should be at least a few hundred chars for a real image
    // A 1x1 pixel JPEG is about 100-200 bytes, which is ~133-267 base64 chars
    if (base64Data.length < 100) {
      throw new Error(`Base64 data appears truncated or incomplete: only ${base64Data.length} characters (minimum ~100 expected for valid image)`);
    }

    // ===== STEP 2: Add padding if necessary =====
    // Base64 length must be multiple of 4
    const remainder = base64Data.length % 4;
    if (remainder !== 0) {
      const paddingNeeded = 4 - remainder;
      base64Data += "=".repeat(paddingNeeded);
    }

    // ===== STEP 3: Pre-validation before atob() =====
    // Must be at least 4 characters (smallest valid base64 is "AAAA" = 3 bytes)
    if (base64Data.length < 4) {
      throw new Error(`Base64 data too short: ${base64Data.length} characters (minimum 4 required)`);
    }

    // Validate the string contains only valid base64 characters
    // Pattern: [A-Za-z0-9+/]+ followed by optional = padding at end
    const validationRegex = /^[A-Za-z0-9+/]+=*$/;
    if (!validationRegex.test(base64Data)) {
      // Find which characters are invalid
      const invalidMatch = base64Data.match(/[^A-Za-z0-9+/=]/g);
      const invalidChars = invalidMatch ? [...new Set(invalidMatch)].join("") : "unknown";
      
      // Show position of first invalid character
      const firstInvalidMatch = base64Data.match(/[^A-Za-z0-9+/=]/);
      const position = firstInvalidMatch ? firstInvalidMatch.index : -1;
      
      throw new Error(
        `Invalid base64 characters detected after cleaning: "${invalidChars}" at position ${position}. ` +
        `Cleaned data length: ${base64Data.length}`
      );
    }

    // ===== STEP 4: Decode base64 with enhanced error handling and fallback =====
    let bstr: string;
    
    try {
      // Try native atob() first if available
      if (typeof atob === 'function') {
        try {
          bstr = atob(base64Data);
        } catch (_nativeError) {
          // Native atob failed - try manual decoder as fallback
          bstr = manualAtob(base64Data);
        }
      } else {
        // atob not available - use manual decoder
        bstr = manualAtob(base64Data);
      }
    } catch (decodeError) {
      // Both native and manual decoders failed
      let errorMsg = "Unknown decode error";
      
      if (decodeError instanceof Error) {
        errorMsg = decodeError.message || decodeError.toString();
      } else if (typeof decodeError === 'string') {
        errorMsg = decodeError;
      } else if (decodeError && typeof decodeError === 'object') {
        try {
          errorMsg = JSON.stringify(decodeError);
        } catch {
          const unknownError = decodeError as { message?: string; toString?: () => string };
          errorMsg = unknownError.message || unknownError.toString?.() || "Unknown error object";
        }
      }
      
      // Check for common issues
      const hasInvalidLength = base64Data.length % 4 !== 0;
      
      let helpfulMessage = `Base64 decode failed: ${errorMsg}.`;
      
      if (hasInvalidLength) {
        helpfulMessage += ` Base64 length ${base64Data.length} is not a multiple of 4.`;
      }
      
      throw new Error(helpfulMessage);
    }
    
    // ===== STEP 5: Convert binary string to Uint8Array =====
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    
    return new File([u8arr], filename, { type: mime });
  } catch (error) {
    // Re-throw with enhanced error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to convert base64 to file: ${errorMessage}`);
  }
}

/**
 * Safely convert Base64 string to File object without throwing
 * Returns an object with either the file or an error message
 * 
 * @param base64String - The base64 string or data URL to convert
 * @param filename - The filename for the resulting File object
 * @returns Object with file (if successful) and error (if failed)
 */
export function safeBase64ToFile(
  base64String: string, 
  filename: string
): { file: File | null; error: string | null } {
  // Early validation for common edge cases
  if (!base64String) {
    return { 
      file: null, 
      error: "No image data provided. Please select an image." 
    };
  }

  if (typeof base64String !== 'string') {
    return { 
      file: null, 
      error: "Invalid image data format. Please try a different image." 
    };
  }

  // Check for empty or whitespace-only strings
  const trimmed = base64String.trim();
  if (trimmed.length === 0) {
    return { 
      file: null, 
      error: "Image data is empty. Please select a valid image." 
    };
  }

  // Check if it's a valid data URL or base64 string
  const isDataUrl = trimmed.startsWith("data:");
  const looksLikeBase64 = /^[A-Za-z0-9+/=_-]+$/.test(trimmed.replace(/\s/g, ''));
  
  if (!isDataUrl && !looksLikeBase64 && trimmed.length < 100) {
    return { 
      file: null, 
      error: "Invalid image format. Please upload a valid image file." 
    };
  }

  try {
    const file = base64ToFile(base64String, filename);
    return { file, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Provide user-friendly error messages based on common issues
    if (errorMessage.includes("atob() failed")) {
      return { 
        file: null, 
        error: "Image data is corrupted. Please try uploading the image again." 
      };
    }
    
    if (errorMessage.includes("No valid base64 characters")) {
      return { 
        file: null, 
        error: "Invalid image data. Please select a valid image file." 
      };
    }
    
    if (errorMessage.includes("Base64 data too short")) {
      return { 
        file: null, 
        error: "Image file is too small or corrupted. Please try a different image." 
      };
    }

    if (errorMessage.includes("Invalid data URL")) {
      return { 
        file: null, 
        error: "Invalid image format. Please upload a valid image file." 
      };
    }

    // Generic error for other cases
    return { 
      file: null, 
      error: `Failed to process image: ${errorMessage}. Please try again.` 
    };
  }
}
