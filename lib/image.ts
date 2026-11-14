/**
 * Client-side photo preparation. A phone photo is 3–12 MB; the reader only needs the digits,
 * so the browser shrinks it before upload. Nothing here touches the network or storage.
 */

/** Longest side of the photo sent to the reader, in pixels. */
export const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.8;

/** The browser can't decode this file (e.g. an iPhone HEIC photo opened on a desktop). */
export class UnreadableImageError extends Error {
  constructor() {
    super("The browser can't decode this image.");
    this.name = "UnreadableImageError";
  }
}

/** Scale a size down so its longest side is at most `max`. Small images are left alone. */
export function fitWithin(width: number, height: number, max: number = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Resize and compress a photo to a JPEG data URL. Throws `UnreadableImageError` if it can't be decoded. */
export async function toJpegDataUrl(file: Blob): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    // "from-image" applies the EXIF rotation, so a portrait phone photo stays upright.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new UnreadableImageError();
  }
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new UnreadableImageError();
    // JPEG has no transparency: put white paper under transparent PNGs and screenshots.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    bitmap.close();
  }
}
