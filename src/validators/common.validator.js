import { z } from "zod";

export const idParam = z.string().trim().min(1, "id is required");

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const limitQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});
