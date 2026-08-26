import { describe, it, expect } from "vitest";
import {
  createCollectionSchema,
  createDocumentSchema,
  updateDocumentSchema,
  validateInput,
} from "../../src/utils/validation";

describe("Validation Utils (Unit Tests)", () => {
  describe("createCollectionSchema", () => {
    it("accepts valid collection name and slug", () => {
      const input = {
        name: "Engineering Architecture",
        slug: "engineering-architecture",
      };
      const result = validateInput(createCollectionSchema, input);
      expect(result).toEqual(input);
    });

    it("rejects empty or whitespace-only collection name", () => {
      expect(() =>
        validateInput(createCollectionSchema, {
          name: "   ",
          slug: "valid-slug",
        })
      ).toThrow("Name cannot be empty");
    });

    it("rejects uppercase letters in slug", () => {
      expect(() =>
        validateInput(createCollectionSchema, {
          name: "Valid Name",
          slug: "Invalid-Slug",
        })
      ).toThrow("Malformed slug");
    });

    it("rejects spaces in slug", () => {
      expect(() =>
        validateInput(createCollectionSchema, {
          name: "Valid Name",
          slug: "invalid slug",
        })
      ).toThrow("Malformed slug");
    });

    it("rejects special characters in slug", () => {
      expect(() =>
        validateInput(createCollectionSchema, {
          name: "Valid Name",
          slug: "invalid_slug!@#",
        })
      ).toThrow("Malformed slug");
    });

    it("rejects leading or trailing hyphens in slug", () => {
      expect(() =>
        validateInput(createCollectionSchema, {
          name: "Valid Name",
          slug: "-invalid-slug-",
        })
      ).toThrow("Malformed slug");
    });
  });

  describe("createDocumentSchema", () => {
    it("accepts valid document input", () => {
      const input = {
        title: "GraphQL Architecture",
        content: "Detailed documentation",
        tags: ["graphql", "typescript"],
        collectionId: "col-123",
      };
      const result = validateInput(createDocumentSchema, input);
      expect(result.title).toBe("GraphQL Architecture");
      expect(result.content).toBe("Detailed documentation");
      expect(result.tags).toEqual(["graphql", "typescript"]);
      expect(result.collectionId).toBe("col-123");
    });

    it("rejects empty title", () => {
      expect(() =>
        validateInput(createDocumentSchema, {
          title: "   ",
          content: "Valid content",
          collectionId: "col-123",
        })
      ).toThrow("Title cannot be empty");
    });

    it("rejects empty content", () => {
      expect(() =>
        validateInput(createDocumentSchema, {
          title: "Valid title",
          content: "   ",
          collectionId: "col-123",
        })
      ).toThrow("Content cannot be empty");
    });

    it("rejects missing collectionId", () => {
      expect(() =>
        validateInput(createDocumentSchema, {
          title: "Valid title",
          content: "Valid content",
          collectionId: "",
        })
      ).toThrow("Collection is required");
    });
  });

  describe("updateDocumentSchema", () => {
    it("accepts partial updates", () => {
      const input = { isArchived: true };
      const result = validateInput(updateDocumentSchema, input);
      expect(result.isArchived).toBe(true);
    });

    it("rejects empty title when title is provided", () => {
      expect(() =>
        validateInput(updateDocumentSchema, {
          title: "  ",
        })
      ).toThrow("Title cannot be empty");
    });
  });
});
