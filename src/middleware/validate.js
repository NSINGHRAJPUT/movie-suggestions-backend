import { ZodError } from "zod";
import ApiError from "../utils/ApiError.js";

/**
 * Generic Zod validation middleware factory.
 *
 * @param {import("zod").ZodSchema} schema - Schema to validate against.
 * @param {"body"|"params"|"query"} [source="body"] - Which part of the request to validate.
 */
export const validate = (schema, source = "body") => (req, res, next) => {
  try {
    const parsed = schema.parse(req[source]);
    if (source === "query") {
      // Express 5 exposes `req.query` as a read-only getter that
      // re-parses the raw query string on every access, so coerced/defaulted
      // values can't be written back onto it. Expose them separately instead.
      req.validatedQuery = parsed;
    } else {
      req[source] = parsed;
    }
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      next(ApiError.badRequest("Validation failed", details));
      return;
    }
    next(error);
  }
};

export default validate;
