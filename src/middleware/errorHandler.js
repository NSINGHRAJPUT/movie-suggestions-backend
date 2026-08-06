import neo4j from "neo4j-driver";
import ApiError from "../utils/ApiError.js";

/**
 * Central error handler. Every thrown/forwarded error ends up here and is
 * translated into the structured `{ success, message }` response shape
 * required by the spec.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // neo4j-driver throws typed errors when the database can't be reached.
  const isDbUnavailable =
    err?.code === neo4j.error.SERVICE_UNAVAILABLE ||
    err?.code === neo4j.error.SESSION_EXPIRED ||
    (err?.name === "Neo4jError" && err?.code?.includes("TransientError"));

  if (isDbUnavailable) {
    console.error("[db] CognoDB is unreachable:", err.message);
    return res.status(503).json({
      success: false,
      message: "The database is currently unavailable. Please try again shortly.",
    });
  }

  if (err?.name === "Neo4jError") {
    console.error("[db] Query error:", err.message);
    return res.status(400).json({
      success: false,
      message: "Malformed request could not be processed by the database.",
    });
  }

  console.error("[error]", err);
  return res.status(500).json({
    success: false,
    message: "Something went wrong on the server.",
  });
};

export default errorHandler;
