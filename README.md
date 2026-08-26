# Document Vault — GraphQL API

A production-grade Document Vault backend API built with **Bun**, **TypeScript** (strict mode, zero `any`), **GraphQL Yoga** (schema-first), **PostgreSQL 16**, and **Prisma ORM**.

---

## 🚀 Quick Start (One-Command Setup)

To spin up the database, install dependencies, apply migrations, and start the development server:

```bash
docker compose up -d && bun install && bun run gendb && bun run dev
```

Once started, open your browser and navigate to:
👉 **[http://localhost:4000/graphql](http://localhost:4000/graphql)** to access the interactive **Yoga GraphiQL IDE**.

---

## 🛠️ Tech Stack

- **Runtime & Package Manager**: [Bun](https://bun.sh) (v1.3+)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict mode enabled, `no-explicit-any`)
- **API Engine**: [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server) (Schema-first SDL + Typed Resolvers)
- **Database**: [PostgreSQL 16](https://www.postgresql.org/) (via Docker Compose)
- **ORM & Migrations**: [Prisma 7](https://www.prisma.io/) with `@prisma/adapter-pg` connection pool
- **Validation**: [Zod](https://zod.dev/) + `GraphQLError` extensions
- **Testing**: [Vitest](https://vitest.dev/) (Unit + Integration tests against real PostgreSQL)
- **Containerization & CI**: Docker Multi-stage build + GitHub Actions

---

## 📂 Project Structure

```
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI (lint, typecheck, migrations, tests)
├── prisma/
│   ├── schema.prisma            # Collection & Document models with indexes
│   └── migrations/              # Prisma migration history
├── src/
│   ├── db/
│   │   └── prisma.ts            # PrismaClient singleton with pg Pool adapter
│   ├── schema/
│   │   └── schema.graphql       # GraphQL Schema Definition Language (SDL)
│   ├── utils/
│   │   └── validation.ts        # Zod validation schemas & GraphQLError formatters
│   ├── resolvers/
│   │   ├── collection.ts        # Collection queries, mutations, and field resolvers
│   │   ├── document.ts          # Document search, cursor pagination, and mutations
│   │   └── index.ts             # Root resolver merger
│   ├── context.ts               # GraphQL execution context
│   └── index.ts                 # Server entrypoint with Bun.serve()
├── tests/
│   ├── unit/
│   │   ├── validation.test.ts   # Unit tests for slug regex & string guards
│   │   └── resolvers.test.ts    # Unit tests for resolver business logic
│   └── integration/
│       └── api.test.ts          # Integration tests against PostgreSQL via yoga.fetch()
├── docker-compose.yml           # PostgreSQL 16 container setup
├── Dockerfile                   # Multi-stage Bun production container
├── .dockerignore                # Docker ignore rules
└── package.json                 # Scripts (dev, gendb, sanity, test, lint, typecheck)
```

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `bun run dev` | Start development server with hot reload |
| `bun run gendb` | Generate Prisma Client & apply migrations (`prisma migrate dev`) |
| `bun run test` | Run the complete test suite (Unit + Integration) |
| `bun run lint` | Run ESLint across the codebase |
| `bun run lint:fix` | Fix auto-fixable lint issues |
| `bun run typecheck` | Run `tsc --noEmit` for strict type checking |
| `bun run sanity` | **[Bonus]** Run lint, typecheck, and tests in a single command |

---

## 🧪 Testing Suite

The repository includes comprehensive **Unit** and **Integration** test coverage running against real PostgreSQL:

```bash
bun run sanity
```

- **Validation Unit Tests** (`tests/unit/validation.test.ts`):
  - Kebab-case slug validation (rejects uppercase, spaces, consecutive/trailing hyphens, special symbols).
  - Non-empty and trimmed string enforcement.
  - Partial updates for document attributes.
- **Resolver Unit Tests** (`tests/unit/resolvers.test.ts`):
  - Entity existence checks (`NOT_FOUND`).
  - Slug uniqueness conflict handling (`CONFLICT`).
- **Integration Tests** (`tests/integration/api.test.ts`):
  - End-to-end execution of queries and mutations via `yoga.fetch()`.
  - Nested relation resolution (`Collection.documents` & `Document.collection`).
  - Substring search across `title` and `content`.
  - Relay-compliant cursor-based pagination (`take`, `cursor`, `hasNextPage`, `endCursor`).
  - Moving documents between collections and cascade deletes.

---

## 💡 Architecture & Key Design Decisions

### 1. Schema-First GraphQL Design
The GraphQL API contract is defined explicitly in [`src/schema/schema.graphql`](file:///home/nyx/Learning/assignments/burdenoff/src/schema/schema.graphql). Resolvers are strictly decoupled and mapped directly to SDL types.

### 2. Relay-Compliant Cursor-Based Pagination
Instead of offset pagination (`LIMIT` / `OFFSET`), which degrades in performance on large datasets and suffers from duplicate/skipped items during concurrent writes, we implement **cursor-based pagination**:
- The client requests `take: N` and optional `cursor: "<ID>"`.
- The resolver queries `take: N + 1` ordered by `createdAt DESC`.
- If `items.length > limit`, `pageInfo.hasNextPage` is `true`.
- Capped at maximum `take: 100` to prevent Denial-of-Service (DoS) and excessive memory allocation.

### 3. Substring Search & Combined Filtering
The `documents(...)` query supports combining multiple optional filters:
- Filter by `collectionId`.
- Filter by `isArchived` boolean status.
- Substring match on `title` OR `content` using PostgreSQL case-insensitive pattern matching (`mode: 'insensitive'`).

### 4. Structured Error Handling (No 500 Crashes)
All validation errors and domain rule violations throw `GraphQLError` with typed `extensions.code`:
- `BAD_USER_INPUT`: Malformed slugs, empty/whitespace strings.
- `NOT_FOUND`: Referenced collection or document IDs that do not exist.
- `CONFLICT`: Attempting to create a collection with a duplicate slug.

---

## 🔮 How to Extend the Design (Production Roadmap)

If scaling this service to production, here is how the architecture can be extended:

1. **Full-Text Search (FTS)**:
   - *Current*: Substring search via `ILIKE` / `mode: 'insensitive'`.
   - *Extension*: Utilize PostgreSQL `tsvector` and GIN indexes, or external search engines like Meilisearch/Elasticsearch for typo-tolerance, stemming, and relevance ranking.
2. **DataLoader for N+1 Query Batching**:
   - *Current*: Resolvers use Prisma relations.
   - *Extension*: Introduce `DataLoader` to batch and deduplicate database queries when resolving nested `Collection.documents` or `Document.collection` across multiple records.
3. **Opaque Base64 Cursors**:
   - *Current*: Transparent ID-based cursors.
   - *Extension*: Base64-encode composite cursors (e.g. `base64(createdAt:id)`) to keep pagination cursors opaque and decoupled from database schema internals.
4. **Soft Deletion & Audit Logging**:
   - *Current*: Hard delete (`prisma.document.delete`).
   - *Extension*: Add `deletedAt: DateTime?` with Prisma client extensions to support document restoration and compliance audit trails.
5. **Authentication & Rate Limiting**:
   - Introduce JWT verification in `createContext` and integrate rate limiting via GraphQL Armor / Yoga plugins.

---

## 🚢 Docker & Deployment

Build and run the production container:

```bash
# Build production image
docker build -t document-vault:latest .

# Run container
docker run -p 4000:4000 --env-file .env document-vault:latest
```
