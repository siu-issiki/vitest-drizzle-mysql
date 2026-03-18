/**
 * Configuration options for the Drizzle environment
 */
export interface DrizzleEnvironmentOptions<
  TDatabase = unknown,
  TTransaction = unknown,
> {
  /**
   * Function that provides the Drizzle instance
   * Called once per test suite and used for transaction management
   */
  client: () => TDatabase | Promise<TDatabase>;

  /**
   * Optional setup function executed before each test case
   */
  setup?: (tx: TTransaction) => void | Promise<void>;

  /**
   * Optional cleanup function executed after each test case
   * Called before rollback
   */
  teardown?: (tx: TTransaction) => void | Promise<void>;

  /**
   * Optional function to close the database connection
   * Called when the test suite ends
   */
  disconnect?: () => void | Promise<void>;
}

/**
 * Interface for a Drizzle client that supports transactions
 */
export interface TransactionCapableClient<TTransaction = unknown> {
  transaction<T>(
    callback: (tx: TTransaction) => Promise<T>,
    config?: unknown,
  ): Promise<T>;
}

/**
 * Type for the vDrizzle global variable
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface VitestDrizzleContext<TTransaction = any> {
  /**
   * Transaction available for use in the current test case
   * This transaction is automatically rolled back when the test ends
   */
  client: TTransaction;
}

/**
 * Error class used to trigger transaction rollback
 */
export class RollbackError extends Error {
  constructor() {
    super("Transaction rollback requested");
    this.name = "RollbackError";
  }
}
