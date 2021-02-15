import { existsSync, mkdirSync } from 'fs';
import { createServer } from 'http';
import { WorkerPool, WorkerResult } from './WorkerPool';

const pool = new WorkerPool(4);

function runWorker(code: string): Promise<WorkerResult> {
  return pool.work({ code });
}

function getTimestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function serve() {
  if (!existsSync('temp')) {
    mkdirSync('temp');
  }

  let server = createServer((request, response) => {
    if (request.method !== 'POST') {
      response.statusCode = 400;
      response.setHeader('Content-Type', 'text/plain');
      response.end('Please send a POST request.');
    } else {
      let url = new URL('http://127.0.0.1:9292' + request.url);
      let type = url.searchParams.get('type');
      let tex = url.searchParams.get('tex');

      response.statusCode = 200;
      response.setHeader('Content-Type', 'text/plain');

      if (type === 'tikzpicture' || type === 'tikzcd') {
        console.log(`[${getTimestamp()}] Accepted.`);
        let start = new Date().valueOf();

        let code = `\\begin{${type}}${tex}\\end{${type}}`;

        runWorker(code).then((result) => {
          response.statusCode = 200;
          response.end(result.svg);

          console.log(`[${getTimestamp()}] Resolved (${new Date().valueOf() - start} ms)`);
        });
      } else {
        response.end('');
      }
    }
  });

  server.listen(9292, '127.0.0.1', () => {
    console.log(`[${getTimestamp()}] tikz2svg running at http://127.0.0.1:9292`);
  });
}

serve();
