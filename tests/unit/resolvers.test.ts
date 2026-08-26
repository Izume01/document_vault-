import { describe, it, expect, vi } from "vitest";
import { collectionResolvers } from "../../src/resolvers/collection";
import { documentResolvers } from "../../src/resolvers/document";
import type { GraphQLContext } from "../../src/context";

describe("Resolver Logic (Unit Tests)", () => {
  describe("collectionResolvers", () => {
    it("throws NOT_FOUND when collection ID does not exist", async () => {
      const mockPrisma = {
        collection: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      } as unknown as GraphQLContext["prisma"];

      await expect(
        collectionResolvers.Query.collection(
          {},
          { id: "non-existent-id" },
          { prisma: mockPrisma }
        )
      ).rejects.toThrow('Collection with the id "non-existent-id" not found');
    });

    it("throws CONFLICT when creating a collection with an existing slug", async () => {
      const mockPrisma = {
        collection: {
          findUnique: vi.fn().mockResolvedValue({
            id: "existing-id",
            name: "Existing",
            slug: "engineering",
          }),
        },
      } as unknown as GraphQLContext["prisma"];

      await expect(
        collectionResolvers.Mutation.createCollection(
          {},
          { input: { name: "Engineering", slug: "engineering" } },
          { prisma: mockPrisma }
        )
      ).rejects.toThrow('A Collection with slug "engineering" already exists');
    });
  });

  describe("documentResolvers", () => {
    it("throws NOT_FOUND when creating document for non-existent collection", async () => {
      const mockPrisma = {
        collection: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      } as unknown as GraphQLContext["prisma"];

      await expect(
        documentResolvers.Mutation.createDocument(
          {},
          {
            input: {
              title: "Doc Title",
              content: "Doc Content",
              collectionId: "invalid-collection-id",
            },
          },
          { prisma: mockPrisma }
        )
      ).rejects.toThrow('Collection with ID "invalid-collection-id" not found');
    });

    it("throws NOT_FOUND when moving document to a non-existent collection", async () => {
      const mockPrisma = {
        collection: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      } as unknown as GraphQLContext["prisma"];

      await expect(
        documentResolvers.Mutation.moveDocument(
          {},
          { id: "doc-1", collectionId: "non-existent-col" },
          { prisma: mockPrisma }
        )
      ).rejects.toThrow('Target collection with ID "non-existent-col" not found');
    });

    it("throws NOT_FOUND when moving a non-existent document", async () => {
      const mockPrisma = {
        collection: {
          findUnique: vi.fn().mockResolvedValue({ id: "valid-col-id" }),
        },
        document: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      } as unknown as GraphQLContext["prisma"];

      await expect(
        documentResolvers.Mutation.moveDocument(
          {},
          { id: "non-existent-doc", collectionId: "valid-col-id" },
          { prisma: mockPrisma }
        )
      ).rejects.toThrow('Document with ID "non-existent-doc" not found');
    });
  });
});
