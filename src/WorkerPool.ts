import { Worker } from 'worker_threads';
import rimraf from 'rimraf';

let taskId = 0;
let resolvers: { [id: number]: (value: WorkerResult) => void } = { 0: () => {} };

export interface WorkerData {
  code: string;
  taskId?: number;
  expiresAt?: number;
}

export interface WorkerResult {
  taskId?: number;
  svg: string;
}

export class WorkerPool {
  workers: {
    id: number;
    worker: Worker;
    queue: WorkerData[];
  }[];

  onMessage(workerId: number, value: WorkerResult) {
    if (!value.taskId) return;

    let id = value.taskId;
    delete value.taskId;
    resolvers[id](value);
    delete resolvers[id];

    if (this.workers[workerId].queue.length > 0) {
      this.setWorkerTimeout(workerId);
    }
  }

  constructor(number: number) {
    this.workers = [];
    for (let i = 0; i < number; i++) {
      let worker = new Worker(__dirname + '/worker.js');
      let workerItem = { id: i, worker, queue: [] };
      this.workers.push(workerItem);

      worker.on('message', (value) => this.onMessage(workerItem.id, value));
    }
  }

  work(data: WorkerData): Promise<WorkerResult> {
    data.expiresAt ??= new Date().getTime() + 10000;
    data.taskId = ++taskId;

    // Assign the task to the worker with minimum queue length
    let minLength = Infinity;
    let workerId = -1;
    for (let i = 0; i < this.workers.length; i++) {
      let queueLength = this.workers[i].queue.length;
      if (queueLength < minLength) {
        minLength = queueLength;
        workerId = i;
      }
      if (minLength === 0) break;
    }

    let worker = this.workers[workerId];
    worker.queue.push(data);
    if (worker.queue.length === 1) this.setWorkerTimeout(workerId);
    worker.worker.postMessage(data);

    return new Promise((resolve) => {
      resolvers[taskId] = (value) => {
        worker.queue.splice(0, 1);
        resolve(value);
      };
    });
  }

  setWorkerTimeout(workerId: number) {
    let worker = this.workers[workerId];
    let id = worker.queue[0]?.taskId ?? 0;
    setTimeout(() => {
      if (worker.queue[0]?.taskId === id) {
        worker.worker.terminate();
        resolvers[id]({ svg: '', taskId: id });
        delete resolvers[id];

        worker.worker = new Worker(__dirname + '/worker.js');
        worker.worker.on('message', (value) => this.onMessage(worker.id, value));
        if (worker.queue.length > 0) this.setWorkerTimeout(workerId);
        for (let data of worker.queue) worker.worker.postMessage(data);
        console.log(`[${getTimestamp()}] #${id} Timeout.`);

        rimraf('temp/t' + id, () => {});
      }
    }, 10000);

    function getTimestamp() {
      return new Date().toISOString().replace('T', ' ').substring(0, 19);
    }
  }
}
