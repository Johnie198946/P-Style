import { APP_CONFIG } from '../config/appConfig.js';

export class AsyncQueue {
  constructor(intervalMs = APP_CONFIG.queueIntervalMs) {
    this.intervalMs = intervalMs;
    this.lastRun = 0;
    this.current = Promise.resolve();
  }

  enqueue(task) {
    this.current = this.current.then(() => this.#execute(task));
    return this.current;
  }

  async #execute(task) {
    const now = Date.now();
    const elapsed = now - this.lastRun;
    if (elapsed < this.intervalMs) {
      await new Promise((resolve) => setTimeout(resolve, this.intervalMs - elapsed));
    }

    this.lastRun = Date.now();
    return task();
  }
}





