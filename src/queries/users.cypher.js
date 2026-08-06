/**
 * Cypher for the User entity and its social/interaction relationships.
 * Every statement is parameterized - no string concatenation.
 */

export const getAllUsersQuery = `
  MATCH (u:User)
  OPTIONAL MATCH (u)-[:FOLLOWS]->(f:User)
  OPTIONAL MATCH (u)-[:LIKES]->(m:Movie)
  RETURN u, count(DISTINCT f) AS followingCount, count(DISTINCT m) AS likedCount
  ORDER BY u.name ASC
`;

export const getUserByIdQuery = `
  MATCH (u:User {id: $id})
  RETURN u
`;

export const userExistsQuery = `
  MATCH (u:User {id: $id})
  RETURN u.id AS id
  LIMIT 1
`;

// NOTE: these writes intentionally chain "MATCH ... WITH ... MATCH ..." rather
// than two independent "MATCH (a {id:$x}) MATCH (b {id:$y})" clauses (or a
// comma-joined pattern). CognoDB's query planner has been observed to cache a
// bad plan for that shape - once poisoned, the second node's inline filter is
// silently ignored and the MERGE fans out to *every* node of that label
// (a cartesian product), corrupting data. Splitting the matches with WITH
// forces sequential, single-row evaluation and has proven reliable in testing.
// Self-follow prevention (userId !== targetId) is enforced in user.service.js
// before this query ever runs.
export const likeMovieQuery = `
  MATCH (u:User {id: $userId})
  WITH u
  MATCH (m:Movie {id: $movieId})
  MERGE (u)-[r:LIKES]->(m)
  ON CREATE SET r.createdAt = datetime()
  RETURN u, m, r
`;

export const watchMovieQuery = `
  MATCH (u:User {id: $userId})
  WITH u
  MATCH (m:Movie {id: $movieId})
  MERGE (u)-[r:WATCHED]->(m)
  ON CREATE SET r.createdAt = datetime()
  RETURN u, m, r
`;

export const followUserQuery = `
  MATCH (u:User {id: $userId})
  WITH u
  MATCH (target:User {id: $targetId})
  MERGE (u)-[r:FOLLOWS]->(target)
  ON CREATE SET r.createdAt = datetime()
  RETURN u, target, r
`;
