import { z } from "zod";
import { idParam } from "./common.validator.js";

export const movieIdParamsSchema = z.object({ id: idParam });

export const userIdParamsSchema = z.object({ id: idParam });

export const pathParamsSchema = z.object({ sourceId: idParam, targetId: idParam });
