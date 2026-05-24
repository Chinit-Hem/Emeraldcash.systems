/**
 * Universal UUID v4 generator - works in Node.js >=14.17.0 and all browsers
 * Uses crypto.getRandomValues() - native, zero dependencies, faster than npm packages
 */
export function generateUUID(): string {
  // Standard UUID v4 template
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 0x3) | 0x8;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Short UUID for publicIds (first 8 chars)  
export function generateShortUUID(): string {
  return generateUUID().slice(0, 8);
}

