import { executeQuery } from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import { toPlain } from "../utils/serializers.js";
import { ensureMovieExists } from "./movie.service.js";
import {
  followUserQuery,
  getAllUsersQuery,
  getUserByIdQuery,
  likeMovieQuery,
  userExistsQuery,
  watchMovieQuery,
} from "../queries/users.cypher.js";

export async function ensureUserExists(userId) {
  const records = await executeQuery(userExistsQuery, { id: userId });
  if (records.length === 0) {
    throw ApiError.notFound(`User with id "${userId}" was not found.`);
  }
}

export async function listUsers() {
  const records = await executeQuery(getAllUsersQuery);
  return records.map((record) => ({
    ...toPlain(record.get("u")),
    followingCount: record.get("followingCount"),
    likedCount: record.get("likedCount"),
  }));
}

export async function getUserById(userId) {
  const records = await executeQuery(getUserByIdQuery, { id: userId });
  if (records.length === 0) {
    throw ApiError.notFound(`User with id "${userId}" was not found.`);
  }
  return toPlain(records[0].get("u"));
}

export async function likeMovie(userId, movieId) {
  await Promise.all([ensureUserExists(userId), ensureMovieExists(movieId)]);
  const records = await executeQuery(likeMovieQuery, { userId, movieId }, { write: true });
  const record = records[0];
  return { user: toPlain(record.get("u")), movie: toPlain(record.get("m")) };
}

export async function watchMovie(userId, movieId) {
  await Promise.all([ensureUserExists(userId), ensureMovieExists(movieId)]);
  const records = await executeQuery(watchMovieQuery, { userId, movieId }, { write: true });
  const record = records[0];
  return { user: toPlain(record.get("u")), movie: toPlain(record.get("m")) };
}

export async function followUser(userId, targetId) {
  if (userId === targetId) {
    throw ApiError.badRequest("A user cannot follow themselves.");
  }
  await Promise.all([ensureUserExists(userId), ensureUserExists(targetId)]);
  const records = await executeQuery(followUserQuery, { userId, targetId }, { write: true });

  if (records.length === 0) {
    throw ApiError.badRequest("Unable to create follow relationship.");
  }

  const record = records[0];
  return { user: toPlain(record.get("u")), target: toPlain(record.get("target")) };
}
