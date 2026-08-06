/**
 * Neo4j Node/Relationship objects carry driver-internal metadata
 * (identity, labels, elementId). The API should only ever expose the
 * application-level properties we modeled ourselves (id, title, name, ...).
 */
export const toPlain = (node) => (node ? { ...node.properties } : null);

export const toPlainList = (nodes = []) => nodes.filter(Boolean).map(toPlain);

/** Primary label (entity type) of a neo4j Node, e.g. "Movie", "Actor". */
export const getLabel = (node) => node?.labels?.[0] ?? null;

const toPlainWithType = (node) => ({ ...toPlain(node), _type: getLabel(node) });

/**
 * Converts a neo4j-driver Path (as returned by shortestPath()) into a
 * simple { nodes, relationships } shape that's easy to turn into
 * React Flow nodes/edges. Each node carries a `_type` field derived from
 * its Neo4j label so the caller can color/route it without another query.
 */
export const pathToPlain = (path) => {
  if (!path) return { nodes: [], relationships: [] };

  const nodes = [toPlainWithType(path.start)];
  const relationships = [];

  for (const segment of path.segments) {
    relationships.push({
      type: segment.relationship.type,
      startNodeId: toPlain(segment.start)?.id,
      endNodeId: toPlain(segment.end)?.id,
    });
    nodes.push(toPlainWithType(segment.end));
  }

  return { nodes, relationships };
};
