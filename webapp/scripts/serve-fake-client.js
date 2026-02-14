#!/usr/bin/env node

// Simple static file server for fake-client-site
// Runs on port 3001 (separate from Next.js server on 3000)

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const ROOT_DIR = path.join(__dirname, '../..', 'fake-client-site');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Remove query string and hash
  let filePath = req.url.split('?')[0].split('#')[0];
  
  // Default to index.html
  if (filePath === '/') {
    filePath = '/index.html';
  }

  const fullPath = path.join(ROOT_DIR, filePath);
  const ext = path.extname(fullPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found, try index.html
        if (filePath !== '/index.html') {
          const indexPath = path.join(ROOT_DIR, 'index.html');
          fs.readFile(indexPath, (err, content) => {
            if (err) {
              res.writeHead(404);
              res.end('File not found');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(content, 'utf-8');
            }
          });
        } else {
          res.writeHead(404);
          res.end('File not found');
        }
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n✓ Fake client site server running on http://localhost:${PORT}`);
  console.log(`  Serving files from: ${ROOT_DIR}`);
  console.log(`\n  Visit: http://localhost:${PORT}\n`);
});
