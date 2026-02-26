/**
 * Async hooks system (actions + filters) — Contract v1.0
 * 
 * All hooks are async. Always await.
 * Naming: {scope}.{target}.{action} — always 3 segments.
 * Filters: undefined returns skipped, null is valid.
 */

class HookSystem {
  constructor() {
    this.handlers = new Map(); // { hookName: [{ fn, priority }] }
  }

  /**
   * Register a handler for a hook
   * @param {string} name - Hook name
   * @param {Function} fn - Handler (async OK)
   * @param {number} priority - Lower = earlier (default 10)
   */
  register(name, fn, priority = 10) {
    if (!this.handlers.has(name)) {
      this.handlers.set(name, []);
    }
    const list = this.handlers.get(name);
    list.push({ fn, priority });
    list.sort((a, b) => a.priority - b.priority);
  }

  /** Alias for register */
  on(name, fn, priority = 10) {
    return this.register(name, fn, priority);
  }

  /** Alias for register (backward compat with old addFilter) */
  addFilter(name, fn, priority = 10) {
    return this.register(name, fn, priority);
  }

  /**
   * Run a filter chain — passes value through each handler.
   * If handler returns undefined, value is unchanged. null is valid.
   * @param {string} name - Hook name
   * @param {any} value - Initial value
   * @param {...any} args - Extra context args
   * @returns {Promise<any>} Filtered value
   */
  async filter(name, value, ...args) {
    const list = this.handlers.get(name);
    if (!list || list.length === 0) return value;

    // Snapshot to prevent mutation during iteration
    const snapshot = [...list];
    let result = value;

    for (const { fn } of snapshot) {
      try {
        const ret = await fn(result, ...args);
        if (ret !== undefined) {
          result = ret;
        }
      } catch (err) {
        console.error(`[Hook Error] Filter '${name}':`, err.message);
      }
    }

    return result;
  }

  /**
   * Run an action — fire-and-forget, return values ignored.
   * @param {string} name - Hook name
   * @param {...any} args - Arguments
   */
  async action(name, ...args) {
    const list = this.handlers.get(name);
    if (!list || list.length === 0) return;

    const snapshot = [...list];
    for (const { fn } of snapshot) {
      try {
        await fn(...args);
      } catch (err) {
        console.error(`[Hook Error] Action '${name}':`, err.message);
      }
    }
  }

  /**
   * List all registered hooks (for debugging)
   */
  list() {
    return {
      hooks: Array.from(this.handlers.keys())
    };
  }
}

module.exports = new HookSystem();
