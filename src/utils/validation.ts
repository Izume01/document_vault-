import z from "zod";
import { GraphQLError } from "graphql";

const nonEmptyString = (msg: string) => z.string().trim().min(1, msg);

const slugRule = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Malformed slug (e.g. use 'my-docs')");

export const createCollectionSchema = z.object({
  name: nonEmptyString("Name cannot be empty"),
  slug: slugRule,
});

export const createDocumentSchema = z.object({
  title: nonEmptyString("Title cannot be empty"),
  content: nonEmptyString("Content cannot be empty"),
  tags: z.array(z.string()).optional(),
  collectionId: nonEmptyString("Collection is required"),
});

export const updateDocumentSchema = z.object({
  title: nonEmptyString("Title cannot be empty").optional(),
  content: nonEmptyString("Content cannot be empty").optional(),
  tags: z.array(z.string()).optional(),
  isArchived: z.boolean().optional(),
});

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new GraphQLError(result.error.issues[0]?.message ?? "Invalid Input", {
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  }
  return result.data;
}