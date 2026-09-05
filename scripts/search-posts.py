#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["curl_cffi>=0.7.0"]
# ///

import argparse
import json
import sys
from urllib.parse import urlencode

# Reserved for "this interpreter cannot import curl_cffi", which is the one
# failure lib/fetch.js retries on a runner able to provision it. Every other
# failure exits 1. Keep both in step.
MISSING_DEPENDENCY_EXIT = 3

try:
    from curl_cffi import requests as cffi_requests
except ModuleNotFoundError:
    print(
        "Missing Python dependency curl_cffi. Run this script through `uv run` to have it\n"
        "provisioned automatically, or install it with: pip install curl_cffi",
        file=sys.stderr,
    )
    raise SystemExit(MISSING_DEPENDENCY_EXIT)


BASE_URL = "https://uiverse.io/elements"
ROUTE_KEY = "routes/$category"
MAX_LIMIT = 100
# Guards against a response that keeps claiming another page while returning
# nothing usable, which would otherwise page forever.
MAX_PAGES = 20


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("query")
    parser.add_argument("--proxy")
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()

    query = str(args.query or "").strip()
    if not query:
        raise SystemExit("Missing search query.")

    limit = max(1, min(args.limit, MAX_LIMIT))
    results = []
    page = 0
    has_next_page = True
    posts_count = 0
    current_page = 0

    options = {"impersonate": "chrome", "timeout": 30}
    if args.proxy:
        options["proxies"] = {"http": args.proxy, "https": args.proxy}

    while has_next_page and len(results) < limit and page < MAX_PAGES:
        params = urlencode({"_data": ROUTE_KEY, "search": query, "page": page})
        response = cffi_requests.get(f"{BASE_URL}?{params}", **options)
        if response.status_code != 200:
            raise SystemExit(f"Uiverse search failed: {response.status_code}")

        try:
            payload = response.json()
        except ValueError:
            raise SystemExit("Uiverse search returned a non-JSON response")

        posts_count = payload.get("postsCount", 0)
        has_next_page = bool(payload.get("hasNextPage"))
        current_page = payload.get("currentPage", page)

        posts = payload.get("posts") or []
        if not posts:
            break

        for post in posts:
            username = (post.get("user") or {}).get("username")
            slug = post.get("friendlyId")
            if not username or not slug:
                continue
            results.append(
                {
                    "username": username,
                    "slug": slug,
                    "url": f"https://uiverse.io/{username}/{slug}",
                    "postId": post.get("id"),
                    "type": post.get("type"),
                    "theme": post.get("theme"),
                    "isTailwind": bool(post.get("isTailwind")),
                }
            )
            if len(results) >= limit:
                break

        page += 1

    print(
        json.dumps(
            {
                "query": query,
                "count": posts_count,
                "results": results[:limit],
                "page": current_page,
                "hasNextPage": has_next_page,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    try:
        main()
    except SystemExit as error:
        if str(error):
            print(str(error), file=sys.stderr)
        sys.exit(error.code if isinstance(error.code, int) else 1)
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
