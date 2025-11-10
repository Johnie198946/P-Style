import { Router } from 'express';
import multer from 'multer';
import { toDataUrl } from '../utils/file.js';
import { createUpload } from '../services/uploadService.js';
import { success } from '../utils/http.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

const router = Router();

router.post(
  '/upload',
  upload.fields([
    { name: 'sourcePhoto', maxCount: 1 },
    { name: 'targetPhoto', maxCount: 1 }
  ]),
  async (req, res, next) => {
    try {
      const sourceFile = req.files?.sourcePhoto?.[0];
      const targetFile = req.files?.targetPhoto?.[0];

      if (!sourceFile) {
        return res.status(400).json({ success: false, message: 'sourcePhoto 为必填项' });
      }

      const sourceDataUrl = toDataUrl(sourceFile);
      const targetDataUrl = targetFile ? toDataUrl(targetFile) : null;
      const similarity = estimateSimilarity(sourceFile, targetFile);

      const record = await createUpload({
        sourceImageData: sourceDataUrl,
        targetImageData: targetDataUrl,
        similarityScore: similarity
      });

      success(res, {
        uploadId: record.id,
        similarityScore: similarity
      });
    } catch (error) {
      next(error);
    }
  }
);

function estimateSimilarity(sourceFile, targetFile) {
  if (!sourceFile || !targetFile) return null;
  const diff = Math.abs(sourceFile.size - targetFile.size);
  const max = Math.max(sourceFile.size, targetFile.size);
  if (!max) return null;
  const ratio = Math.max(0, Math.min(1, 1 - diff / max));
  return Number((ratio * 100).toFixed(2));
}

export default router;




