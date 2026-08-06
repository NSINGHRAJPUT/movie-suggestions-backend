import { z } from "zod";
import { idParam } from "./common.validator.js";

export const userIdParamsSchema = z.object({ id: idParam });

export const likeParamsSchema = z.object({ id: idParam, movieId: idParam });

export const watchParamsSchema = z.object({ id: idParam, movieId: idParam });

export const followParamsSchema = z.object({ id: idParam, targetId: idParam });
