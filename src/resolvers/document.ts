import { GraphQLError } from "graphql";
import type { GraphQLContext } from "../context";
import {
    createCollectionSchema,
    validateInput
} from "../utils/validation";

interface idType {
    id: string
}

interface inputType {
    input: string
}

export const collectionResolvers = {
    Query: {
        collections: async (
            _parent: unknown,
            _args: unknown,
            { prisma }: GraphQLContext
        ) => {
            return await prisma.collection.findMany({
                orderBy: {
                    createdAt: "desc"
                }
            })
        },

        collection: async (
            _parent: unknown,
            { id }: idType,
            { prisma }: GraphQLContext
        ) => {
            const collection = await prisma.collection.findUnique({
                where: { id }
            })

            if (!collection) {
                throw new GraphQLError(
                    `Collection with the id "${id}" not found`
                )
            }

            return collection
        }
    },

    Mutation: {
        createCollection: async (
            _parent: unknown,
            { input }: inputType,
            { prisma }: GraphQLContext
        ) => {
            const data = validateInput(createCollectionSchema, input)

            const existing = await prisma.collection.findUnique({
                where: {
                    slug: data.slug
                }
            })

            if (existing) {
                throw new GraphQLError(
                    `A Collection with slug "${data.slug}" already exists`,
                    {
                        extensions: {
                            code: "CONFLICT",
                            field: "slug",
                        },
                    }
                );
            }

            return prisma.collection.create({
                data
            })
        }
    },

    Collections: {
        documents: async (
            parent: {
                id: string
            },
            _args: unknown,
            { prisma }: GraphQLContext
        ) => {
            return prisma.document.findMany({
                where : {
                    collectionId : parent.id,
                },
                orderBy : {
                    createdAt : "desc"
                }
            })
        }
    }
}