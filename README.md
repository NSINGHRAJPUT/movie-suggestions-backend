# CineGraph API

Express + Neo4j (CognoDB Cloud) backend for CineGraph. See the [project README](../README.md) for
the full write-up (architecture, data model, Cypher query explanations, deployment).

## Quick start

```bash
npm install
cp .env.example .env   # fill in your CognoDB credentials
npm run seed            # idempotent - populates the graph
npm run dev             # http://localhost:5001
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the API with nodemon (auto-restart) |
| `npm start` | Start the API for production |
| `npm run seed` | Seed/refresh the CineGraph dataset in CognoDB |
