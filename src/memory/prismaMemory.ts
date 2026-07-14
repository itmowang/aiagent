import { prisma } from "../lib/prisma";
import type { Memory, MemoryItem } from "./types";

interface PrismaOptions {
    userId: string;
}

export function createPrismaMemory(options: PrismaOptions): Memory {
    const { userId } = options;

    return {
        async set(key: string, value: string) {
            await prisma.memory.upsert({
                where: {
                    userId: {
                        userId,
                        key
                    }
                },
                update: {
                    value
                },
                create: {
                    userId,
                    key,
                    value
                }
            })
        },
        async get(key: string) {
            const memory = await prisma.memory.findUnique({
                where: {
                    userId_key: {
                        userId,
                        key
                    }
                }
            });

            if (!memory) {
                return undefined;
            }

            return {
                key: memory.key,
                value: memory.value,
                createdAt: memory.createdAt.getTime()
            }

        },
        async all() {
            const memories = await prisma.memory.findMany({
                where: {
                    userId
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });

            return memories.map(item => ({
                key: item.key,
                value: item.value,
                createdAt: item.createdAt.getTime()
            }))
        },
        async clear() {
            await prisma.memory.deleteMany({
                where: {
                    userId
                }
            })
        }
    }
}