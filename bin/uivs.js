#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';
import { fetchPost, searchPosts } from '../lib/fetch.js';
import { generateCode, resolveTarget } from '../lib/convert.js';

function parseArgs(argv) {
  let proxy = '';
  let limit = 10;
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--proxy') {
      proxy = argv[i + 1] || '';
      i += 1;
    } else if (arg.startsWith('--proxy=')) {
      proxy = arg.slice('--proxy='.length);
    } else if (arg === '--limit') {
      limit = Number(argv[i + 1]) || 10;
      i += 1;
    } else if (arg.startsWith('--limit=')) {
      limit = Number(arg.slice('--limit='.length)) || 10;
    } else {
      positional.push(arg);
    }
  }
  return { proxy, limit, positional };
}

function usage() {
  console.log(`usage:
  uivs <language> <uiverse-url|author/slug> [output-file]
  uivs search <query> [--limit N]
  uivs info  <uiverse-url|author/slug>
  uivs tags  <uiverse-url|author/slug>
  uivs --help
  uivs --version

languages:
  html  css  react (jsx|tsx)  vue  svelte  lit

options:
  --proxy <url>       HTTP/HTTPS proxy (or UIVERSE_PROXY / HTTPS_PROXY)
  --limit <n>         max search results (default 10)
`);
}

async function run() {
  const { proxy, limit, positional } = parseArgs(process.argv.slice(2));
  const command = positional[0] || '';

  if (command === '--help' || command === '-h') {
    usage();
    return;
  }

  if (command === '--version' || command === '-v') {
    console.log('uivs 0.1.0');
    return;
  }

  const input = positional[1];
  if (!input) {
    usage();
    process.exit(1);
  }

  if (command === 'search') {
    const results = await searchPosts(input, { proxy, limit });
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  const post = await fetchPost(input, { proxy });

  if (command === 'info') {
    const { html, css, ...metadata } = post;
    console.log(JSON.stringify(metadata, null, 2));
    return;
  }

  if (command === 'tags') {
    console.log(JSON.stringify(post.tags, null, 2));
    return;
  }

  const target = resolveTarget(command);
  const output = positional[2];
  const generated = generateCode(target, post);
  const result = {
    target: generated.target,
    language: generated.language,
    username: post.username,
    slug: post.slug,
    url: post.url,
    type: post.type,
    tags: post.tags,
    isTailwind: post.isTailwind,
    postId: post.postId,
    length: generated.code.length,
    code: generated.code,
  };

  if (output) {
    await writeFile(output, generated.code, 'utf8');
    const { code: _code, ...summary } = result;
    console.log(JSON.stringify(summary, null, 2));
    console.error(`saved ${generated.language} code to ${output}`);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message || String(error));
    process.exit(1);
  });
