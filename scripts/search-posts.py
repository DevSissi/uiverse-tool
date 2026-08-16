#!/usr/bin/env python3

import argparse
import json
import sys
from urllib.parse import urlencode

from curl_cffi import requests as cffi_requests


BASE_URL = "https://uiverse.io/elements"
ROUTE_KEY = "routes/$category"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("query")
    parser.add_argument("--proxy")
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()

    query = str(args.query or "").strip()
    if not query:
        raise SystemExit("Missing search query.")

    limit = max(1, min(args.limit, 100))
    results = []
    page = 0
    has_next_page = True
    posts_count = 0
    current_page = 0

    options = {"impersonate": "chrome", "timeout": 30}
    if args.proxy:
        options["proxies"] = {"http": args.proxy, "https": args.proxy}

    while has_next_page and len(results) < limit:
        params = urlencode({"_data": ROUTE_KEY, "search": query, "page": page})
        response = cffi_requests.get(f"{BASE_URL}?{params}", **options)
        if response.status_code != 200:
            raise SystemExit(f"Uiverse search failed: {response.status_code}")

        payload = response.json()
        posts_count = payload.get("postsCount", 0)
        has_next_page = bool(payload.get("hasNextPage"))
        current_page = payload.get("currentPage", page)

        for post in payload.get("posts") or []:
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
