import { builtinEnvironments, type Environment } from "vitest/environments";

/**
 * Vitest custom environment
 * Essentially the same as node environment, but sets up drizzle
 *
 * Note: Transaction management is done via setup files
 * This environment operates as a node-based environment
 */
const DrizzleEnvironment: Environment = {
  name: "drizzle",
  transformMode: "ssr",
  async setup(global, options) {
    const nodeEnv = builtinEnvironments.node;
    const result = await nodeEnv.setup(global, options);
    return {
      teardown: result.teardown,
    };
  },
};

export default DrizzleEnvironment;
