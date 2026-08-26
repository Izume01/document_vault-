import { createYoga, createSchema } from "graphql-yoga";
import { readFileSync } from "fs";
import { join } from "path";
import { prisma, pool } from "./db/prisma";
import { createContext } from "./context";
import { resolvers } from "./resolvers";

const typeDefs = readFileSync(
  join(import.meta.dir, "schema/schema.graphql"),
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
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

const server = Bun.serve({
  port,
  fetch: yoga.fetch,
});

console.log(`🚀 Server running on http://localhost:${server.port}/graphql`);

async function handleShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Closing server...`);
  server.stop();
  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));