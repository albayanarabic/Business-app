// ============================================================
// BIZTRACK NIGERIA — IMAGE COMPRESSOR & SUPABASE STORAGE UPLOADER
// Compresses photos client-side to <120KB for fast Nigerian 3G/4G
// ============================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { idbPut } from '../lib/indexedDb';

export interface CompressResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Compresses an image file client-side to max 800px width/height and ~70% JPEG quality.
 */
export const compressProductImage = (
  file: File,
  maxDimension = 800,
  quality = 0.72
): Promise<CompressResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio scale
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context not available'));
          return;
        }

        // Draw image
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create image blob'));
              return;
            }

            resolve({
              dataUrl,
              blob,
              width,
              height,
              sizeBytes: blob.size,
            });
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image file'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Uploads compressed image to Supabase Storage or falls back to local IndexedDB if offline.
 */
export const uploadOrStoreProductImage = async (
  file: File,
  productId: string,
  businessId?: string
): Promise<string> => {
  const compressed = await compressProductImage(file);

  // If online, authenticated, and Supabase is configured
  if (navigator.onLine && isSupabaseConfigured()) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        const ext = 'jpg';
        const fileName = `${businessId || 'shop'}/${productId}_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, compressed.blob, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);

          if (publicUrlData?.publicUrl) {
            return publicUrlData.publicUrl;
          }
        }
      }
    } catch (err) {
      console.warn('Direct image upload failed, caching locally in IndexedDB:', err);
    }
  }

  // Fallback: save to IndexedDB offline images store and return base64 dataUrl
  try {
    await idbPut('offline_images', {
      id: productId,
      dataUrl: compressed.dataUrl,
      productId,
      businessId,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to cache image in IndexedDB:', err);
  }

  return compressed.dataUrl;
};
