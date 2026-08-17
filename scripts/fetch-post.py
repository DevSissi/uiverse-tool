#!/usr/bin/env python3

import argparse
import json
import sys
from urllib.parse import urlparse

try:
    from curl_cffi import requests as cffi_requests
except ModuleNotFoundError:
    raise SystemExit(
        "Missing Python dependency curl_cffi. Install it with: pip install curl_cffi"
    )


BASE_URL = "https://uiverse.io"
ROUTE_KEY = "routes/$username.$friendlyId"
ALLOWED_HOSTS = ("uiverse.io", "www.uiverse.io")


def trim_segment(value):
    return str(value or "").strip().strip("/")


def parse_input(raw):
    value = str(raw or "").strip()
    if not value:
        raise SystemExit("Missing Uiverse input.")

    pathname = value
    if value.startswith(("http://", "https://")):
        parsed = urlparse(value)
        if parsed.hostname not in ALLOWED_HOSTS:
            raise SystemExit(f"Unsupported host: {parsed.hostname}")
        pathname = parsed.path

    segments = [s for s in trim_segment(pathname).split("/") if s]
    if len(segments) != 2:
        raise SystemExit(f"Expected author/slug from input: {raw}")

    username, slug = segments
    return username, slug


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("--proxy")
    args = parser.parse_args()

    username, slug = parse_input(args.input)
    url = f"{BASE_URL}/{username}/{slug}"
    data_url = f"{url}?_data={ROUTE_KEY}"
    options = {"impersonate": "chrome", "timeout": 30}
    if args.proxy:
        options["proxies"] = {"http": args.proxy, "https": args.proxy}

    response = cffi_requests.get(data_url, **options)
    if response.status_code != 200:
        raise SystemExit(f"Uiverse request failed: {response.status_code}")

    try:
        payload = response.json()
    except ValueError:
        raise SystemExit(f"Uiverse returned a non-JSON response for {url}")

    post = payload.get("post") or {}
    if not post.get("id"):
        raise SystemExit(f"Could not resolve post data from {url}")

    result = {
        "username": username,
        "slug": slug,
        "url": url,
        "postId": post["id"],
        "type": post.get("type"),
        "isTailwind": bool(post.get("isTailwind")),
        "title": post.get("title"),
        "description": post.get("description"),
        "author": (post.get("user") or {}).get("username"),
        "tags": [
            item.get("tag", {}).get("value")
            for item in (post.get("post_tag") or [])
            if item.get("tag", {}).get("value")
        ],
        "html": post.get("html") or "",
        "css": post.get("css") or "",
    }
    print(json.dumps(result, ensure_ascii=False))


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
