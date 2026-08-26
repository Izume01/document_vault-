# Document Vault — GraphQL API

A small GraphQL API for managing documents and collections, built with Bun, TypeScript, GraphQL Yoga, PostgreSQL, and Prisma.

The implementation focuses on the required assignment scope: clean API design, database modeling, validation, testing, and maintainable project structure.

## Quick Start

Start PostgreSQL, install dependencies, generate the Prisma client, apply migrations, and start the development server:

```bash
docker compose up -d && bun install && bun run gendb && bun run dev
```

The GraphQL API and GraphiQL interface will be available at:

`http://localhost:4000/graphql`

## Tech Stack

* **Runtime & package manager:** Bun
* **Language:** TypeScript with strict mode and no `any`
* **API:** GraphQL Yoga with schema-first GraphQL SDL
* **Database:** PostgreSQL 16
* **ORM:** Prisma
* **Validation:** Zod
* **Testing:** Vitest
* **Database environment:** Docker Compose

## Project Structure

```text
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── db/
│   │   └── prisma.ts
│   ├── resolvers/
│   │   ├── collection.ts
│   │   ├── document.ts
│   │   └── index.ts
│   ├── schema/
│   │   └── schema.graphql
│   ├── utils/
│   │   └── validation.ts
│   ├── context.ts
│   └── index.ts
├── tests/
│   ├── unit/
│   │   ├── validation.test.ts
│   │   └── resolvers.test.ts
│   └── integration/
│       └── api.test.ts
├── docker-compose.yml
└── package.json
```

## API

### Queries

* `collections` — return all collections
* `collection(id)` — return a collection with its nested documents
* `documents(...)` — return documents with optional filtering and cursor pagination

The `documents` query supports:

* `collectionId`
* `search` — substring match against title or content
* `isArchived`
* `take`
* `cursor`

### Mutations

* `createCollection`
* `createDocument`
* `updateDocument`
* `deleteDocument`
* `moveDocument`

## Validation and Error Handling

The API validates input before performing database operations.

The following cases return GraphQL errors instead of unhandled server errors:

* Empty document titles
* Empty document contents
* Empty or invalid collection names
* Malformed collection slugs
* Creating a collection with an existing slug
* Referencing a collection or document that does not exist

Expected errors use structured GraphQL error codes such as:

* `BAD_USER_INPUT`
* `NOT_FOUND`
* `CONFLICT`

## Pagination

Documents use cursor-based pagination with `take` and `cursor`.

The resolver fetches one additional document beyond the requested page size to determine whether another page exists.

For example:

```graphql
documents(take: 10)
```

requests the first 10 documents.

A subsequent request can provide the returned cursor:

```graphql
documents(take: 10, cursor: "...")
```

The maximum page size is capped at 100.

## Database

PostgreSQL runs through Docker Compose.

All database schema changes are managed through Prisma migrations. The migration history is stored under:

```text
prisma/migrations/
```

Schema changes should be made through Prisma and applied using:

```bash
bun run gendb
```

No hand-written or manually edited SQL migrations are used.

## Testing

The project includes both unit and integration tests.

### Unit Tests

Unit tests cover resolver behavior and validation, including:

* Invalid input handling
* Missing collections and documents
* Duplicate collection slugs
* Document updates
* Document movement

### Integration Tests

Integration tests run against PostgreSQL and execute the GraphQL API through Yoga.

They cover the interaction between:

* GraphQL schema
* Resolvers
* Prisma
* PostgreSQL

Run the complete test suite with:

```bash
bun run test
```

If the optional sanity script is included:

```bash
bun run sanity
```

## Available Commands

| Command             | Description                                 |
| ------------------- | ------------------------------------------- |
| `bun run dev`       | Start the development server                |
| `bun run gendb`     | Generate Prisma Client and apply migrations |
| `bun run test`      | Run the test suite                          |
| `bun run lint`      | Run ESLint                                  |
| `bun run lint:fix`  | Fix auto-fixable lint issues                |
| `bun run typecheck` | Run TypeScript type checking                |
| `bun run sanity`    | Run lint, typecheck, and tests              |

## API Design 

GraphQL uses a schema-first approach, with the API contract defined in `src/schema/schema.graphql` and the corresponding behavior implemented in resolvers.

Database access is isolated through Prisma, while validation is kept separate from resolver logic. This keeps the individual parts easy to test and avoids putting too much responsibility into a single layer.

Cursor pagination was chosen over offset pagination because it provides a better foundation for paging through changing datasets while keeping the implementation relatively simple.

## Extending the Design

If the application grew beyond the current assignment, the first areas I would consider extending are:

* PostgreSQL full-text search for larger document collections
* DataLoader for batching nested relation queries
* Additional indexing based on actual query patterns

These are intentionally not part of the current implementation because they are not required by the assignment.
