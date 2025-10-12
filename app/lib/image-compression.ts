
// Image compression utilities using Sharp

import sharp from 'sharp';

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;        // 1-100
  format?: 'jpeg' | 'png' | 'webp';
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 85,
  format: 'jpeg',
};

/**
 * Compress an image buffer
 * Returns { buffer, originalSize, compressedSize, compressionRatio }
 */
export async function compressImage(
  inputBuffer: Buffer,
  options: CompressionOptions = {}
): Promise<{
  buffer: Buffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  savingsPercent: number;
}> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = inputBuffer.length;
  
  try {
    let pipeline = sharp(inputBuffer);
    
    // Resize if needed
    if (opts.maxWidth || opts.maxHeight) {
      pipeline = pipeline.resize(opts.maxWidth, opts.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    
    // Apply compression based on format
    switch (opts.format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: opts.quality, mozjpeg: true });
        break;
      case 'png':
        pipeline = pipeline.png({ quality: opts.quality, compressionLevel: 9 });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality: opts.quality });
        break;
    }
    
    const compressedBuffer = await pipeline.toBuffer();
    const compressedSize = compressedBuffer.length;
    const compressionRatio = originalSize / compressedSize;
    const savingsPercent = ((originalSize - compressedSize) / originalSize) * 100;
    
    return {
      buffer: compressedBuffer,
      originalSize,
      compressedSize,
      compressionRatio,
      savingsPercent,
    };
  } catch (error) {
    console.error('Image compression error:', error);
    // Return original if compression fails
    return {
      buffer: inputBuffer,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
      savingsPercent: 0,
    };
  }
}

/**
 * Generate a thumbnail from an image
 */
export async function generateThumbnail(
  inputBuffer: Buffer,
  size: number = 300
): Promise<Buffer> {
  return sharp(inputBuffer)
    .resize(size, size, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toBuffer();
}

/**
 * Get image metadata (dimensions, format, size)
 */
export async function getImageMetadata(inputBuffer: Buffer): Promise<{
  width: number;
  height: number;
  format: string;
  size: number;
}> {
  const metadata = await sharp(inputBuffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
    size: inputBuffer.length,
  };
}
