// test.js — verify that repeated upvotes move a post into the top 10.
import assert from "node:assert/strict";
import { upvote, getTop, redis } from "./leaderboard.js";

async function run() {
  const target = "post:50";
  try {
    // Ensure the seeded target starts at a low score so the assertion is deterministic.
    await redis.hset(`${target}:meta`, "title", "Post number 50", "author", "@user50");
    await redis.zadd("trending:posts", 0, target);

    for (let i = 0; i < 50; i += 1) {
      await upvote(target);
    }

    const top = await getTop(10);
    console.log("Top 10:");
    top.forEach((post, index) => {
      console.log(`  #${index + 1}  ${post.id}  score=${post.score}  ${post.title} (${post.author})`);
    });

    assert.ok(top.some((post) => post.id === target), `${target} should reach the top 10`);
    console.log(`\nPASS ✅  ${target} reached the top 10`);
  } finally {
    await redis.quit();
  }
}

run().catch((error) => {
  console.error("\nFAIL ❌", error);
  process.exitCode = 1;
});
