import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const standaloneDir = path.join(__dirname, '.next', 'standalone');
const staticSourceDir = path.join(__dirname, '.next', 'static');
const staticDestDir = path.join(standaloneDir, '_next', 'static');
const loaderTemplateFile = path.join(__dirname, 'templates', 'loader.mjs');
const loaderDestFile = path.join(standaloneDir, 'loader.mjs');
const publicSourceDir = path.join(__dirname, 'public');
const publicDestDir = path.join(standaloneDir, 'public');

// Function to ensure directory exists
/**
 * @param {fs.PathLike} dir
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Ensure the standalone and _next directories exist
ensureDir(standaloneDir);
ensureDir(path.join(standaloneDir, '_next'));

// Copy the loader.cjs template file to the standalone directory
fs.copyFileSync(loaderTemplateFile, loaderDestFile);

// Copy the .next/static directory to .next/standalone/_next
fs.cpSync(staticSourceDir, staticDestDir, { recursive: true });

// Copy the public directory to .next/standalone/public
fs.cpSync(publicSourceDir, publicDestDir, { recursive: true });

console.log('Post-build tasks completed successfully!');