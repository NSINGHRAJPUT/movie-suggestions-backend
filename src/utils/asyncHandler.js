/**
 * Wraps an async Express handler so rejected promises are forwarded to
 * `next(err)` instead of crashing the process. Keeps controllers thin and
 * free of repetitive try/catch blocks.
 */
export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export default asyncHandler;
