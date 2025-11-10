import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

async function main() {
  const modulePath = pathToFileURL(path.resolve('server/src/utils/image.js')).href;
  const { extractImageMeta } = await import(modulePath);
  const buffer = fs.readFileSync(path.resolve('reference.jpg'));
  const meta = await extractImageMeta(buffer);
  fs.writeFileSync('/tmp/meta.json', JSON.stringify(meta));
}

main().catch((err) => {
  fs.writeFileSync('/tmp/meta-error.txt', err.stack || String(err));
});
