#!/usr/bin/env python3
"""Install the newest npm package version satisfying bun's minimumReleaseAge."""
import argparse, json, subprocess, sys, time, datetime, pathlib


def get_min_release_age():
    bunfig = pathlib.Path.home() / ".bunfig.toml"
    if not bunfig.exists():
        return None
    for line in bunfig.read_text().splitlines():
        stripped = line.strip()
        if stripped.startswith("minimumReleaseAge") and "=" in stripped:
            val = stripped.split("=", 1)[1].strip()
            return int(val) if val.isdigit() else None
    return None


def get_package_versions(pkg):
    result = subprocess.run(
        ["npm", "view", pkg, "time", "--json"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"Error querying {pkg}: {result.stderr}", file=sys.stderr)
        sys.exit(1)
    data = json.loads(result.stdout)
    versions = [(v, t) for v, t in data.items() if t != "unpublished"]
    versions.sort(key=lambda x: x[1])
    return versions


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package", help="npm package name")
    parser.add_argument("--pm", default="bun", choices=["bun", "pnpm"],
                        help="package manager to install with")
    args = parser.parse_args()

    min_age = get_min_release_age()
    if min_age is None:
        subprocess.run([args.pm, "install", "-g", args.package])
        sys.exit(0)

    cutoff = time.time() - min_age
    versions = get_package_versions(args.package)

    latest_valid = None
    for v, t in versions:
        ts = datetime.datetime.fromisoformat(t.replace("Z", "+00:00")).timestamp()
        if ts < cutoff:
            latest_valid = v

    if not latest_valid:
        print(f"No version of {args.package} satisfies the {min_age}s minimum", file=sys.stderr)
        sys.exit(1)

    ts_latest = datetime.datetime.fromisoformat(
        next(t for v, t in versions if v == latest_valid).replace("Z", "+00:00")
    )
    target = f"{args.package}@{latest_valid}"
    print(f"Installing {target} (published {ts_latest.strftime('%Y-%m-%d')}, satisfies {min_age}s min age)")
    subprocess.run([args.pm, "install", "-g", target])
