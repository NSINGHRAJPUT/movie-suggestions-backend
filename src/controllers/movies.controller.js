import asyncHandler from "../utils/asyncHandler.js";
import sendSuccess from "../utils/response.js";
import * as movieService from "../services/movie.service.js";

export const getMovies = asyncHandler(async (req, res) => {
  const { page, limit } = req.validatedQuery;
  const { movies, pagination } = await movieService.listMovies({ page, limit });
  sendSuccess(res, { message: "Movies fetched successfully", data: movies, meta: pagination });
});

export const getMovieById = asyncHandler(async (req, res) => {
  const movie = await movieService.getMovieById(req.params.id);
  sendSuccess(res, { message: "Movie fetched successfully", data: movie });
});

export const searchMovies = asyncHandler(async (req, res) => {
  const { q, limit } = req.validatedQuery;
  const movies = await movieService.searchMovies(q, limit);
  sendSuccess(res, {
    message: movies.length ? "Search results fetched successfully" : "No movies matched your search",
    data: movies,
  });
});

export const getTrendingMovies = asyncHandler(async (req, res) => {
  const { limit } = req.validatedQuery;
  const movies = await movieService.getTrendingMovies(limit);
  sendSuccess(res, { message: "Trending movies fetched successfully", data: movies });
});

export const getGenres = asyncHandler(async (req, res) => {
  const genres = await movieService.getGenres();
  sendSuccess(res, { message: "Genres fetched successfully", data: genres });
});
