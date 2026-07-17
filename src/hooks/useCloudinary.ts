import { useState } from 'react';
import { CLOUDINARY_CONFIG } from '../lib/cloudinary';

export function useCloudinary() {
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File, folder: string = 'ldiphone'): Promise<string> => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
      formData.append('folder', folder);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error al subir imagen a Cloudinary');
      }
      
      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Cloudinary Upload Error:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const uploadMultiple = async (files: File[], folder: string = 'ldiphone/products'): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadImage(file, folder);
      urls.push(url);
    }
    return urls;
  };

  const getOptimizedUrl = (url: string, width: number = 800, height: number = 800, crop: string = 'fill') => {
    if (!url || !url.includes('cloudinary.com')) return url;
    // Replace /upload/ with /upload/w_W,h_H,c_C,f_auto,q_auto/
    const parts = url.split('/upload/');
    if (parts.length !== 2) return url;
    return `${parts[0]}/upload/w_${width},h_${height},c_${crop},f_auto,q_auto/${parts[1]}`;
  };

  return { uploadImage, uploadMultiple, uploading, getOptimizedUrl };
}
