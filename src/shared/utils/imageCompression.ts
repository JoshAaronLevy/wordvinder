import imageCompression from 'browser-image-compression'

export type CompressImageOptions = {
  /**
   * If the original file is below this size, we skip compression entirely.
   * Defaults to 2MB.
   */
  thresholdBytes?: number
  /** Target maximum size (in MB) when compressing. Defaults to 0.95 (≈ 1MB). */
  maxSizeMB?: number
  /** Maximum width or height (px). Defaults to 1920. */
  maxWidthOrHeight?: number
}

/**
 * Client-side compression to improve upload reliability (and reduce bandwidth).
 *
 * Notes:
 * - Returns the original File when compression is not needed or fails.
 * - Uses a Web Worker when available.
 */
export const compressImageIfNeeded = async (
  file: File,
  options: CompressImageOptions = {}
): Promise<File> => {
  const {
    thresholdBytes = 2 * 1024 * 1024,
    maxSizeMB = 0.95,
    maxWidthOrHeight = 1920,
  } = options

  // Only attempt compression for images.
  if (!file.type.startsWith('image/')) return file

  // If already small, keep as-is.
  if (file.size < thresholdBytes) return file

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: true,
    })

    // If it's already a File, keep it (it should preserve type/name in most cases).
    if (compressed instanceof File) return compressed

    // Otherwise it's a Blob (or Blob-like). Wrap in a File with stable name/type.
    const blob = compressed as Blob

    return new File([blob], file.name, {
      type: file.type, // <- don't read blob.type; just keep the original mime
      lastModified: Date.now(),
    })
  } catch (error) {
    // Compression should never block uploads; fall back to original.
    console.warn('[WordVinder] Screenshot compression failed; uploading original file.', error)
    return file
  }
}
