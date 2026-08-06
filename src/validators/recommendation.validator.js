import { z } from "zod";
import { idParam } from "./common.validator.js";

export const userIdParamsSchema = z.object({ userId: idParam });

export const explainParamsSchema = z.object({ userId: idParam, movieId: idParam });

export const recommendationQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional().default(20),
});
