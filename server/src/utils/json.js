import { jsonrepair } from 'jsonrepair';

export function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    const repaired = jsonrepair(raw);
    return JSON.parse(repaired);
  }
}


