import neo4j from "neo4j-driver";
import { executeQuery } from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import { toPlain, toPlainList } from "../utils/serializers.js";
import {
  countMoviesQuery,
  getGenresWithCountsQuery,
  getMovieByIdQuery,
  getMoviesPaginatedQuery,
  getRelatedMoviesByActorsQuery,
  getTrendingMoviesQuery,
  movieExistsQuery,
  searchMoviesQuery,
} from "../queries/movies.cypher.js";

export async function ensureMovieExists(movieId) {
  const records = await executeQuery(movieExistsQuery, { id: movieId });
  if (records.length === 0) {
    throw ApiError.notFound(`Movie with id "${movieId}" was not found.`);
  }
}

export async function listMovies({ page, limit }) {
  const skip = (page - 1) * limit;

  const [countRecords, movieRecords] = await Promise.all([
    executeQuery(countMoviesQuery),
    executeQuery(getMoviesPaginatedQuery, {
      skip: neo4j.int(skip),
      limit: neo4j.int(limit),
    }),
  ]);

  const total = countRecords[0]?.get("total") ?? 0;
  const movies = movieRecords.map((record) => ({
    ...toPlain(record.get("m")),
    genres: record.get("genres"),
  }));

  return {
    movies,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getMovieById(movieId) {
  const records = await executeQuery(getMovieByIdQuery, { id: movieId });

  if (records.length === 0) {
    throw ApiError.notFound(`Movie with id "${movieId}" was not found.`);
  }

  const record = records[0];
  const relatedRecords = await executeQuery(getRelatedMoviesByActorsQuery, {
    movieId,
    limit: neo4j.int(8),
  });

  return {
    ...toPlain(record.get("m")),
    genres: toPlainList(record.get("genres")),
    director: toPlainList(record.get("directors"))[0] ?? null,
    actors: toPlainList(record.get("actors")),
    language: toPlainList(record.get("languages"))[0] ?? null,
    country: toPlainList(record.get("countries"))[0] ?? null,
    relatedMovies: relatedRecords.map((r) => ({
      ...toPlain(r.get("related")),
      sharedActors: r.get("sharedActors"),
    })),
  };
}

export async function searchMovies(query, limit = 20) {
  const records = await executeQuery(searchMoviesQuery, {
    q: query,
    limit: neo4j.int(limit),
  });
  return records.map((record) => toPlain(record.get("m")));
}

export async function getTrendingMovies(limit = 10) {
  const records = await executeQuery(getTrendingMoviesQuery, { limit: neo4j.int(limit) });
  return records.map((record) => ({
    ...toPlain(record.get("m")),
    likeCount: record.get("likeCount"),
    watchCount: record.get("watchCount"),
  }));
}

export async function getGenres() {
  const records = await executeQuery(getGenresWithCountsQuery);
  return records.map((record) => ({
    ...toPlain(record.get("g")),
    movieCount: record.get("movieCount"),
  }));
}
