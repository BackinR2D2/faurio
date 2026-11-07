import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createReviewAuthorLookup, reviewAuthor } from "../../lib/review-authors.ts";
import { ReviewAuthor } from "../../components/review-author.tsx";

test("public review authors contain only the display name and deterministic initials",()=>{
  assert.deepEqual(reviewAuthor({full_name:"  Andreea  Popescu ",email:"private@example.test",id:"private-id"}),{name:"Andreea Popescu",initials:"AP"});
  assert.deepEqual(reviewAuthor({full_name:"Ștefan-Mihai Ionescu"}),{name:"Ștefan-Mihai Ionescu",initials:"ȘI"});
  assert.deepEqual(reviewAuthor({display_name:"Ana"}),{name:"Ana",initials:"A"});
  assert.deepEqual(reviewAuthor({name:"Ana\nMaria"}),{name:"Ana Maria",initials:"AM"});
  for(const metadata of [null,{}, {full_name:42},{full_name:"private@example.test"},{email:"private@example.test"}]) assert.deepEqual(reviewAuthor(metadata),{name:"Client Faurio",initials:"CF"});
  assert.equal(reviewAuthor({full_name:"A".repeat(200)}).name.length,80);
});
test("review avatars are accessible, escape user text and never load tracking images",()=>{
  const html=renderToStaticMarkup(createElement(ReviewAuthor,{author:reviewAuthor({full_name:'<img src=x onerror="bad()">'})}));
  assert.match(html,/role="img"/);assert.match(html,/aria-label="Avatar/);
  assert.doesNotMatch(html,/<img|<script/);assert.match(html,/&lt;img/);
});
test("profile lookup deduplicates concurrent requests and refreshes names after one minute",async()=>{
  let now=0;let calls=0;
  const lookup=createReviewAuthorLookup(async()=>{calls++;return reviewAuthor({full_name:calls===1?"Ana Popescu":"Ana Ionescu"});},()=>now);
  const [first,second]=await Promise.all([lookup("user"),lookup("user")]);
  assert.deepEqual(first,second);assert.equal(calls,1);
  now=59999;assert.equal((await lookup("user")).name,"Ana Popescu");assert.equal(calls,1);
  now=60000;assert.equal((await lookup("user")).name,"Ana Ionescu");assert.equal(calls,2);
});
test("temporary profile failures preserve reviews and are not cached",async()=>{
  let calls=0;
  const lookup=createReviewAuthorLookup(async()=>{if(++calls===1)throw new Error("unavailable");return reviewAuthor({full_name:"Ana Popescu"});});
  assert.deepEqual(await lookup("user"),reviewAuthor());
  assert.equal((await lookup("user")).name,"Ana Popescu");assert.equal(calls,2);
});
test("review profile caching is bounded instead of retaining every account indefinitely",async()=>{
  let calls=0;const lookup=createReviewAuthorLookup(async()=>{calls++;return reviewAuthor();});
  for(let i=0;i<201;i++)await lookup(String(i));
  await lookup("200");assert.equal(calls,201);
  await lookup("0");assert.equal(calls,202);
});
