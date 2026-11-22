/**
 * Starts a local Temporal dev server on :7233 without Docker (uses the same binary as @temporalio/testing).
 * Handy for `npm run dev:temporal` when Docker is not available. Ctrl+C to stop.
 */
import { TestWorkflowEnvironment } from '@temporalio/testing';

async function main() {
  const env = await TestWorkflowEnvironment.createLocal({ server: { ip: '127.0.0.1', port: 7233 } });
  console.log('Temporal dev server listening on 127.0.0.1:7233');
  const stop = async () => {
    await env.teardown();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  await new Promise(() => undefined);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
