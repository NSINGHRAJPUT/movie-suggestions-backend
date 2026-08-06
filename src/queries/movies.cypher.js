/**
 * Cypher for the Movie entity. Every statement is parameterized -
 * no string concatenation is used anywhere in this file.
 */

export const countMoviesQuery = `
  MATCH (m:Movie)
  RETURN count(m) AS total
`;

export const getMoviesPaginatedQuery = `
  MATCH (m:Movie)
  OPTIONAL MATCH (m)-[:HAS_GENRE]->(g:Genre)
  WITH m, collect(DISTINCT g.name) AS genres
  RETURN m, genres
  ORDER BY m.title ASC
  SKIP $skip
  LIMIT $limit
`;

export const getMovieByIdQuery = `
  MATCH (m:Movie {id: $id})
  OPTIONAL MATCH (m)-[:HAS_GENRE]->(g:Genre)
  OPTIONAL MATCH (m)-[:DIRECTED_BY]->(d:Director)
  OPTIONAL MATCH (a:Actor)-[:ACTED_IN]->(m)
  OPTIONAL MATCH (m)-[:HAS_LANGUAGE]->(l:Language)
  OPTIONAL MATCH (m)-[:HAS_COUNTRY]->(c:Country)
  RETURN m,
         collect(DISTINCT g) AS genres,
         collect(DISTINCT d) AS directors,
         collect(DISTINCT a) AS actors,
         collect(DISTINCT l) AS languages,
         collect(DISTINCT c) AS countries
`;

export const getMovieTitleQuery = `
  MATCH (m:Movie {id: $id})
  RETURN m.title AS title
`;

export const movieExistsQuery = `
  MATCH (m:Movie {id: $id})
  RETURN m.id AS id
  LIMIT 1
`;

export const searchMoviesQuery = `
  MATCH (m:Movie)
  WHERE toLower(m.title) CONTAINS toLower($q)
  RETURN m
  ORDER BY m.title ASC
  LIMIT $limit
`;

/**
 * "Movies connected through actors" - required query.
 * MATCH (m {id:$movieId})<-[]-(a)-[]->(related) WHERE related.id <> m.id
 */
export const getRelatedMoviesByActorsQuery = `
  MATCH (m:Movie {id: $movieId})<-[:ACTED_IN]-(a:Actor)-[:ACTED_IN]->(related:Movie)
  WHERE related.id <> m.id
  RETURN DISTINCT related, collect(DISTINCT a.name) AS sharedActors
  LIMIT $limit
`;

export const getTrendingMoviesQuery = `
  MATCH (m:Movie)
  OPTIONAL MATCH (m)<-[:LIKES]-(liker:User)
  OPTIONAL MATCH (m)<-[:WATCHED]-(watcher:User)
  WITH m, count(DISTINCT liker) AS likeCount, count(DISTINCT watcher) AS watchCount
  RETURN m, likeCount, watchCount
  ORDER BY (likeCount * 2 + watchCount) DESC, m.rating DESC
  LIMIT $limit
`;

export const getGenresWithCountsQuery = `
  MATCH (g:Genre)
  OPTIONAL MATCH (g)<-[:HAS_GENRE]-(m:Movie)
  RETURN g, count(DISTINCT m) AS movieCount
  ORDER BY movieCount DESC
`;
