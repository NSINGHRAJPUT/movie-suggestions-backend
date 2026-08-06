import { Router } from "express";
import {
  getGenres,
  getMovieById,
  getMovies,
  getTrendingMovies,
  searchMovies,
} from "../controllers/movies.controller.js";
import { validate } from "../middleware/validate.js";
import { limitQuerySchema, paginationQuerySchema } from "../validators/common.validator.js";
import { movieIdParamsSchema, searchQuerySchema } from "../validators/movie.validator.js";

const router = Router();

// Specific routes must be declared before the "/:id" catch-all.
router.get("/search", validate(searchQuerySchema, "query"), searchMovies);
router.get("/trending", validate(limitQuerySchema, "query"), getTrendingMovies);
router.get("/genres", getGenres);
router.get("/", validate(paginationQuerySchema, "query"), getMovies);
router.get("/:id", validate(movieIdParamsSchema, "params"), getMovieById);

export default router;
