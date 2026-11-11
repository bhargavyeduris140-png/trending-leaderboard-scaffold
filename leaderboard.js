// leaderboard.js — Redis sorted set ranking + one hash per post.
import Redis from "ioredis";
import "dotenv/config";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is required. Copy .env.example to .env and configure Redis.");
}

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

redis.on("error", (error) => {
  console.error("Redis connection error:", error.message);
});

const RANKING_KEY = "trending:posts";

export async function upvote(postId) {
  if (typeof postId !== "string" || postId.trim() === "") {
    throw new TypeError("postId must be a non-empty string");
  }
  // A single atomic Redis command prevents lost updates during concurrent upvotes.
  return Number(await redis.zincrby(RANKING_KEY, 1, postId));
}

export async function getTop(n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new TypeError("n must be a non-negative integer");
  }
  if (n === 0) return [];

  const ranked = await redis.zrevrange(RANKING_KEY, 0, n - 1, "WITHSCORES");
  const rows = [];
  const pipeline = redis.pipeline();

  for (let i = 0; i < ranked.length; i += 2) {
    const id = ranked[i];
    rows.push({ id, score: Number(ranked[i + 1]) });
    pipeline.hgetall(`${id}:meta`);
  }

  if (rows.length === 0) return [];
  const results = await pipeline.exec();

  return rows.map((row, index) => {
    const [error, metadata] = results[index];
    if (error) throw error;
    return { ...row, ...metadata };
  });
}

export { redis };
