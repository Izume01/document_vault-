import { PrismaClient } from "../generated/prisma/client";
import {prisma} from "./db/prisma"

export interface GraphQLContext {
    prisma: PrismaClient
}

export function createContext() : GraphQLContext {
    return {prisma}
}