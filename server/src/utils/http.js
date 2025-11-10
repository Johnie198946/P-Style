export function success(res, payload, status = 200) {
  return res.status(status).json({ success: true, ...payload });
}

export function failure(res, message, status = 500, details) {
  const body = { success: false, message };
  if (details) body.details = details;
  return res.status(status).json(body);
}


