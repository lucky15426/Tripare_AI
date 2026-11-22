import fs from 'node:fs';
import path from 'node:path';
import { NativeConnection, Worker } from '@temporalio/worker';
import { createActivities, type ActivityDeps } from '../activities';
import type { Env } from '../config/env';
import { logger } from '../utils/logger';

/** Compiled .js in production, the .ts source under tsx/vitest. */
function workflowsEntry(): string {
  const base = path.join(__dirname, '../workflows/index');
  return fs.existsSync(`${base}.js`) ? `${base}.js` : `${base}.ts`;
}

/** Creates a worker that registers hotelOfferWorkflow and every activity. */
export async function createWorker(deps: ActivityDeps & { connection: NativeConnection }): Promise<Worker> {
  const { env, cache, connection } = deps;
  return Worker.create({
    connection,
    namespace: env.TEMPORAL_NAMESPACE,
    taskQueue: env.TEMPORAL_TASK_QUEUE,
    // Resolves to the .ts file under tsx and to the compiled .js in production.
    workflowsPath: workflowsEntry(),
    activities: createActivities({ env, cache }),
  });
}

export async function connectWithRetry(env: Env, attempts = 30, delayMs = 2000): Promise<NativeConnection> {
  const address = env.TEMPORAL_ADDRESS;
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await NativeConnection.connect({ address, tls: env.TEMPORAL_TLS || Boolean(env.TEMPORAL_API_KEY), apiKey: env.TEMPORAL_API_KEY });
    } catch (error) {
      if (attempt >= attempts) throw error;
      logger.warn({ attempt, address, err: (error as Error).message }, 'temporal not reachable yet, retrying');
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
