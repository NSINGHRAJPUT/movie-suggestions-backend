/**
 * Sends the standard success envelope used across every endpoint:
 * `{ success, message, data, meta? }`.
 */
export function sendSuccess(res, { statusCode = 200, message = "OK", data = null, meta } = {}) {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

export default sendSuccess;
