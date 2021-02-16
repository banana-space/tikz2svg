import { spawnSync } from 'child_process';
import { copyFile, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { parentPort } from 'worker_threads';
import { WorkerData, WorkerResult } from './WorkerPool';
import md5 from 'md5';
import rimraf from 'rimraf';

parentPort?.on('message', (value: WorkerData) => {
  try {
    parentPort?.postMessage(work(value));
  } catch {
    parentPort?.postMessage({
      taskId: value.taskId ?? 0,
      svg: '',
    });
  }
});

function work(data: WorkerData): WorkerResult {
  if (data.expiresAt && new Date().getTime() > data.expiresAt) {
    return {
      taskId: data.taskId ?? 0,
      svg: '',
    };
  }

  let tempDir = 'temp/t' + data.taskId;
  let svg = '';

  try {
    // if hash exists, return it
    let now = new Date();
    let today = new Date(now.valueOf() - 14400000).toISOString().split('T')[0];

    if (!existsSync('temp/' + today)) {
      mkdirSync('temp/' + today);

      let toDelete = new Date(now.valueOf() - 14400000 - 86400000 * 30).toISOString().split('T')[0];
      if (existsSync('temp/' + toDelete)) rimraf('temp/' + toDelete, () => {});
    }
    let hash = md5(data.code);

    if (existsSync(`temp/${today}/${hash}.svg`)) {
      return {
        taskId: data.taskId ?? 0,
        svg: readFileSync(`temp/${today}/${hash}.svg`).toString(),
      };
    }

    for (let day = 1; day < 30; day++) {
      let date = new Date(now.valueOf() - 14400000 - 86400000 * day).toISOString().split('T')[0];

      if (existsSync(`temp/${date}/${hash}.svg`)) {
        copyFile(`temp/${date}/${hash}.svg`, `temp/${today}/${hash}.svg`, () => {});
        return {
          taskId: data.taskId ?? 0,
          svg: readFileSync(`temp/${date}/${hash}.svg`).toString(),
        };
      }
    }

    // do work
    if (!existsSync(tempDir)) mkdirSync(tempDir);

    copyFileSync('preamble.fmt', tempDir + '/preamble.fmt');
    writeFileSync(tempDir + '/temp.tex', '%&preamble\n' + data.code + '\\end{document}');
    writeFileSync(tempDir + '/temp.aux', '');

    spawnSync('pdflatex', ['-no-shell-escape', '-interaction=batchmode', 'temp.tex'], {
      cwd: tempDir,
      timeout: 5000,
    });

    if (existsSync(tempDir + '/temp.pdf')) {
      spawnSync('pdf2svg', ['temp.pdf', 'temp.svg'], {
        cwd: tempDir,
        timeout: 3000,
      });
      svg = readFileSync(tempDir + '/temp.svg').toString();

      copyFileSync(`${tempDir}/temp.svg`, `temp/${today}/${hash}.svg`);
    }
  } catch {}

  rimraf(tempDir, () => {});

  return {
    taskId: data.taskId ?? 0,
    svg,
  };
}
