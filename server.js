const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

function handler(req, res) {
  try {
    let cleanPath = (req.url || '/').split('?')[0];
    cleanPath = decodeURIComponent(cleanPath);

    if (cleanPath === '/' || cleanPath === '') {
      cleanPath = '/index.html';
    }

    const relPath = cleanPath.replace(/^\/+/, '');

    // Search for the requested file across possible roots in Vercel & local
    const candidates = [
      path.join(__dirname, relPath),
      path.join(process.cwd(), relPath)
    ];

    let targetFile = null;
    for (const c of candidates) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) {
        targetFile = c;
        break;
      }
    }

    // SPA fallback: if not an asset/file request, fallback to index.html
    if (!targetFile) {
      if (!cleanPath.includes('.') || cleanPath.endsWith('.html')) {
        const fallbacks = [
          path.join(__dirname, 'index.html'),
          path.join(process.cwd(), 'index.html')
        ];
        for (const fb of fallbacks) {
          if (fs.existsSync(fb) && fs.statSync(fb).isFile()) {
            targetFile = fb;
            break;
          }
        }
      }
    }

    if (!targetFile || !fs.existsSync(targetFile)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${cleanPath}`);
      return;
    }

    const stats = fs.statSync(targetFile);
    const ext = path.extname(targetFile).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Audio byte range streaming support (critical for iOS/Safari/Chrome)
    const range = req.headers.range;
    if (range && ext === '.mp3') {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });

      fs.createReadStream(targetFile, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Length': stats.size,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': ext === '.html' ? 'public, max-age=0, must-revalidate' : 'public, max-age=31536000, immutable'
    });

    fs.createReadStream(targetFile).pipe(res);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server Error: ' + err.message);
  }
}

// Support running locally via `node server.js`
if (require.main === module || !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  const HOST = '127.0.0.1';
  http.createServer(handler).listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}/`);
  });
}

// Export handler for Vercel Serverless Function
module.exports = handler;
