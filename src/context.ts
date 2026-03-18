import {
  DrizzleEnvironmentOptions,
  RollbackError,
  TransactionCapableClient,
} from "./types.js";

interface EnvironmentState<TTransaction> {
  db: TransactionCapableClient<TTransaction> | null;
  currentTransaction: TTransaction | null;
  transactionPromise: Promise<unknown> | null;
  resolveTransaction: (() => void) | null;
  rollbackError: RollbackError | null;
}

export class DrizzleEnvironmentContext<
  TDatabase extends TransactionCapableClient<TTransaction>,
  TTransaction,
> {
  private options: DrizzleEnvironmentOptions<TDatabase, TTransaction>;
  private state: EnvironmentState<TTransaction>;

  constructor(options: DrizzleEnvironmentOptions<TDatabase, TTransaction>) {
    this.options = options;
    this.state = {
      db: null,
      currentTransaction: null,
      transactionPromise: null,
      resolveTransaction: null,
      rollbackError: null,
    };
  }

  /**
   * Initialize the environment
   */
  async setup(): Promise<void> {
    this.state.db = await this.options.client();
  }

  /**
   * Clean up the environment
   */
  async teardown(): Promise<void> {
    if (this.options.disconnect) {
      await this.options.disconnect();
    }
    this.state.db = null;
  }

  /**
   * Start a transaction for each test case
   *
   * Promise pending pattern similar to jest-prisma:
   * 1. Call db.transaction()
   * 2. Return a new Promise within the callback
   * 3. Hold the reject of that Promise
   * 4. Call reject() in endTransaction() to rollback
   */
  async beginTransaction(): Promise<TTransaction> {
    if (!this.state.db) {
      throw new Error(
        "Database client is not initialized. Call setup() first.",
      );
    }

    return new Promise<TTransaction>((resolveOuter) => {
      this.state.transactionPromise = this.state
        .db!.transaction(async (tx) => {
          this.state.currentTransaction = tx;

          if (this.options.setup) {
            await this.options.setup(tx);
          }

          resolveOuter(tx);

          return new Promise<never>((_, reject) => {
            this.state.resolveTransaction = () =>
              reject(new RollbackError());
          });
        })
        .catch(() => {
          // Swallow the RollbackError to prevent unhandled rejection
        });
    });
  }

  /**
   * Rollback the transaction
   */
  async rollbackTransaction(): Promise<void> {
    if (this.options.teardown && this.state.currentTransaction) {
      try {
        await this.options.teardown(this.state.currentTransaction);
      } catch (error) {
        console.error("Error in teardown function:", error);
      }
    }

    if (this.state.resolveTransaction) {
      this.state.resolveTransaction();
      this.state.resolveTransaction = null;
    }

    if (this.state.transactionPromise) {
      try {
        await this.state.transactionPromise;
      } catch {
        // Expected: RollbackError
      }
      this.state.transactionPromise = null;
    }

    this.state.currentTransaction = null;
  }

  /**
   * Get the current transaction
   */
  getCurrentTransaction(): TTransaction | null {
    return this.state.currentTransaction;
  }

  /**
   * Get the database client
   */
  getDatabase(): TransactionCapableClient<TTransaction> | null {
    return this.state.db;
  }
}
