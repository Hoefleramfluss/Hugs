#!/usr/bin/env python3
import re
import sys
from pathlib import Path

def main() -> int:
    if len(sys.argv) != 3:
        print("usage: update_csp.py <target_file> <backend_origin>", file=sys.stderr)
        return 1

    target_path = Path(sys.argv[1])
    backend_origin = sys.argv[2]

    content = target_path.read_text(encoding="utf-8")

    pattern = r"(connect-src[^;]*'self')(?![^;]*" + re.escape(backend_origin) + r")(.*?;)"

    def repl(match: re.Match[str]) -> str:
        return f"{match.group(1)} {backend_origin}{match.group(2)}"

    new_content, count = re.subn(pattern, repl, content, count=1, flags=re.DOTALL)

    if count == 0:
        return 1

    target_path.write_text(new_content, encoding="utf-8")
    return 0

if __name__ == "__main__":
    sys.exit(main())
