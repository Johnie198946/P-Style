import imageSize from 'image-size';
import exifr from 'exifr';
import { logger } from './logger.js';
const EXIF_TIMEOUT_MS = 5000;

export async function extractImageMeta(buffer) {
  if (!buffer) return null;

  const start = Date.now();
  logger.info('extractImageMeta: 开始提取尺寸', { elapsed: 0 });
  const exifPromise = exifr.parse(buffer).catch(() => null);

  let dimensions = null;
  try {
    dimensions = imageSize(buffer);
  } catch (error) {
    logger.warn('extractImageMeta: 尺寸解析失败', { error: error?.message });
    dimensions = null;
  }
  logger.info('extractImageMeta: 尺寸提取完成', { elapsed: Date.now() - start, hasDimensions: Boolean(dimensions) });

  let exif = null;
  try {
    exif = await Promise.race([
      exifPromise,
      new Promise((resolve) => setTimeout(() => resolve(null), EXIF_TIMEOUT_MS))
    ]);
  } catch {
    exif = null;
  }
  logger.info('extractImageMeta: EXIF 处理完成', { elapsed: Date.now() - start, hasExif: Boolean(exif) });

  if (!dimensions) {
    logger.warn('extractImageMeta: 未获取尺寸', { elapsed: Date.now() - start });
    return { dimensions: null, exif };
  }

  const { width, height, type, orientation } = dimensions;
  const display = `${width}×${height}`;

  return {
    dimensions: {
      width,
      height,
      type: type || null,
      orientation: orientation || null,
      display
    },
    exif
  };
}

