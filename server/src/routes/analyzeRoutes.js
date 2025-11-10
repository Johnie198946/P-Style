import { Router } from 'express';
import multer from 'multer';
import { analyzePart1, analyzePart2, analyzeCombined } from '../services/analyzeService.js';
import { getTaskById, listRecentTasks } from '../services/taskService.js';
import { formatAnalysisResult } from '../services/analysisFormatter.js';
import { success } from '../utils/http.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

const router = Router();

router.post(
  '/part1',
  upload.fields([
    { name: 'sourceImage', maxCount: 1 },
    { name: 'targetImage', maxCount: 1 }
  ]),
  async (req, res, next) => {
    try {
      const sourceFile = req.files?.sourceImage?.[0];
      const targetFile = req.files?.targetImage?.[0];
      const result = await analyzePart1({ sourceFile, targetFile });
      success(res, result);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/part2',
  upload.fields([
    { name: 'sourceImage', maxCount: 1 },
    { name: 'targetImage', maxCount: 1 }
  ]),
  async (req, res, next) => {
    try {
      const sourceFile = req.files?.sourceImage?.[0];
      const targetFile = req.files?.targetImage?.[0];
      const { taskId } = req.body;
      const result = await analyzePart2({ taskId, sourceFile, targetFile });
      success(res, result);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/',
  upload.fields([
    { name: 'sourceImage', maxCount: 1 },
    { name: 'targetImage', maxCount: 1 }
  ]),
  async (req, res, next) => {
    try {
      const sourceFile = req.files?.sourceImage?.[0];
      const targetFile = req.files?.targetImage?.[0];
      const result = await analyzeCombined({ sourceFile, targetFile });
      success(res, result);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:taskId', async (req, res, next) => {
  try {
    const task = await getTaskById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }

    const stage = task.part2_completed ? 'part2' : 'part1';
    const naturalLanguage =
      task.natural_language_part2 || task.natural_language_part1 || '';

    const existingStructured =
      task.structured_result && typeof task.structured_result === 'object'
        ? task.structured_result
        : null;

    const structured =
      existingStructured && Object.keys(existingStructured).length
        ? existingStructured
        : formatAnalysisResult({
            stage,
            rawAnalysis: task.gemini_result || {},
            naturalLanguage,
            colorMapping: task.mapping_result || null
          });

    success(res, { task, structuredResult: structured });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const tasks = await listRecentTasks();
    success(res, { tasks });
  } catch (error) {
    next(error);
  }
});

export default router;

