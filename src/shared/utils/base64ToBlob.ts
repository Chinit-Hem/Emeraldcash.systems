/**
 * CSP-Compliant Base64 to Blob Conversion
 * 
 * This utility converts base64 data URLs to Blob objects without using fetch(),
 * which avoids Content Security Policy (CSP) violations.
 * 
 * CSP connect-src directives often block 'data:' URLs, causing fetch() to fail.
 * This function uses atob() and Uint8Array for a CSP-compliant solution.
 * 
 * @module base64ToBlob
 */

/**
 * Convert a base64 data URL to a Blob object
 * 
 * @param dataUrl - The base64 data URL (e.g., "data:image/jpeg;base64,/9j/4AAQ...")
 * @returns Blob - The converted Blob object
 * @throws Error if the data URL is invalid or conversion fails
 */
export function base64ToBlob(dataUrl: string): Blob {
  // Validate input
  if (!dataUrl || typeof dataUrl !== 'string') {
    throw new Error('Invalid data URL: must be a non-empty string');
  }

  // Check if it's a valid data URL format
  if (!dataUrl.startsWith('data:')) {
    throw new Error('Invalid data URL: must start with "data:"');
  }

  // Parse the data URL
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) {
    throw new Error('Invalid data URL: missing comma separator');
  }

  // Extract the header and determine mime type
  const header = dataUrl.substring(0, commaIndex);
  const base64Data = dataUrl.substring(commaIndex + 1);

  // Get mime type from header (default to application/octet-stream)
  const mimeMatch = header.match(/data:([^;]+)/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

  // Check if it's base64 encoded
  const isBase64 = header.includes(';base64');

  let byteString: string;

  if (isBase64) {
    // Decode base64
    try {
      // Clean the base64 data - remove whitespace and invalid characters
      const cleanedBase64 = base64Data.replace(/[\s\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF…]/g, '');
      byteString = atob(cleanedBase64);
    } catch (err) {
      throw new Error(`Failed to decode base64 data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  } else {
    // URL-encoded data (not base64)
    try {
      byteString = decodeURIComponent(base64Data);
    } catch (err) {
      throw new Error(`Failed to decode URL-encoded data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // Convert to Uint8Array
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }

  // Create and return Blob
  return new Blob([bytes], { type: mimeType });
}

/**
 * Convert a base64 data URL to a File object
 * 
 * @param dataUrl - The base64 data URL
 * @param filename - The desired filename for the File
 * @returns File - The converted File object
 * @throws Error if the data URL is invalid or conversion fails
 */
export function base64ToFile(dataUrl: string, filename: string): File {
  const blob = base64ToBlob(dataUrl);
  return new File([blob], filename, { type: blob.type });
}

/**
 * Check if a string is a valid base64 data URL
 * 
 * @param value - The string to check
 * @returns boolean - True if valid base64 data URL
 */
export function isValidBase64DataUrl(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  if (!value.startsWith('data:')) return false;
  
  const commaIndex = value.indexOf(',');
  if (commaIndex === -1) return false;
  
  const header = value.substring(0, commaIndex);
  const base64Data = value.substring(commaIndex + 1);
  
  // Check for valid mime type
  const mimeMatch = header.match(/^data:([^;]+)/);
  if (!mimeMatch) return false;
  
  // Check if base64
  if (header.includes(';base64')) {
    // Validate base64 characters
    const cleaned = base64Data.replace(/[\s\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF…]/g, '');
    if (cleaned.length < 10) return false;
    
    // Try to validate by attempting decode
    try {
      atob(cleaned);
      return true;
    } catch {
      return false;
    }
  }
  
  return true;
}

/**
 * Get the size of a base64 data URL in bytes
 * 
 * @param dataUrl - The base64 data URL
 * @returns number - Estimated size in bytes
 */
export function getBase64DataUrlSize(dataUrl: string): number {
  if (!isValidBase64DataUrl(dataUrl)) return 0;
  
  const commaIndex = dataUrl.indexOf(',');
  const base64Data = dataUrl.substring(commaIndex + 1);
  
  // Remove whitespace and padding
  const cleaned = base64Data.replace(/[\s=]/g, '');
  
  // Base64 is 4/3 of original size, so multiply by 3/4
  return Math.floor((cleaned.length * 3) / 4);
}

/**
 * Format bytes to human-readable string
 * 
 * @param bytes - Number of bytes
 * @returns string - Formatted size (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

