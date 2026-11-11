// seed.js — create 100 sample posts using one Redis pipeline.
import { redis } from "./leaderboard.js";

async function seed() {
  try {
    const pipeline = redis.pipeline();
    pipeline.del("trending:posts");

    for (let i = 1; i <= 100; i += 1) {
      const id = `post:${i}`;
      const startingScore = Math.floor(Math.random() * 50);
      pipeline.hset(`${id}:meta`, "title", `Post number ${i}`, "author", `@user${i}`);
      pipeline.zadd("trending:posts", startingScore, id);
    }

    const results = await pipeline.exec();
    const failed = results.find(([error]) => error);
    if (failed) throw failed[0];

    console.log("Seeded 100 posts.");
  } finally {
    await redis.quit();
  }
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exitCode = 1;
});
