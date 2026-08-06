import neo4j from "neo4j-driver";
import { executeQuery } from "../config/db.js";
import { toPlain } from "../utils/serializers.js";
import { ensureUserExists } from "./user.service.js";
import { ensureMovieExists } from "./movie.service.js";
import { getMovieTitleQuery } from "../queries/movies.cypher.js";
import {
  explainViaActorQuery,
  explainViaDirectorQuery,
  explainViaGenreQuery,
  explainViaSocialQuery,
  moviesByLikedDirectorsQuery,
  moviesBySharedActorsQuery,
  moviesBySharedGenresQuery,
  moviesLikedByFollowedUsersQuery,
} from "../queries/recommendation.cypher.js";

// Relative importance of each graph signal when combining recommendations.
const SIGNAL_WEIGHTS = {
  social: 3,
  director: 2,
  actor: 2,
  genre: 1,
};

function mostFrequent(listOfLists) {
  const counts = new Map();
  for (const names of listOfLists) {
    for (const name of names ?? []) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  let best = null;
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

function mapSignalRecords(records) {
  return records.map((record) => ({
    ...toPlain(record.get("movie")),
    reasonNames: record.get("reasonNames"),
  }));
}

/**
 * Runs all four graph signals in parallel, merges them per-movie with a
 * weighted score, and also returns each signal as its own labeled section
 * for the "Because ..." UI on the frontend.
 */
export async function getRecommendations(userId, limit = 20) {
  await ensureUserExists(userId);

  const perSignalLimit = neo4j.int(Math.max(limit * 3, 30));
  const params = { userId, limit: perSignalLimit };

  const [socialRecords, directorRecords, actorRecords, genreRecords] = await Promise.all([
    executeQuery(moviesLikedByFollowedUsersQuery, params),
    executeQuery(moviesByLikedDirectorsQuery, params),
    executeQuery(moviesBySharedActorsQuery, params),
    executeQuery(moviesBySharedGenresQuery, params),
  ]);

  const social = mapSignalRecords(socialRecords);
  const director = mapSignalRecords(directorRecords);
  const actor = mapSignalRecords(actorRecords);
  const genre = mapSignalRecords(genreRecords);

  const scored = new Map();
  const applySignal = (movies, signalKey) => {
    for (const movie of movies) {
      if (!scored.has(movie.id)) {
        scored.set(movie.id, {
          ...movie,
          score: 0,
          reasons: { social: [], director: [], actor: [], genre: [] },
        });
      }
      const entry = scored.get(movie.id);
      entry.score += SIGNAL_WEIGHTS[signalKey];
      entry.reasons[signalKey] = movie.reasonNames;
      delete entry.reasonNames;
    }
  };

  applySignal(social, "social");
  applySignal(director, "director");
  applySignal(actor, "actor");
  applySignal(genre, "genre");

  const combined = [...scored.values()].sort((a, b) => b.score - a.score).slice(0, limit);

  const topDirector = mostFrequent(director.map((m) => m.reasonNames));
  const topGenre = mostFrequent(genre.map((m) => m.reasonNames));

  return {
    combined,
    sections: [
      {
        key: "social",
        title: "Because people you follow liked these",
        movies: social.slice(0, limit).map(({ reasonNames, ...movie }) => ({
          ...movie,
          via: reasonNames,
        })),
      },
      {
        key: "director",
        title: topDirector ? `Because you like ${topDirector}` : "Because you like the same directors",
        movies: director.slice(0, limit).map(({ reasonNames, ...movie }) => ({
          ...movie,
          via: reasonNames,
        })),
      },
      {
        key: "actor",
        title: "Because of shared actors",
        movies: actor.slice(0, limit).map(({ reasonNames, ...movie }) => ({
          ...movie,
          via: reasonNames,
        })),
      },
      {
        key: "genre",
        title: topGenre ? `Because of ${topGenre}` : "Because of genres you enjoy",
        movies: genre.slice(0, limit).map(({ reasonNames, ...movie }) => ({
          ...movie,
          via: reasonNames,
        })),
      },
    ],
  };
}

/**
 * Returns a human-readable explanation (plus the raw signal data) for why a
 * specific movie was recommended to a specific user.
 */
export async function explainRecommendation(userId, movieId) {
  await Promise.all([ensureUserExists(userId), ensureMovieExists(movieId)]);

  const [socialRecords, directorRecords, actorRecords, genreRecords, titleRecords] = await Promise.all([
    executeQuery(explainViaSocialQuery, { userId, movieId }),
    executeQuery(explainViaDirectorQuery, { userId, movieId }),
    executeQuery(explainViaActorQuery, { userId, movieId }),
    executeQuery(explainViaGenreQuery, { userId, movieId }),
    executeQuery(getMovieTitleQuery, { id: movieId }),
  ]);

  const movieTitle = titleRecords[0]?.get("title") ?? "this movie";
  const reasons = [];
  const signals = {};

  if (socialRecords.length > 0) {
    const friendName = socialRecords[0].get("friendName");
    reasons.push(`${friendName}, who you follow, also liked ${movieTitle}.`);
    signals.social = { friendName };
  }

  if (directorRecords.length > 0) {
    const likedTitle = directorRecords[0].get("likedTitle");
    const directorName = directorRecords[0].get("directorName");
    reasons.push(`You liked ${likedTitle}. Both movies are directed by ${directorName}.`);
    signals.director = { likedTitle, directorName };
  }

  if (actorRecords.length > 0) {
    const likedTitle = actorRecords[0].get("likedTitle");
    const actorName = actorRecords[0].get("actorName");
    reasons.push(`You liked ${likedTitle}, which shares actor ${actorName} with ${movieTitle}.`);
    signals.actor = { likedTitle, actorName };
  }

  if (genreRecords.length > 0) {
    const likedTitle = genreRecords[0].get("likedTitle");
    const genreName = genreRecords[0].get("genreName");
    reasons.push(`You liked ${likedTitle}, which shares the ${genreName} genre with ${movieTitle}.`);
    signals.genre = { likedTitle, genreName };
  }

  if (reasons.length === 0) {
    reasons.push(
      `We couldn't find a direct connection yet, but ${movieTitle} is trending among viewers with similar taste.`,
    );
  }

  return { userId, movieId, movieTitle, reasons, signals };
}
