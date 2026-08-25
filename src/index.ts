import {prisma,pool} from './db/prisma';

const server = Bun.serve({
    port: 3000,
    fetch(req) {
        return new Response('Hello, World!');
    }
})

console.log(`Server running on http://localhost:${server.port}`);


async function handleShutdown(signal: string) {
    console.log(`Recieved ${signal} Closing server...`);

    server.stop();
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));