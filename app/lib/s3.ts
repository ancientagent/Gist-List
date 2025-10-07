
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client, getBucketConfig } from './aws-config';
import { compressImage } from './image-compression';

const s3Client = createS3Client();

export interface UploadResult {
  key: string;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
}

export async function uploadFile(
  buffer: Buffer, 
  fileName: string,
  compress: boolean = true
): Promise<string> {
  const { bucketName, folderPrefix } = getBucketConfig();
  const key = `${folderPrefix}${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
  });

  await s3Client.send(command);
  return key;
}

/**
 * Upload file with compression and return detailed metrics
 */
export async function uploadFileWithCompression(
  buffer: Buffer,
  fileName: string
): Promise<UploadResult> {
  const { bucketName, folderPrefix } = getBucketConfig();
  const key = `${folderPrefix}${fileName}`;
  
  const originalSize = buffer.length;
  
  // Compress image
  const compressed = await compressImage(buffer, {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 85,
    format: 'jpeg',
  });

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: compressed.buffer,
    ContentType: 'image/jpeg',
  });

  await s3Client.send(command);
  
  return {
    key,
    originalSize,
    compressedSize: compressed.compressedSize,
    savingsPercent: compressed.savingsPercent,
  };
}

export async function downloadFile(key: string): Promise<string> {
  const { bucketName } = getBucketConfig();

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return url;
}

export async function deleteFile(key: string): Promise<void> {
  const { bucketName } = getBucketConfig();

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await s3Client.send(command);
}

export async function renameFile(oldKey: string, newKey: string): Promise<string> {
  const { bucketName } = getBucketConfig();

  // Download old file
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: oldKey,
  });

  const { Body } = await s3Client.send(getCommand);
  const buffer = await streamToBuffer(Body as any);

  // Upload with new key
  await uploadFile(buffer, newKey);

  // Delete old file
  await deleteFile(oldKey);

  return newKey;
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on('data', (chunk: any) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
