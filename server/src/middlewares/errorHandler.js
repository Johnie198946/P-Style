import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  logger.error('请求处理失败', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || '服务器内部错误',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: '接口不存在' });
}


