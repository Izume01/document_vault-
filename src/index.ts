import { createYoga, createSchema } from "graphql-yoga";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { prisma, pool } from "./db/prisma";
import { createContext } from "./context";
import { resolvers } from "./resolvers";

const currentDir =
  typeof import.meta.dir === "string"
    ? import.meta.dir
    : dirname(fileURLToPath(import.meta.url));

const typeDefs = readFileSync(
  join(currentDir, "schema/schema.graphql"),
  "utf-8"
);

const schema = createSchema({
  typeDefs,
  resolvers,
});

export const yoga = createYoga({
  schema,
  context: createContext,
  graphqlEndpoint: "/graphql",
  landingPage: true,
  maskedErrors: false,
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

let server: ReturnType<typeof Bun.serve> | null = null;

if (process.env.NODE_ENV !== "test") {
  server = Bun.serve({
    port,
    fetch: yoga.fetch,
  });
  console.log(`🚀 Server running on http://localhost:${server.port}/graphql`);
}

async function handleShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Closing server...`);
  server?.stop();
  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));