#!/usr/bin/env python3
"""
scripts/download_panoramas.py
Tool to download high-resolution indoor 360 panorama samples from the 100-panorama catalog.
Usage:
  python scripts/download_panoramas.py --count 5 --category living_room
  python scripts/download_panoramas.py --all
  python scripts/download_panoramas.py --list
"""
import argparse
import json
import os
import sys
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CATALOG_200 = os.path.join(SCRIPT_DIR, "indoor_panoramas_200.json")
DEFAULT_CATALOG_100 = os.path.join(SCRIPT_DIR, "indoor_panoramas_100.json")
CATALOG_PATH = DEFAULT_CATALOG_200 if os.path.exists(DEFAULT_CATALOG_200) else DEFAULT_CATALOG_100
DEFAULT_OUT_DIR = os.path.join(SCRIPT_DIR, "downloaded_panoramas")

def load_catalog(custom_path=None):
    path = custom_path or CATALOG_PATH
    if not os.path.exists(path):
        print(f"Error: Catalog not found at {path}")
        sys.exit(1)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def list_panoramas(catalog):
    print("=" * 80)
    print(f"  {catalog.get('title')} ({catalog.get('total_rooms')} rooms)")
    print("=" * 80)
    categories = catalog.get("categories", {})
    for cat, count in categories.items():
        print(f"  • {cat.replace('_', ' ').title():<28}: {count} rooms")
    print("-" * 80)
    print(f"{'#':<4} {'ID':<28} {'Category':<22} {'Name'}")
    print("-" * 80)
    for idx, r in enumerate(catalog.get("rooms", []), 1):
        print(f"{idx:<4} {r['id']:<28} {r['archetype']:<22} {r['name']}")

def download_images(catalog, category=None, count=5, out_dir=DEFAULT_OUT_DIR, download_all=False):
    rooms = catalog.get("rooms", [])
    if category:
        rooms = [r for r in rooms if r["archetype"] == category or category in r["tags"]]
    
    if not download_all and count:
        rooms = rooms[:count]
    
    os.makedirs(out_dir, exist_ok=True)
    print(f"Downloading {len(rooms)} panoramas to '{out_dir}'...")

    for i, r in enumerate(rooms, 1):
        url = r["panorama_url"]
        filename = f"{r['archetype']}_{r['id']}.jpg"
        target_path = os.path.join(out_dir, filename)

        if os.path.exists(target_path):
            print(f"[{i}/{len(rooms)}] Already exists: {filename}")
            continue

        print(f"[{i}/{len(rooms)}] Downloading {r['name']} ({r['archetype']})...")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "MemoryWeaver/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp, open(target_path, "wb") as out:
                out.write(resp.read())
            print(f"    [OK] Saved -> {filename}")
        except Exception as e:
            print(f"    [ERROR] Failed ({url}): {e}")

    print("\nDownload batch finished.")

def main():
    parser = argparse.ArgumentParser(description="Download indoor 360 panorama samples.")
    parser.add_argument("--catalog", type=str, default=None, help="Path to custom catalog JSON (default: indoor_panoramas_200.json)")
    parser.add_argument("--list", action="store_true", help="List all available panoramas in the catalog")
    parser.add_argument("--all", action="store_true", help="Download all panoramas in the catalog")
    parser.add_argument("--count", type=int, default=5, help="Number of panoramas to download (default: 5)")
    parser.add_argument("--category", type=str, choices=["living_room", "bedroom", "dining_kitchen", "office_study", "hospitality_gallery", "studio_workshop"], help="Filter by room category")
    parser.add_argument("--output", type=str, default=DEFAULT_OUT_DIR, help="Output directory")
    args = parser.parse_args()

    catalog = load_catalog(args.catalog)

    if args.list:
        list_panoramas(catalog)
        return

    download_images(catalog, category=args.category, count=args.count, out_dir=args.output, download_all=args.all)

if __name__ == "__main__":
    main()
