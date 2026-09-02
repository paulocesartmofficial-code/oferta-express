import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const outDir = path.join(process.cwd(), 'public', 'downloads');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const tarFile = path.join(outDir, 'oferta-express-android.tar.gz');
console.log('Packaging Android project to', tarFile);

try {
  execSync(`tar --exclude="android/.gradle" --exclude="android/build" --exclude="android/app/build" -czf "${tarFile}" android`);
  console.log('Successfully created Android archive:', tarFile);
} catch (e) {
  console.error('Failed to package Android source:', e.message);
}
