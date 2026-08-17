#!/usr/bin/env node

import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { fetchPost, searchPosts } from '../lib/fetch.js';
import { generateCode, resolveTarget, SUPPORTED_TARGETS } from '../lib/convert.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function parseLimit(raw) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > MAX_LIMIT) {
    throw new Error(`--limit must be an integer between 1 and ${MAX_LIMIT}, received: ${raw}`);
  }
  return value;
}

function parseArgs(argv) {
  let proxy = '';
  let limit = DEFAULT_LIMIT;
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const [flag, inlineValue] = arg.startsWith('--') && arg.includes('=')
      ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)]
      : [arg, undefined];

    const takeValue = () => {
      if (inlineValue !== undefined) {
        return inlineValue;
      }
      i += 1;
      // The next token must be the value, not another flag, so
      // `--proxy --limit 5` reports the missing value instead of
      // silently treating `--limit` as a proxy URL.
      if (i >= argv.length || argv[i].startsWith('--')) {
        throw new Error(`Missing value for ${flag}`);
      }
      return argv[i];
    };

    if (flag === '--proxy') {
      proxy = takeValue().trim();
      if (!proxy) {
        throw new Error('Missing value for --proxy');
      }
    } else if (flag === '--limit') {
      limit = parseLimit(takeValue());
    } else if (arg.startsWith('--') && arg !== '--help' && arg !== '--version') {
      throw new Error(`Unknown option: ${arg}`);
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
  ${SUPPORTED_TARGETS.join('  ')}   (jsx|tsx alias react)

options:
  --proxy <url>       HTTP/HTTPS proxy (or UIVERSE_PROXY / HTTPS_PROXY)
  --limit <n>         max search results, 1-${MAX_LIMIT} (default ${DEFAULT_LIMIT})
`);
}

// console.log on a pipe is asynchronous. Awaiting the drain keeps large
// payloads intact, because the process must not exit mid-write.
function writeOut(text) {
  return new Promise((resolve, reject) => {
    process.stdout.write(`${text}\n`, (error) => (error ? reject(error) : resolve()));
  });
}

const toJson = (value) => JSON.stringify(value, null, 2);

async function run() {
  const { proxy, limit, positional } = parseArgs(process.argv.slice(2));
  const command = positional[0] || '';

  if (command === '--help' || command === '-h') {
    usage();
    return;
  }

  if (command === '--version' || command === '-v') {
    console.log(`uivs ${version}`);
    return;
  }

  const input = positional[1];
  if (!input) {
    usage();
    process.exitCode = 1;
    return;
  }

  if (command === 'search') {
    const results = await searchPosts(input, { proxy, limit });
    await writeOut(toJson(results));
    return;
  }

  // Reject an unknown language before spending a network request on it.
  const target = command === 'info' || command === 'tags' ? null : resolveTarget(command);
  const post = await fetchPost(input, { proxy });

  if (command === 'info') {
    const { html, css, ...metadata } = post;
    await writeOut(toJson(metadata));
    return;
  }

  if (command === 'tags') {
    await writeOut(toJson(post.tags));
    return;
  }

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
    await writeOut(toJson(summary));
    console.error(`saved ${generated.language} code to ${output}`);
  } else {
    await writeOut(toJson(result));
  }
}

run().catch((error) => {
  console.error(error.message || String(error));
  process.exitCode = 1;
});
