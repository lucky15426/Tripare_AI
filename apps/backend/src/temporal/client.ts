import { Client, Connection, WorkflowFailedError } from '@temporalio/client';
import { ApplicationFailure } from '@temporalio/common';
import type { Env } from '../config/env';
import type { HotelOfferWorkflowInput, HotelOfferWorkflowResult, SupplierKey, SupplierOutcome, WorkflowStep } from '../types';

export interface AllSuppliersFailedDetails {
  supplierStatus: Record<SupplierKey, SupplierOutcome>;
  supplierErrors: Partial<Record<SupplierKey, string>>;
  supplierAttempts: Partial<Record<SupplierKey, number>>;
  steps: WorkflowStep[];
  startedAt: string;
  durationMs: number;
}

export class AllSuppliersFailedError extends Error {
  constructor(
    public readonly workflowId: string,
    public readonly details: AllSuppliersFailedDetails,
  ) {
    super('All suppliers failed');
    this.name = 'AllSuppliersFailedError';
  }
}

/** Abstraction over "execute the hotel offer workflow" so the API can be tested without a Temporal server. */
export interface WorkflowRunner {
  run(workflowId: string, input: HotelOfferWorkflowInput): Promise<HotelOfferWorkflowResult>;
  ping(): Promise<boolean>;
}

export class TemporalRunner implements WorkflowRunner {
  private clientPromise: Promise<{ client: Client; connection: Connection }> | null = null;

  constructor(private readonly env: Env) {}

  private connect() {
    // Connect lazily and retry on the next call if Temporal was not reachable yet.
    this.clientPromise ??= Connection.connect({ address: this.env.TEMPORAL_ADDRESS, connectTimeout: 3000, tls: this.env.TEMPORAL_TLS || Boolean(this.env.TEMPORAL_API_KEY), apiKey: this.env.TEMPORAL_API_KEY })
      .then((connection) => ({ connection, client: new Client({ connection, namespace: this.env.TEMPORAL_NAMESPACE }) }))
      .catch((error: unknown) => {
        this.clientPromise = null;
        throw error;
      });
    return this.clientPromise;
  }

  async run(workflowId: string, input: HotelOfferWorkflowInput): Promise<HotelOfferWorkflowResult> {
    const { client } = await this.connect();
    try {
      return await client.workflow.execute('hotelOfferWorkflow', {
        taskQueue: this.env.TEMPORAL_TASK_QUEUE,
        workflowId,
        args: [input],
        workflowExecutionTimeout: this.env.WORKFLOW_TIMEOUT_MS,
      });
    } catch (error) {
      if (error instanceof WorkflowFailedError && error.cause instanceof ApplicationFailure && error.cause.type === 'ALL_SUPPLIERS_FAILED') {
        const details = error.cause.details?.[0] as AllSuppliersFailedDetails;
        throw new AllSuppliersFailedError(workflowId, details);
      }
      throw error;
    }
  }

  async ping(): Promise<boolean> {
    try {
      const { connection } = await this.connect();
      await Promise.race([
        connection.workflowService.getSystemInfo({}),
        new Promise((_, reject) => setTimeout(() => reject(new Error('temporal ping timeout')), 2000)),
      ]);
      return true;
    } catch {
      return false;
    }
  }
}
