const JPEG_PREFIX = 'data:image/jpeg;base64,';
const PNG_PREFIX = 'data:image/png;base64,';

export function toDataUrl(file) {
  if (!file) return null;
  const mime = file.mimetype || 'image/jpeg';
  const prefix = `data:${mime};base64,`;
  return prefix + file.buffer.toString('base64');
}

export function stripDataUrl(dataUrl) {
  if (!dataUrl) return null;
  if (dataUrl.startsWith('data:')) {
    return dataUrl.split(',')[1];
  }
  return dataUrl;
}

export function guessMimeFromDataUrl(dataUrl) {
  if (!dataUrl) return 'image/jpeg';
  if (dataUrl.startsWith(PNG_PREFIX)) return 'image/png';
  if (dataUrl.startsWith(JPEG_PREFIX)) return 'image/jpeg';
  const match = dataUrl.match(/^data:(.+?);base64,/);
  return (match && match[1]) || 'image/jpeg';
}





