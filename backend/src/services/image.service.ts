import sharp from 'sharp';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const MAX_DIMENSION = parseInt(process.env.IMAGE_MAX_DIMENSION || '2048', 10);
const WEBP_QUALITY = parseInt(process.env.IMAGE_QUALITY || '80', 10);

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:3900',
  region: 'garage',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
  },
  forcePathStyle: true, // Required for Garage/MinIO
});

const BUCKET = process.env.S3_BUCKET || 'suipic-images';

export type TImageMetadata = {
  width: number;
  height: number;
  exifData: Record<string, unknown> | null;
};

export type TProcessedImage = {
  storageKey: string;
  metadata: TImageMetadata;
  buffer: Buffer;
};

/**
 * Process and compress an image to WebP format
 */
export const processImage = async (
  inputBuffer: Buffer,
  originalFilename: string
): Promise<TProcessedImage> => {
  // Create sharp instance
  const image = sharp(inputBuffer);
  
  // Get original metadata
  const metadata = await image.metadata();
  
  // Extract EXIF data
  let exifData: Record<string, unknown> | null = null;
  if (metadata.exif) {
    try {
      // Parse EXIF - basic extraction
      exifData = {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        space: metadata.space,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
      };
      
      // Add ICC profile info if present
      if (metadata.icc) {
        exifData.hasIccProfile = true;
      }
    } catch (error) {
      console.error('Failed to parse EXIF:', error);
    }
  }
  
  // Resize if needed (maintaining aspect ratio)
  let width = metadata.width || MAX_DIMENSION;
  let height = metadata.height || MAX_DIMENSION;
  
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width > height) {
      height = Math.round((height / width) * MAX_DIMENSION);
      width = MAX_DIMENSION;
    } else {
      width = Math.round((width / height) * MAX_DIMENSION);
      height = MAX_DIMENSION;
    }
  }
  
  // Process to WebP
  const processedBuffer = await image
    .resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .rotate() // Auto-rotate based on EXIF
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
  
  // Generate storage key
  const ext = 'webp';
  const timestamp = Date.now();
  const uniqueId = uuidv4();
  const storageKey = `images/${timestamp}-${uniqueId}.${ext}`;
  
  return {
    storageKey,
    buffer: processedBuffer,
    metadata: {
      width,
      height,
      exifData,
    },
  };
};

/**
 * Upload processed image to S3
 */
export const uploadToS3 = async (
  storageKey: string,
  buffer: Buffer
): Promise<void> => {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
    Body: buffer,
    ContentType: 'image/webp',
  });
  
  await s3Client.send(command);
};

/**
 * Get a signed URL for image access
 */
export const getImageUrl = async (
  storageKey: string,
  expiresIn: number = 3600
): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
  });
  
  return getSignedUrl(s3Client, command, { expiresIn });
};

/**
 * Get image buffer from S3
 */
export const getImageBuffer = async (storageKey: string): Promise<Buffer> => {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
  });
  
  const response = await s3Client.send(command);
  const stream = response.Body as NodeJS.ReadableStream;
  
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  
  return Buffer.concat(chunks);
};

/**
 * Delete image from S3
 */
export const deleteFromS3 = async (storageKey: string): Promise<void> => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
  });
  
  await s3Client.send(command);
};

/**
 * Process and upload image in one step
 */
export const processAndUploadImage = async (
  inputBuffer: Buffer,
  originalFilename: string
): Promise<{ storageKey: string; metadata: TImageMetadata }> => {
  const processed = await processImage(inputBuffer, originalFilename);
  await uploadToS3(processed.storageKey, processed.buffer);
  
  return {
    storageKey: processed.storageKey,
    metadata: processed.metadata,
  };
};
