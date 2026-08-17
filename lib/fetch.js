import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const BASE_URL = 'https://uiverse.io';
const ALLOWED_HOSTS = new Set(['uiverse.io', 'www.uiverse.io']);
const FETCH_SCRIPT = fileURLToPath(new URL('../scripts/fetch-post.py', import.meta.url));
const SEARCH_SCRIPT = fileURLToPath(new URL('../scripts/search-posts.py', import.meta.url));
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;

// `python3` is the norm, but Windows installs often expose only `python`.
// An explicitly configured interpreter always wins.
const pythonCandidates = () =>
  [process.env.UIVERSE_PYTHON, 'python3', 'python'].filter(Boolean);

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
    if (!ALLOWED_HOSTS.has(host)) {
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

function describeFailure(error) {
  const stderr = String(error.stderr || '').trim();
  if (/ModuleNotFoundError.*curl_cffi/s.test(stderr)) {
    return 'Missing Python dependency curl_cffi. Install it with: pip install curl_cffi';
  }
  return stderr || error.message || String(error);
}

// Runs a helper script, trying each interpreter until one exists. Only a
// missing interpreter falls through; a script that runs and fails reports
// its own error.
async function runHelper(script, args) {
  const candidates = pythonCandidates();

  for (const python of candidates) {
    try {
      const { stdout } = await execFileAsync(python, [script, ...args], {
        env: process.env,
        maxBuffer: MAX_OUTPUT_BYTES,
      });
      return stdout;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw new Error(describeFailure(error));
      }
    }
  }

  throw new Error(
    `Python 3.10+ is required but was not found (tried ${candidates.join(', ')}). Set UIVERSE_PYTHON to override.`,
  );
}

async function runJsonHelper(script, args, label) {
  const stdout = await runHelper(script, args);
  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error(`Uiverse ${label} helper returned invalid JSON.`);
  }
}

function proxyArgs(proxy) {
  const proxyUrl = proxy || resolveProxy();
  return proxyUrl ? ['--proxy', proxyUrl] : [];
}

export async function fetchPost(input, { proxy } = {}) {
  const detail = parseInput(input);
  const post = await runJsonHelper(
    FETCH_SCRIPT,
    [detail.url, ...proxyArgs(proxy)],
    'fetch',
  );
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
  return runJsonHelper(
    SEARCH_SCRIPT,
    [value, '--limit', String(limit), ...proxyArgs(proxy)],
    'search',
  );
}
