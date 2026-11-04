import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { getPost, posts } from "../../lib/blog";

test("journal contains eight complete, unique articles with local representative images", () => {
  assert.equal(posts.length, 8);
  assert.equal(new Set(posts.map(post => post.slug)).size, posts.length);
  for (const post of posts) {
    assert.ok(/^[a-z0-9-]+$/.test(post.slug));
    assert.ok(post.title.length > 15 && post.intro.length > 100);
    assert.ok(post.sections.length >= 3);
    assert.ok(post.sections.every(([heading, text]) => heading.length > 5 && text.length > 60));
    assert.ok(existsSync(resolve("public", post.image.slice(1))));
    assert.equal(getPost(post.slug), post);
    assert.ok(!/mâin|mână|mâna/i.test(JSON.stringify(post)));
  }
  assert.equal(getPost("missing"), undefined);
});
