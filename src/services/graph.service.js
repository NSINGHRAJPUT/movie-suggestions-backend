import neo4j from "neo4j-driver";
import { executeQuery } from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import { toPlain, toPlainList, pathToPlain } from "../utils/serializers.js";
import { ensureMovieExists } from "./movie.service.js";
import { ensureUserExists } from "./user.service.js";
import {
  movieGraphQuery,
  shortestPathBetweenMoviesQuery,
  userGraphQuery,
} from "../queries/graph.cypher.js";

const RELATED_MOVIES_LIMIT = 6;
const PATH_MAX_DEPTH = 6;

function makeNode(entityType, entity) {
  const label = entity.title ?? entity.name ?? entity.id;
  return {
    id: `${entityType}:${entity.id}`,
    type: "entity",
    data: { entityType, label, ...entity },
    position: { x: 0, y: 0 },
  };
}

function makeEdge(sourceId, targetId, label) {
  return {
    id: `${sourceId}->${targetId}:${label}`,
    source: sourceId,
    target: targetId,
    label,
  };
}

/**
 * Places a ring of nodes evenly spaced around the origin at a fixed radius.
 * Cheap, dependency-free alternative to a full force/dagre layout - good
 * enough since React Flow only needs an initial position to render from.
 */
function layoutRing(nodes, radius, angleOffset = 0) {
  const count = nodes.length;
  return nodes.map((node, index) => {
    const angle = angleOffset + (2 * Math.PI * index) / Math.max(count, 1);
    return {
      ...node,
      position: {
        x: Math.round(radius * Math.cos(angle)),
        y: Math.round(radius * Math.sin(angle)),
      },
    };
  });
}

export async function buildMovieGraph(movieId) {
  await ensureMovieExists(movieId);

  const records = await executeQuery(movieGraphQuery, {
    movieId,
    relatedLimit: neo4j.int(RELATED_MOVIES_LIMIT),
  });
  const record = records[0];

  const movie = toPlain(record.get("m"));
  const directors = toPlainList(record.get("directors"));
  const actors = toPlainList(record.get("actors"));
  const genres = toPlainList(record.get("genres"));
  const related = toPlainList(record.get("related"));

  const centerNode = { ...makeNode("movie", movie), position: { x: 0, y: 0 } };

  const directorNodes = layoutRing(
    directors.map((d) => makeNode("director", d)),
    220,
  );
  const genreNodes = layoutRing(
    genres.map((g) => makeNode("genre", g)),
    340,
    Math.PI / 6,
  );
  const actorNodes = layoutRing(
    actors.map((a) => makeNode("actor", a)),
    460,
  );
  const relatedNodes = layoutRing(
    related.map((r) => makeNode("movie", r)),
    620,
    Math.PI / 4,
  );

  const edges = [
    ...directors.map((d) => makeEdge(centerNode.id, `director:${d.id}`, "DIRECTED_BY")),
    ...genres.map((g) => makeEdge(centerNode.id, `genre:${g.id}`, "HAS_GENRE")),
    ...actors.map((a) => makeEdge(`actor:${a.id}`, centerNode.id, "ACTED_IN")),
    ...related.map((r) =>
      makeEdge(
        centerNode.id,
        `movie:${r.id}`,
        r.sharedActors?.length ? `via ${r.sharedActors[0]}` : "RELATED",
      ),
    ),
  ];

  return {
    focus: movie,
    nodes: [centerNode, ...directorNodes, ...genreNodes, ...actorNodes, ...relatedNodes],
    edges,
  };
}

export async function buildUserGraph(userId) {
  await ensureUserExists(userId);

  const records = await executeQuery(userGraphQuery, { userId });
  const record = records[0];

  const user = toPlain(record.get("u"));
  const following = toPlainList(record.get("following"));
  const followers = toPlainList(record.get("followers"));
  const liked = toPlainList(record.get("liked"));
  const watched = toPlainList(record.get("watched"));

  const centerNode = { ...makeNode("user", user), position: { x: 0, y: 0 } };

  const followingNodes = layoutRing(
    following.map((f) => makeNode("user", f)),
    240,
  );
  const followerNodes = layoutRing(
    followers.map((f) => makeNode("user", f)),
    240,
    Math.PI,
  );
  const likedNodes = layoutRing(
    liked.map((m) => makeNode("movie", m)),
    440,
  );
  const watchedNodes = layoutRing(
    watched.map((m) => makeNode("movie", m)),
    600,
    Math.PI / 5,
  );

  const edges = [
    ...following.map((f) => makeEdge(centerNode.id, `user:${f.id}`, "FOLLOWS")),
    ...followers.map((f) => makeEdge(`user:${f.id}`, centerNode.id, "FOLLOWS")),
    ...liked.map((m) => makeEdge(centerNode.id, `movie:${m.id}`, "LIKES")),
    ...watched.map((m) => makeEdge(centerNode.id, `movie:${m.id}`, "WATCHED")),
  ];

  return {
    focus: user,
    nodes: [centerNode, ...followingNodes, ...followerNodes, ...likedNodes, ...watchedNodes],
    edges,
  };
}

export async function buildShortestPathGraph(sourceMovieId, targetMovieId) {
  await Promise.all([ensureMovieExists(sourceMovieId), ensureMovieExists(targetMovieId)]);

  const records = await executeQuery(shortestPathBetweenMoviesQuery, {
    sourceId: sourceMovieId,
    targetId: targetMovieId,
  });

  if (records.length === 0) {
    throw ApiError.notFound(
      `No connection was found between these movies within ${PATH_MAX_DEPTH} hops.`,
    );
  }

  const path = records[0].get("p");
  const { nodes: pathNodes, relationships } = pathToPlain(path);

  const nodes = pathNodes.map((entity, index) => {
    const entityType = entity._type?.toLowerCase() ?? "movie";
    const { _type, ...rest } = entity;
    const node = makeNode(entityType, rest);
    node.position = {
      x: index * 260,
      y: Math.round(Math.sin(index * 1.1) * 90),
    };
    return node;
  });

  const edges = relationships.map((rel, index) => {
    const source = nodes[index]?.id;
    const target = nodes[index + 1]?.id;
    return makeEdge(source, target, rel.type);
  });

  return {
    length: relationships.length,
    nodes,
    edges,
  };
}
