import { z } from "zod";
import { idParam } from "./common.validator.js";

export const movieIdParamsSchema = z.object({ id: idParam });

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "Search query 'q' is required"),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
