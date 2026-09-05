import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const BASE_URL = 'https://uiverse.io';
const ALLOWED_HOSTS = new Set(['uiverse.io', 'www.uiverse.io']);
const FETCH_SCRIPT = fileURLToPath(new URL('../scripts/fetch-post.py', import.meta.url));
const SEARCH_SCRIPT = fileURLToPath(new URL('../scripts/search-posts.py', import.meta.url));
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;

// A runner is a command plus the arguments that precede the script path.
// The bare interpreters come first: where curl_cffi is already importable the
// helper runs with no network and no dependency resolution. `uv run` is the
// fallback that reads the PEP 723 header and provisions curl_cffi itself, so
// `npm install -g` still needs no follow-up step on a bare machine.
// `python` covers Windows installs that expose no `python3`.
// An explicitly configured interpreter always wins.
const runnerCandidates = () =>
  [
    process.env.UIVERSE_PYTHON && {
      command: process.env.UIVERSE_PYTHON,
      prefix: [],
    },
    { command: 'python3', prefix: [] },
    { command: 'python', prefix: [] },
    // `uivs` is a global CLI, so it runs in directories it does not control.
    // --no-config keeps a uv.toml there from redirecting the package index, and
    // --no-project keeps a neighbouring pyproject.toml out of the resolution:
    // the helper's own PEP 723 header is the whole dependency spec.
    {
      command: 'uv',
      prefix: ['run', '--no-config', '--no-project'],
      provisions: true,
    },
  ].filter(Boolean);

// The exit code the helper scripts reserve for "curl_cffi is not importable
// here". They print their own explanation and never use it for anything else,
// which makes it the one failure worth retrying on a provisioning runner.
// Keep it in step with MISSING_DEPENDENCY_EXIT in scripts/*.py.
const MISSING_DEPENDENCY_EXIT = 3;

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
  if (error.code === MISSING_DEPENDENCY_EXIT) {
    return 'Missing Python dependency curl_cffi. Install uv and the helper provisions it automatically, or run: pip install curl_cffi';
  }
  return String(error.stderr || '').trim() || error.message || String(error);
}

// Runs a helper script, trying each runner in turn. Two failures fall through
// to the next candidate: a command that is not installed, and an interpreter
// that cannot import curl_cffi while a provisioning runner is still untried.
// Anything else is a helper that ran and failed, so it reports its own error
// rather than being masked by a later candidate.
async function runHelper(script, args) {
  const candidates = runnerCandidates();
  let missingDependency = null;

  for (const [index, { command, prefix }] of candidates.entries()) {
    try {
      const { stdout } = await execFileAsync(command, [...prefix, script, ...args], {
        env: process.env,
        maxBuffer: MAX_OUTPUT_BYTES,
      });
      return stdout;
    } catch (error) {
      if (error.code === 'ENOENT') {
        continue;
      }
      const canProvision = candidates.slice(index + 1).some((next) => next.provisions);
      if (!canProvision || error.code !== MISSING_DEPENDENCY_EXIT) {
        throw new Error(describeFailure(error));
      }
      missingDependency = error;
    }
  }

  // Every candidate fell through. A recorded dependency failure names a real
  // interpreter and a real fix, so it beats the generic "nothing was found".
  if (missingDependency) {
    throw new Error(describeFailure(missingDependency));
  }

  const tried = candidates.map((candidate) => candidate.command).join(', ');
  throw new Error(
    `No Python runner was found (tried ${tried}). Install uv, or set UIVERSE_PYTHON to a Python 3.10+ interpreter that has curl_cffi.`,
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
