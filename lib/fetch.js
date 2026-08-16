import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const BASE_URL = 'https://uiverse.io';
const ROUTE_KEY = 'routes/$username.$friendlyId';
const FETCH_SCRIPT = fileURLToPath(new URL('../scripts/fetch-post.py', import.meta.url));
const SEARCH_SCRIPT = fileURLToPath(new URL('../scripts/search-posts.py', import.meta.url));

function trimSegment(value) {
  return String(value || '').trim().replace(/^\/+|\/+$/g, '');
}

export function parseInput(raw) {
  const value = String(raw || '').trim();
  if (!value) {
    throw new Error('Missing Uiverse input.');
  }

  let pathname = value;
  const urlMatch = value.match(/^https?:\/\/([^/]+)(\/.*)?$/i);
  if (urlMatch) {
    const host = urlMatch[1].toLowerCase();
    if (host !== 'uiverse.io' && host !== 'www.uiverse.io') {
      throw new Error(`Unsupported host: ${host}`);
    }
    pathname = urlMatch[2] || '/';
  }

  const segments = trimSegment(pathname).split('/').filter(Boolean);
  if (segments.length !== 2) {
    throw new Error(`Expected author/slug from input: ${raw}`);
  }

  const [username, slug] = segments;
  return {
    username,
    slug,
    url: `${BASE_URL}/${username}/${slug}`,
  };
}

export function resolveProxy() {
  const candidates = [
    process.env.UIVERSE_PROXY,
    process.env.HTTPS_PROXY,
    process.env.https_proxy,
    process.env.HTTP_PROXY,
    process.env.http_proxy,
  ];
  return candidates.find(Boolean) || '';
}

export async function fetchPost(input, { proxy } = {}) {
  const detail = parseInput(input);
  const proxyUrl = proxy || resolveProxy();
  const args = [FETCH_SCRIPT, detail.url];
  if (proxyUrl) {
    args.push('--proxy', proxyUrl);
  }

  let stdout;
  try {
    const result = await execFileAsync('python3', args, {
      env: process.env,
      maxBuffer: 16 * 1024 * 1024,
    });
    stdout = result.stdout;
  } catch (error) {
    throw new Error(error.stderr?.trim() || error.message || String(error));
  }

  let post;
  try {
    post = JSON.parse(stdout);
  } catch {
    throw new Error('Uiverse fetch helper returned invalid JSON.');
  }
  if (!post?.postId) {
    throw new Error(`Could not resolve post data from ${detail.url}`);
  }
  return post;
}

export async function searchPosts(query, { proxy, limit = 10 } = {}) {
  const value = String(query || '').trim();
  if (!value) {
    throw new Error('Missing search query.');
  }

  const proxyUrl = proxy || resolveProxy();
  const args = [SEARCH_SCRIPT, value, '--limit', String(limit)];
  if (proxyUrl) {
    args.push('--proxy', proxyUrl);
  }

  let stdout;
  try {
    const result = await execFileAsync('python3', args, {
      env: process.env,
      maxBuffer: 16 * 1024 * 1024,
    });
    stdout = result.stdout;
  } catch (error) {
    throw new Error(error.stderr?.trim() || error.message || String(error));
  }

  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error('Uiverse search helper returned invalid JSON.');
  }
}
