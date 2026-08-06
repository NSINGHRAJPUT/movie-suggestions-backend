import { Router } from "express";
import { getMovieGraph, getShortestPath, getUserGraph } from "../controllers/graph.controller.js";
import { validate } from "../middleware/validate.js";
import {
  movieIdParamsSchema,
  pathParamsSchema,
  userIdParamsSchema,
} from "../validators/graph.validator.js";

const router = Router();

router.get("/movie/:id", validate(movieIdParamsSchema, "params"), getMovieGraph);
router.get("/user/:id", validate(userIdParamsSchema, "params"), getUserGraph);
router.get("/path/:sourceId/:targetId", validate(pathParamsSchema, "params"), getShortestPath);

export default router;
