"""Extract short, typeable Python functions from a TheAlgorithms/Python checkout.

Usage: python3 scripts/content/extract_snippets.py [repo_dir] [out_json]
Defaults: .cache/TheAlgorithms -> .cache/snippets.raw.json
Only the standard library is used.
"""
import ast
import json
import os
import re
import sys

REPO_URL = "https://github.com/TheAlgorithms/Python/blob/master/"
MIN_LINES, MAX_LINES, MAX_WIDTH = 8, 40, 88
PER_FILE = 2


def _docstring_first_line(node):
    body = getattr(node, "body", [])
    if not body:
        return None
    first = body[0]
    if isinstance(first, ast.Expr) and isinstance(first.value, ast.Constant) and isinstance(first.value.value, str):
        lines = [l.strip() for l in first.value.value.strip().splitlines() if l.strip()]
        summary = lines[0] if lines else ""
        if summary.startswith((">>>", "...")):
            summary = ""  # a doctest is not a description
        return first, summary
    return None


def _clean(lines):
    out = []
    for line in lines:
        line = line.rstrip()
        if not line and out and not out[-1]:
            continue
        out.append(line)
    while out and not out[-1]:
        out.pop()
    return out


def _acceptable(lines):
    if not MIN_LINES <= len(lines) <= MAX_LINES:
        return False
    for line in lines:
        if "\t" in line or len(line) > MAX_WIDTH or not line.isascii():
            return False
        if line.count('"""') % 2 or line.count("'''") % 2:
            return False  # multi-line triple-quoted strings are not typeable line by line
        indent = len(line) - len(line.lstrip(" "))
        if line.strip() and indent % 4:
            return False
    return True


def extract_from_source(src, path):
    try:
        tree = ast.parse(src)
    except (SyntaxError, ValueError):
        return []
    src_lines = src.splitlines()
    found = []
    for node in tree.body:
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            continue
        start = min([node.lineno] + [d.lineno for d in node.decorator_list]) - 1
        end = node.end_lineno
        lines = src_lines[start:end]
        doc = _docstring_first_line(node)
        if doc:
            expr, first = doc
            d0, d1 = expr.lineno - 1 - start, expr.end_lineno - start
            indent = " " * expr.col_offset
            summary = first.replace('"""', "'''")
            replacement = [f'{indent}"""{summary}"""'] if summary else []
            lines = lines[:d0] + replacement + lines[d1:]
        lines = _clean(lines)
        if not _acceptable(lines):
            continue
        found.append({
            "id": f"{path}#{node.name}",
            "path": path,
            "url": REPO_URL + path,
            "code": "\n".join(lines),
        })
        if len(found) >= PER_FILE:
            break
    return found


def main():
    repo = sys.argv[1] if len(sys.argv) > 1 else ".cache/TheAlgorithms"
    out = sys.argv[2] if len(sys.argv) > 2 else ".cache/snippets.raw.json"
    snippets, seen = [], set()
    for root, dirs, files in os.walk(repo):
        dirs[:] = sorted(d for d in dirs if not d.startswith(".") and d not in {"scripts", "web_programming"})
        for name in sorted(files):
            if not name.endswith(".py") or name.startswith("test_") or name == "__init__.py":
                continue
            full = os.path.join(root, name)
            rel = os.path.relpath(full, repo).replace(os.sep, "/")
            with open(full, encoding="utf-8", errors="replace") as fh:
                src = fh.read()
            for snip in extract_from_source(src, rel):
                key = re.sub(r"\s+", "", snip["code"])
                if key not in seen:
                    seen.add(key)
                    snippets.append(snip)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(snippets, fh, ensure_ascii=False, indent=1)
    print(f"{len(snippets)} snippets -> {out}")


if __name__ == "__main__":
    main()
