import { GraphQLError } from "graphql";
import type { GraphQLContext } from "../context";
import type { Prisma } from "../../generated/prisma/client";
import {
  createDocumentSchema,
  updateDocumentSchema,
  validateInput,
} from "../utils/validation";

interface DocumentsArgs {
  collectionId?: string;
  search?: string;
  isArchived?: boolean;
  take?: number;
  cursor?: string;
}

export const documentResolvers = {
  Query: {
    documents: async (
      _parent: unknown,
      args: DocumentsArgs,
      { prisma }: GraphQLContext
    ) => {
      const { collectionId, search, isArchived, cursor } = args;

      const limit = Math.min(Math.max(args.take ?? 20, 1), 100);

      const where: Prisma.DocumentWhereInput = {};

      if (collectionId) {
        where.collectionId = collectionId;
      }

      if (typeof isArchived === "boolean") {
        where.isArchived = isArchived;
      }

      if (search && search.trim().length > 0) {
        const term = search.trim();
        where.OR = [
          { title: { contains: term, mode: "insensitive" } },
          { content: { contains: term, mode: "insensitive" } },
        ];
      }

      const items = await prisma.document.findMany({
        where,
        take: limit + 1,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { createdAt: "desc" },
      });

      const hasNextPage = items.length > limit;
      const nodes = hasNextPage ? items.slice(0, limit) : items;
      const endCursor = nodes.length > 0 ? nodes[nodes.length - 1]?.id ?? null : null;
      const totalCount = await prisma.document.count({ where });

      return {
        edges: nodes.map((node) => ({ cursor: node.id, node })),
        nodes,
        pageInfo: {
          hasNextPage,
          endCursor,
        },
        totalCount,
      };
    },
  },

  Mutation: {
    createDocument: async (
      _parent: unknown,
      { input }: { input: unknown },
      { prisma }: GraphQLContext
    ) => {
      const data = validateInput(createDocumentSchema, input);

      const collection = await prisma.collection.findUnique({
        where: { id: data.collectionId },
      });

      if (!collection) {
        throw new GraphQLError(`Collection with ID "${data.collectionId}" not found.`, {
          extensions: {
            code: "NOT_FOUND",
            field: "collectionId",
          },
        });
      }

      return prisma.document.create({
        data: {
          title: data.title,
          content: data.content,
          tags: data.tags ?? [],
          collectionId: data.collectionId,
        },
      });
    },

    updateDocument: async (
      _parent: unknown,
      { id, input }: { id: string; input: unknown },
      { prisma }: GraphQLContext
    ) => {
      const document = await prisma.document.findUnique({
        where: { id },
      });

      if (!document) {
        throw new GraphQLError(`Document with ID "${id}" not found.`, {
          extensions: {
            code: "NOT_FOUND",
            field: "id",
          },
        });
      }

      const data = validateInput(updateDocumentSchema, input);

      return prisma.document.update({
        where: { id },
        data,
      });
    },

    deleteDocument: async (
      _parent: unknown,
      { id }: { id: string },
      { prisma }: GraphQLContext
    ) => {
      const document = await prisma.document.findUnique({
        where: { id },
      });

      if (!document) {
        throw new GraphQLError(`Document with ID "${id}" not found.`, {
          extensions: {
            code: "NOT_FOUND",
            field: "id",
          },
        });
      }

      await prisma.document.delete({
        where: { id },
      });

      return true;
    },

    moveDocument: async (
      _parent: unknown,
      { id, collectionId }: { id: string; collectionId: string },
      { prisma }: GraphQLContext
    ) => {
      const targetCollection = await prisma.collection.findUnique({
        where: { id: collectionId },
      });

      if (!targetCollection) {
        throw new GraphQLError(`Target collection with ID "${collectionId}" not found.`, {
          extensions: {
            code: "NOT_FOUND",
            field: "collectionId",
          },
        });
      }

      const document = await prisma.document.findUnique({
        where: { id },
      });

      if (!document) {
        throw new GraphQLError(`Document with ID "${id}" not found.`, {
          extensions: {
            code: "NOT_FOUND",
            field: "id",
          },
        });
      }

      return prisma.document.update({
        where: { id },
        data: { collectionId },
      });
    },
  },

  Document: {
    collection: async (
      parent: { collectionId: string },
      _args: unknown,
      { prisma }: GraphQLContext
    ) => {
      return prisma.collection.findUnique({
        where: { id: parent.collectionId },
      });
    },
  },
};