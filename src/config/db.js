import neo4j from "neo4j-driver";
import dotenv from "dotenv";

dotenv.config();

const { COGNODB_URI, COGNODB_USERNAME, COGNODB_PASSWORD } = process.env;

if (!COGNODB_URI || !COGNODB_USERNAME || !COGNODB_PASSWORD) {
  throw new Error(
    "Missing CognoDB credentials. Please set COGNODB_URI, COGNODB_USERNAME and COGNODB_PASSWORD in your .env file.",
  );
}

const driver = neo4j.driver(
  COGNODB_URI,
  neo4j.auth.basic(COGNODB_USERNAME, COGNODB_PASSWORD),
  { disableLosslessIntegers: true },
);

/**
 * Verifies that the driver can actually reach CognoDB Cloud.
 * Should be called once on server boot so connectivity issues fail fast.
 */
export async function verifyConnectivity() {
  const serverInfo = await driver.getServerInfo();
  return serverInfo;
}

/**
 * Runs a single parameterized Cypher statement inside a managed session,
 * always releasing the session in a `finally` block.
 *
 * @param {string} cypher - Parameterized Cypher query (no string concatenation).
 * @param {Record<string, unknown>} params - Query parameters.
 * @param {{ write?: boolean }} [options] - Whether this is a write transaction.
 * @returns {Promise<import("neo4j-driver").Record[]>}
 */
export async function executeQuery(cypher, params = {}, options = {}) {
  const { write = false } = options;
  const session = driver.session({
    defaultAccessMode: write ? neo4j.session.WRITE : neo4j.session.READ,
  });

  try {
    const result = write
      ? await session.executeWrite((tx) => tx.run(cypher, params))
      : await session.executeRead((tx) => tx.run(cypher, params));
    return result.records;
  } finally {
    await session.close();
  }
}

/**
 * Gracefully closes the driver. Should be called on SIGINT/SIGTERM.
 */
export async function closeDriver() {
  await driver.close();
}

export default driver;
