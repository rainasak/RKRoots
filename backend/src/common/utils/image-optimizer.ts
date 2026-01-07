import sharp from 'sharp';

export class ImageOptimizer {
  async optimizeImage(buffer: Buffer, maxWidth = 1200): Promise<Buffer> {
    return await sharp(buffer)
      .resize(maxWidth, null, { withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  }

  async createThumbnail(buffer: Buffer, size = 200): Promise<Buffer> {
    return await sharp(buffer)
      .resize(size, size, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();
  }
}
