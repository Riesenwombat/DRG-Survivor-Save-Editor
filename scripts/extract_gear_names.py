import json
import re
import sys
from pathlib import Path


PRINTABLE = re.compile(rb"[ -~]{4,}")
QUIRK = re.compile(rb"(?:LegendaryQuirk|RareQuirk|Quirk)[A-Za-z0-9_]{3,}")


def read_gear_ids(save_path: Path) -> list[str]:
    data = json.loads(save_path.read_text(encoding="utf-8-sig"))
    ids = []
    for item in data.get("GearSaveData", []):
        item_id = item.get("ID")
        if item_id and item_id not in ids:
            ids.append(item_id)
    return ids


def scan_bundle(bundle_path: Path, needles: list[str]) -> dict[str, dict]:
    needle_bytes = {needle: needle.encode("ascii") for needle in needles}
    found = {needle: {"offset": None, "strings": []} for needle in needles}
    chunk_size = 4 * 1024 * 1024
    overlap = 4096
    offset = 0
    tail = b""

    with bundle_path.open("rb") as handle:
        while True:
            chunk = handle.read(chunk_size)
            if not chunk:
                break
            data = tail + chunk
            base = offset - len(tail)

            for needle, raw in needle_bytes.items():
                if found[needle]["offset"] is not None:
                    continue
                index = data.find(raw)
                if index == -1:
                    continue
                absolute = base + index
                start = max(0, index - 8000)
                end = min(len(data), index + len(raw) + 8000)
                window = data[start:end]
                strings = [match.group(0).decode("ascii", errors="ignore") for match in PRINTABLE.finditer(window)]
                quirks = [match.group(0).decode("ascii", errors="ignore") for match in QUIRK.finditer(window)]
                found[needle] = {"offset": absolute, "strings": strings, "quirks": sorted(set(quirks))}

            tail = data[-overlap:]
            offset += len(chunk)

    return found


def pick_name(strings: list[str]) -> str | None:
    candidates = []
    for value in strings:
        cleaned = value.strip("\x00")
        if "_" not in cleaned:
            continue
        if any(prefix in cleaned for prefix in ("WM_", "TA_", "AR_", "TO_", "GR_", "CL_")):
            candidates.append(cleaned)
    return candidates[-1] if candidates else None


def main() -> int:
    if len(sys.argv) != 4:
        print("usage: extract_gear_names.py <save.dat> <bundle> <output.json>", file=sys.stderr)
        return 2

    save_path = Path(sys.argv[1])
    bundle_path = Path(sys.argv[2])
    output_path = Path(sys.argv[3])
    ids = read_gear_ids(save_path)
    result = scan_bundle(bundle_path, ids)

    mapping = {}
    for item_id, data in result.items():
        mapping[item_id] = {
            "internalName": pick_name(data["strings"]),
            "offset": data["offset"],
            "quirks": data.get("quirks", []),
            "strings": data["strings"],
        }

    output_path.write_text(json.dumps(mapping, indent=2), encoding="utf-8")
    print(f"wrote {output_path} with {len(mapping)} gear ids")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
