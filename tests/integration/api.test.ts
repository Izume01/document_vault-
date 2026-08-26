import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { yoga } from "../../src/index";
import { prisma, pool } from "../../src/db/prisma";

interface GraphQLResponse<TData> {
  data?: TData;
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
}

interface CreateCollectionPayload {
  createCollection: {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
  };
}

interface CreateDocumentPayload {
  createDocument: {
    id: string;
    title: string;
    content: string;
    tags: string[];
    collectionId: string;
    isArchived: boolean;
    collection: {
      name: string;
      slug: string;
    };
  };
}

interface GetCollectionPayload {
  collection: {
    id: string;
    name: string;
    documents: Array<{
      id: string;
      title: string;
    }>;
  };
}

interface SearchDocsPayload {
  documents: {
    totalCount: number;
    nodes: Array<{
      id: string;
      title: string;
    }>;
  };
}

interface PaginateDocsPayload {
  documents: {
    totalCount: number;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    edges: Array<{
      cursor: string;
      node: {
        id: string;
        title: string;
      };
    }>;
  };
}

interface MoveDocPayload {
  moveDocument: {
    id: string;
    collectionId: string;
    collection: {
      slug: string;
    };
  };
}

interface DeleteDocPayload {
  deleteDocument: boolean;
}

interface CheckDocsPayload {
  documents: {
    totalCount: number;
  };
}

async function executeGraphQL<TData>(
  query: string,
  variables?: Record<string, unknown>
): Promise<GraphQLResponse<TData>> {
  const response = await yoga.fetch("http://localhost:4000/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return (await response.json()) as GraphQLResponse<TData>;
}

describe("Document Vault GraphQL API (Integration Tests)", () => {
  let collectionAId: string;
  let collectionBId: string;
  let document1Id: string;
  let document2Id: string;

  beforeAll(async () => {
    // Clean database before running tests
    await prisma.document.deleteMany();
    await prisma.collection.deleteMany();
  });

  afterAll(async () => {
    // Clean up and disconnect
    await prisma.document.deleteMany();
    await prisma.collection.deleteMany();
    await prisma.$disconnect();
    await pool.end();
  });

  describe("Collection Operations", () => {
    it("creates a new collection", async () => {
      const mutation = `
        mutation CreateCollection($input: CreateCollectionInput!) {
          createCollection(input: $input) {
            id
            name
            slug
            createdAt
          }
        }
      `;

      const result = await executeGraphQL<CreateCollectionPayload>(mutation, {
        input: { name: "Engineering Docs", slug: "engineering-docs" },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.createCollection.name).toBe("Engineering Docs");
      expect(result.data?.createCollection.slug).toBe("engineering-docs");
      expect(result.data?.createCollection.id).toBeDefined();

      if (result.data?.createCollection.id) {
        collectionAId = result.data.createCollection.id;
      }
    });

    it("rejects creating a collection with a malformed slug", async () => {
      const mutation = `
        mutation CreateCollection($input: CreateCollectionInput!) {
          createCollection(input: $input) {
            id
          }
        }
      `;

      const result = await executeGraphQL<CreateCollectionPayload>(mutation, {
        input: { name: "Invalid Slug", slug: "INVALID SLUG WITH SPACES!" },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
    });

    it("rejects duplicate collection slug with CONFLICT error", async () => {
      const mutation = `
        mutation CreateCollection($input: CreateCollectionInput!) {
          createCollection(input: $input) {
            id
          }
        }
      `;

      const result = await executeGraphQL<CreateCollectionPayload>(mutation, {
        input: { name: "Duplicate Engineering", slug: "engineering-docs" },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.extensions?.code).toBe("CONFLICT");
    });

    it("creates a second collection for move tests", async () => {
      const mutation = `
        mutation CreateCollection($input: CreateCollectionInput!) {
          createCollection(input: $input) {
            id
            slug
          }
        }
      `;

      const result = await executeGraphQL<CreateCollectionPayload>(mutation, {
        input: { name: "Design System", slug: "design-system" },
      });

      expect(result.errors).toBeUndefined();
      if (result.data?.createCollection.id) {
        collectionBId = result.data.createCollection.id;
      }
    });
  });

  describe("Document Operations", () => {
    it("creates a document inside a collection", async () => {
      const mutation = `
        mutation CreateDocument($input: CreateDocumentInput!) {
          createDocument(input: $input) {
            id
            title
            content
            tags
            collectionId
            isArchived
            collection {
              name
              slug
            }
          }
        }
      `;

      const result = await executeGraphQL<CreateDocumentPayload>(mutation, {
        input: {
          title: "System Architecture Overview",
          content: "High level diagrams and database schemas for vault.",
          tags: ["architecture", "backend"],
          collectionId: collectionAId,
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.createDocument.title).toBe("System Architecture Overview");
      expect(result.data?.createDocument.collection.slug).toBe("engineering-docs");
      expect(result.data?.createDocument.tags).toEqual(["architecture", "backend"]);

      if (result.data?.createDocument.id) {
        document1Id = result.data.createDocument.id;
      }
    });

    it("creates a second document for search and pagination tests", async () => {
      const mutation = `
        mutation CreateDocument($input: CreateDocumentInput!) {
          createDocument(input: $input) {
            id
            title
          }
        }
      `;

      const result = await executeGraphQL<CreateDocumentPayload>(mutation, {
        input: {
          title: "API Guidelines",
          content: "Rules for building GraphQL queries and mutations.",
          tags: ["api", "graphql"],
          collectionId: collectionAId,
        },
      });

      expect(result.errors).toBeUndefined();
      if (result.data?.createDocument.id) {
        document2Id = result.data.createDocument.id;
      }
    });

    it("rejects empty title when creating document", async () => {
      const mutation = `
        mutation CreateDocument($input: CreateDocumentInput!) {
          createDocument(input: $input) {
            id
          }
        }
      `;

      const result = await executeGraphQL<CreateDocumentPayload>(mutation, {
        input: {
          title: "   ",
          content: "Valid content",
          collectionId: collectionAId,
        },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
    });
  });

  describe("Queries & Search & Pagination", () => {
    it("fetches single collection with nested documents", async () => {
      const query = `
        query GetCollection($id: ID!) {
          collection(id: $id) {
            id
            name
            documents {
              id
              title
            }
          }
        }
      `;

      const result = await executeGraphQL<GetCollectionPayload>(query, { id: collectionAId });
      expect(result.errors).toBeUndefined();
      expect(result.data?.collection.documents.length).toBe(2);
    });

    it("searches documents by substring on title or content", async () => {
      const query = `
        query SearchDocs($search: String) {
          documents(search: $search) {
            totalCount
            nodes {
              id
              title
            }
          }
        }
      `;

      const result = await executeGraphQL<SearchDocsPayload>(query, { search: "architecture" });
      expect(result.errors).toBeUndefined();
      expect(result.data?.documents.totalCount).toBe(1);
      expect(result.data?.documents.nodes[0]?.title).toBe("System Architecture Overview");
    });

    it("paginates documents using take and cursor", async () => {
      const query = `
        query PaginateDocs($take: Int, $cursor: String) {
          documents(take: $take, cursor: $cursor) {
            totalCount
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              cursor
              node {
                id
                title
              }
            }
          }
        }
      `;

      const page1 = await executeGraphQL<PaginateDocsPayload>(query, { take: 1 });
      expect(page1.errors).toBeUndefined();
      expect(page1.data?.documents.edges.length).toBe(1);
      expect(page1.data?.documents.pageInfo.hasNextPage).toBe(true);

      const cursor = page1.data?.documents.pageInfo.endCursor;
      expect(cursor).toBeDefined();

      const page2 = await executeGraphQL<PaginateDocsPayload>(query, {
        take: 1,
        cursor: cursor ?? undefined,
      });
      expect(page2.errors).toBeUndefined();
      expect(page2.data?.documents.edges.length).toBe(1);
      expect(page2.data?.documents.edges[0]?.node.id).not.toBe(
        page1.data?.documents.edges[0]?.node.id
      );
    });
  });

  describe("Move & Delete Mutations", () => {
    it("moves document to another collection", async () => {
      const mutation = `
        mutation MoveDoc($id: ID!, $collectionId: ID!) {
          moveDocument(id: $id, collectionId: $collectionId) {
            id
            collectionId
            collection {
              slug
            }
          }
        }
      `;

      const result = await executeGraphQL<MoveDocPayload>(mutation, {
        id: document1Id,
        collectionId: collectionBId,
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.moveDocument.collectionId).toBe(collectionBId);
      expect(result.data?.moveDocument.collection.slug).toBe("design-system");
    });

    it("deletes a document", async () => {
      const mutation = `
        mutation DeleteDoc($id: ID!) {
          deleteDocument(id: $id)
        }
      `;

      const result = await executeGraphQL<DeleteDocPayload>(mutation, { id: document2Id });
      expect(result.errors).toBeUndefined();
      expect(result.data?.deleteDocument).toBe(true);

      const checkQuery = `
        query CheckDocs {
          documents {
            totalCount
          }
        }
      `;
      const checkResult = await executeGraphQL<CheckDocsPayload>(checkQuery);
      expect(checkResult.data?.documents.totalCount).toBe(1);
    });
  });
});
