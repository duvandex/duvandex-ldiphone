export const CLOUDINARY_CONFIG = {
  cloudName: 'dj1ygaitz',
  uploadPreset: 'ldiphone_preset',
  baseUrl: 'https://res.cloudinary.com/dj1ygaitz/image/upload/',
};

export function getOptimizedUrl(url: string, width: number = 800): string {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/w_${width},f_auto,q_auto/`);
}
