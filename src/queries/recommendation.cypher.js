/**
 * Multi-signal recommendation Cypher. Each signal is a standalone,
 * parameterized query so it can be explained/reasoned about independently,
 * then combined + ranked in the service layer.
 *
 * NOTE ON STYLE: these queries deliberately avoid "pattern predicate"
 * exclusions such as `WHERE NOT (u)-[:LIKES]->(m)` that reuse an
 * already-bound node variable. CognoDB's Cypher engine does not evaluate
 * that form correctly (it does not scope the reused variable to the
 * existing binding), silently excluding every row. Instead we first
 * collect the user's seen movie ids into a list and exclude candidates
 * with a plain `NOT m.id IN seenIds` scalar check, which is unambiguous
 * on every Cypher-compatible engine.
 */

const SEEN_MOVIES_PRELUDE = `
  MATCH (u:User {id: $userId})
  OPTIONAL MATCH (u)-[:LIKES]->(seenL:Movie)
  OPTIONAL MATCH (u)-[:WATCHED]->(seenW:Movie)
  WITH u,
       collect(DISTINCT seenL.id) + collect(DISTINCT seenW.id) AS seenIds,
       collect(DISTINCT seenL) + collect(DISTINCT seenW) AS seenMovies
`;

/**
 * Signal 1 - "Movies liked by followed users".
 * MATCH (u {id:$userId})-[]->(f)-[]->(m) WHERE NOT (u)-[]->(m) RETURN DISTINCT m
 */
export const moviesLikedByFollowedUsersQuery = `
  ${SEEN_MOVIES_PRELUDE}
  MATCH (u)-[:FOLLOWS]->(f:User)-[:LIKES]->(m:Movie)
  WHERE NOT m.id IN seenIds
  RETURN DISTINCT m AS movie, collect(DISTINCT f.name) AS reasonNames
  LIMIT $limit
`;

/**
 * Signal 2 - "Movies by directors the user likes".
 * MATCH (u {id:$userId})-[]->(m1)-[]->(d) MATCH (m2)-[]->(d)
 * WHERE NOT (u)-[]->(m2) RETURN DISTINCT m2
 */
export const moviesByLikedDirectorsQuery = `
  ${SEEN_MOVIES_PRELUDE}
  UNWIND seenMovies AS seenMovie
  MATCH (seenMovie)-[:DIRECTED_BY]->(d:Director)
  MATCH (m2:Movie)-[:DIRECTED_BY]->(d)
  WHERE NOT m2.id IN seenIds
  RETURN DISTINCT m2 AS movie, collect(DISTINCT d.name) AS reasonNames
  LIMIT $limit
`;

/**
 * Signal 3 - movies connected through shared actors with something the user
 * already likes/watched.
 */
export const moviesBySharedActorsQuery = `
  ${SEEN_MOVIES_PRELUDE}
  UNWIND seenMovies AS seenMovie
  MATCH (seenMovie)<-[:ACTED_IN]-(a:Actor)-[:ACTED_IN]->(m2:Movie)
  WHERE NOT m2.id IN seenIds
  RETURN DISTINCT m2 AS movie, collect(DISTINCT a.name) AS reasonNames
  LIMIT $limit
`;

/**
 * Signal 4 - "Genre-based recommendations".
 * MATCH (u {id:$userId})-[]->()-[]->(g) MATCH (m)-[]->(g)
 * WHERE NOT (u)-[]->(m) RETURN DISTINCT m
 */
export const moviesBySharedGenresQuery = `
  ${SEEN_MOVIES_PRELUDE}
  UNWIND seenMovies AS seenMovie
  MATCH (seenMovie)-[:HAS_GENRE]->(g:Genre)
  MATCH (m:Movie)-[:HAS_GENRE]->(g)
  WHERE NOT m.id IN seenIds
  RETURN DISTINCT m AS movie, collect(DISTINCT g.name) AS reasonNames
  LIMIT $limit
`;

/**
 * Explanation path queries - each returns the concrete traversal that
 * justifies recommending `movieId` to `userId` for a given signal.
 */
export const explainViaSocialQuery = `
  MATCH (u:User {id: $userId})-[:FOLLOWS]->(f:User)-[:LIKES]->(m:Movie {id: $movieId})
  RETURN f.name AS friendName, m.title AS movieTitle
  LIMIT 1
`;

export const explainViaDirectorQuery = `
  MATCH (u:User {id: $userId})-[:LIKES|WATCHED]->(liked:Movie)-[:DIRECTED_BY]->(d:Director)<-[:DIRECTED_BY]-(m:Movie {id: $movieId})
  RETURN liked.title AS likedTitle, d.name AS directorName
  LIMIT 1
`;

export const explainViaActorQuery = `
  MATCH (u:User {id: $userId})-[:LIKES|WATCHED]->(liked:Movie)<-[:ACTED_IN]-(actor:Actor)-[:ACTED_IN]->(m:Movie {id: $movieId})
  RETURN liked.title AS likedTitle, actor.name AS actorName
  LIMIT 1
`;

export const explainViaGenreQuery = `
  MATCH (u:User {id: $userId})-[:LIKES|WATCHED]->(liked:Movie)-[:HAS_GENRE]->(g:Genre)<-[:HAS_GENRE]-(m:Movie {id: $movieId})
  RETURN liked.title AS likedTitle, g.name AS genreName
  LIMIT 1
`;
