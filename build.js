const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const distDir = path.join(__dirname, 'dist');

console.log('Building static output for Vercel...');

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

const itemsToCopy = [
  'index.html',
  'assets',
  'audio',
  'favicon.ico',
  'placeholder.svg',
  'robots.txt'
];

for (const item of itemsToCopy) {
  const src = path.join(srcDir, item);
  const dest = path.join(distDir, item);
  if (fs.existsSync(src)) {
    copyRecursive(src, dest);
    console.log(`Copied ${item} to dist/`);
  }
}

console.log('Build completed successfully! Static files ready in dist/ and root.');
