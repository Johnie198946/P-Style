import { Router } from 'express';
import { getTaskById } from '../services/taskService.js';
import { buildJsonExport, buildXmpExport, buildJsxExport } from '../services/exportService.js';

const router = Router();

router.get('/json', handleExport((task) => ({
  payload: buildJsonExport(task),
  contentType: 'application/json; charset=utf-8',
  extension: 'json'
})));

router.get('/:taskId/json', handleExport((task) => ({
  payload: buildJsonExport(task),
  contentType: 'application/json; charset=utf-8',
  extension: 'json'
})));

router.get('/xmp', handleExport((task) => ({
  payload: buildXmpExport(task),
  contentType: 'application/octet-stream; charset=utf-8',
  extension: 'xmp'
})));

router.get('/:taskId/xmp', handleExport((task) => ({
  payload: buildXmpExport(task),
  contentType: 'application/octet-stream; charset=utf-8',
  extension: 'xmp'
})));

router.get('/jsx', handleExport((task) => ({
  payload: buildJsxExport(task),
  contentType: 'application/javascript; charset=utf-8',
  extension: 'jsx'
})));

router.get('/:taskId/jsx', handleExport((task) => ({
  payload: buildJsxExport(task),
  contentType: 'application/javascript; charset=utf-8',
  extension: 'jsx'
})));

function handleExport(builder) {
  return async (req, res, next) => {
    try {
      const taskId = req.params.taskId || req.query.taskId;
      if (!taskId) {
        return res.status(400).json({ success: false, message: '缺少 taskId 参数' });
      }
      const task = await getTaskById(taskId);
      if (!task) {
        return res.status(404).json({ success: false, message: '任务不存在' });
      }
      const { payload, contentType, extension } = builder(task);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename=${taskId}.${extension}`);
      res.send(payload);
    } catch (error) {
      next(error);
    }
  };
}

export default router;

