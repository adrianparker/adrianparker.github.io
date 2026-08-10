/**
 * Utility to start and stop a simple HTTP server for serving the _site directory.
 * This ensures CSS and other assets load correctly in visual regression tests.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';

let server = null;

/**
 * Start a simple HTTP server serving the _site directory
 * @param {number} port - Port to listen on (default 3000)
 * @returns {Promise<number>} The port the server is listening on
 */
export function startServer(port = 3000) {
  return new Promise((resolve, reject) => {
    const siteDir = path.join(process.cwd(), '_site');

    const requestHandler = (req, res) => {
      let filePath = path.join(siteDir, req.url);

      // If request is a directory, try index.html
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      // Default to index.html if file doesn't exist
      if (!fs.existsSync(filePath)) {
        filePath = path.join(siteDir, 'index.html');
      }

      // Read and serve the file
      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }

        // Set appropriate content type
        const ext = path.extname(filePath);
        const contentTypeMap = {
          '.html': 'text/html; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.js': 'application/javascript',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.xml': 'application/xml'
        };
        const contentType = contentTypeMap[ext] || 'application/octet-stream';

        res.writeHead(200, { 
          'Content-Type': contentType,
          'Cache-Control': 'no-cache'
        });
        res.end(content);
      });
    };

    server = http.createServer(requestHandler);

    server.listen(port, 'localhost', () => {
      console.log(`HTTP server listening on http://localhost:${port}`);
      resolve(port);
    });

    server.on('error', (err) => {
      console.error(`HTTP server error: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Stop the HTTP server
 * @returns {Promise<void>}
 */
export function stopServer() {
  return new Promise((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }

    server.close((err) => {
      if (err) reject(err);
      else {
        console.log('HTTP server stopped');
        server = null;
        resolve();
      }
    });
  });
}
