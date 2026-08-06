/**
 * Cypher for graph-visualization endpoints consumed by the React Flow
 * explorer on the frontend.
 */

export const movieGraphQuery = `
  MATCH (m:Movie {id: $movieId})
  OPTIONAL MATCH (m)-[:DIRECTED_BY]->(d:Director)
  OPTIONAL MATCH (a:Actor)-[:ACTED_IN]->(m)
  OPTIONAL MATCH (m)-[:HAS_GENRE]->(g:Genre)
  OPTIONAL MATCH (m)<-[:ACTED_IN]-(:Actor)-[:ACTED_IN]->(related:Movie)
  WHERE related.id <> m.id
  WITH m, d, g,
       collect(DISTINCT a) AS actors,
       collect(DISTINCT related)[0..$relatedLimit] AS related
  RETURN m,
         collect(DISTINCT d) AS directors,
         actors,
         collect(DISTINCT g) AS genres,
         related
`;

export const userGraphQuery = `
  MATCH (u:User {id: $userId})
  OPTIONAL MATCH (u)-[:FOLLOWS]->(following:User)
  OPTIONAL MATCH (follower:User)-[:FOLLOWS]->(u)
  OPTIONAL MATCH (u)-[:LIKES]->(liked:Movie)
  OPTIONAL MATCH (u)-[:WATCHED]->(watched:Movie)
  RETURN u,
         collect(DISTINCT following) AS following,
         collect(DISTINCT follower) AS followers,
         collect(DISTINCT liked) AS liked,
         collect(DISTINCT watched) AS watched
`;

/**
 * Shortest path between two movies, traversing any relationship type in
 * either direction (through shared actors/directors/genres/users), bounded
 * to a maximum depth so the traversal never runs away on a dense graph.
 */
// Split into two MATCH clauses via WITH (see the note in users.cypher.js) to
// avoid CognoDB's cached-plan bug where a second same-label inline filter can
// get silently dropped.
export const shortestPathBetweenMoviesQuery = `
  MATCH (a:Movie {id: $sourceId})
  WITH a
  MATCH (b:Movie {id: $targetId})
  MATCH p = shortestPath((a)-[*..6]-(b))
  RETURN p
`;
