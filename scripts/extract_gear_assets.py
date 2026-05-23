import argparse
import json
from pathlib import Path

import UnityPy


RARITY_LABELS = {
    0: "Common",
    1: "Uncommon",
    2: "Rare",
    3: "Epic",
    4: "Legendary",
}

STAT_LABELS = {
    0: "Max HP",
    1: "Armor",
    2: "Dodge",
    3: "Move speed",
    4: "Fire rate",
    5: "Critical chance",
    6: "Critical damage",
    7: "Piercing",
    8: "Life regen",
    9: "Pickup radius",
    10: "Status effect damage",
    11: "Damage",
    12: "Mining speed",
    14: "Reload speed",
    15: "Lifetime",
    16: "Clip size",
    17: "Weapon range",
    19: "Explosion radius",
    20: "Luck",
    21: "XP gain",
    23: "Beam count",
    24: "Drone count",
    25: "Turret count",
    26: "Potency",
    100: "Ground zone radius",
    101: "Ground zone damage",
    102: "Ground zone lifetime",
}

EVENT_LABELS = {
    0: "Drop pod exit",
    1: "Drop pod arrived",
    2: "Boss spawned",
    3: "Elite spawned",
    4: "Secondary mission complete",
    5: "Level up",
    6: "Huuli Hoarder death",
    7: "Loot bug death",
    8: "Golden loot bug death",
    9: "Elite death",
}

FLAT_STAT_TYPES = {0, 1, 20, 23, 24, 25}


def load_objects(paths):
    objects = {}
    samples = []
    for path in paths:
        env = UnityPy.load(str(path))
        for obj in env.objects:
            if obj.type.name != "MonoBehaviour":
                continue
            try:
                tree = obj.read_typetree()
            except Exception:
                continue
            objects[obj.path_id] = (obj, tree)
            name = tree.get("m_Name", "")
            if "Gear" in name or "Quirk" in name:
                samples.append({"path_id": obj.path_id, "name": name, "keys": list(tree.keys())})
    return objects, samples


def iter_objects(path):
    env = UnityPy.load(str(path))
    for obj in env.objects:
        if obj.type.name != "MonoBehaviour":
            continue
        try:
            tree = obj.read_typetree()
        except Exception:
            continue
        yield obj, tree


def compact_ref(value):
    if not isinstance(value, dict):
        return value
    return {
        "file_id": value.get("m_FileID"),
        "path_id": value.get("m_PathID"),
    }


def ref_path_id(value):
    if not isinstance(value, dict):
        return None
    return value.get("m_PathID")


def get_guid(tree):
    guid = tree.get("GuidObject")
    if isinstance(guid, dict):
        return guid.get("GuidString")
    for key in ("guid", "Guid", "ID", "id"):
        if tree.get(key):
            return tree[key]
    return None


def is_gear_data(tree):
    return "RareQuirks" in tree and "LegendaryQuirks" in tree


def format_value(value, as_percentage=True):
    if value is None:
        return ""
    if not as_percentage:
        if abs(value - round(value)) < 0.01:
            return f"{value:+.0f}"
        return f"{value:+.1f}"
    percentage = value * 100
    if abs(percentage - round(percentage)) < 0.01:
        return f"{percentage:+.0f}%"
    return f"{percentage:+.1f}%"


def summarize_statmods(statmods):
    result = []
    for statmod in statmods or []:
        stat_type = statmod.get("_statType")
        result.append(
            {
                "stat": stat_type,
                "statName": STAT_LABELS.get(stat_type, f"Stat {stat_type}"),
                "group": statmod.get("modGroup"),
                "id": statmod.get("id"),
                "value": statmod.get("_value"),
            }
        )
    return result


def get_rarity_value(entry, tree):
    if "TimedBuff" in entry and isinstance(entry["TimedBuff"], dict):
        buff = entry["TimedBuff"]
        return {
            "duration": buff.get("Duration"),
            "maxStacks": buff.get("MaxStacks"),
            "statMods": summarize_statmods(buff.get("StatMods", [])),
        }
    if "StatMods" in entry:
        value = {"statMods": summarize_statmods(entry.get("StatMods", []))}
        if "Level" in entry:
            value["level"] = entry.get("Level")
        return value
    if "Float" in entry:
        return {"value": entry.get("Float"), "displayAsPercentage": bool(tree.get("DisplayAsPercentage"))}
    return {}


def summarize_rarities(tree):
    source = tree.get("Rarities") or tree.get("RarityStatMods") or []
    result = []
    for entry in source:
        if isinstance(entry, dict):
            rarity = entry.get("Rarity")
            result.append(
                {
                    "rarity": rarity,
                    "rarityName": RARITY_LABELS.get(rarity, f"Rarity {rarity}"),
                    **get_rarity_value(entry, tree),
                }
            )
        else:
            result.append(
                {
                    "rarity": entry,
                    "rarityName": RARITY_LABELS.get(entry, f"Rarity {entry}"),
                }
            )
    return result


def best_rarity(quirk):
    rarities = quirk.get("rarities", [])
    if not rarities:
        return None
    for rarity in rarities:
        if rarity.get("rarity") == 4:
            return rarity
    return rarities[-1]


def format_stat_summary(rarity):
    if not rarity:
        return ""
    parts = []
    for statmod in rarity.get("statMods", []):
        stat_type = statmod.get("stat")
        parts.append(
            f"{format_value(statmod.get('value'), stat_type not in FLAT_STAT_TYPES)} {statmod.get('statName')}".strip()
        )
    if rarity.get("value") is not None:
        parts.append(format_value(rarity.get("value"), rarity.get("displayAsPercentage", True)))
    if rarity.get("duration"):
        parts.append(f"{rarity['duration']:g}s")
    return ", ".join(parts)


def infer_kind(name):
    if name.startswith("QuirkTimedBuffEvent"):
        return "Timed event buff"
    if name.startswith("QuirkOneTimeEvent"):
        return "One-time event"
    if name.startswith("QuirkUpgradeStatMod"):
        return "Upgrade stat mod"
    if name.startswith("QuirkStatPer"):
        return "Scaling stat mod"
    if name.startswith("QuirkStat"):
        return "Stat mod"
    if name.startswith("LegendaryQuirk"):
        return "Legendary quirk"
    return "Quirk"


def summarize_quirk(ref, objects):
    path_id = ref_path_id(ref)
    if path_id not in objects:
        return {"path_id": path_id, "name": "Missing quirk"}
    obj, tree = objects[path_id]
    name = tree.get("m_Name", "")
    event = tree.get("Event")
    quirk = {
        "path_id": obj.path_id,
        "name": name,
        "refName": tree.get("RefName", ""),
        "guid": get_guid(tree),
        "kind": infer_kind(name),
        "event": event,
        "eventName": EVENT_LABELS.get(event) if event is not None else None,
        "rarities": summarize_rarities(tree),
    }
    summary = format_stat_summary(best_rarity(quirk))
    bits = []
    if quirk["eventName"]:
        bits.append(quirk["eventName"])
    if summary:
        bits.append(summary)
    quirk["label"] = ": ".join(bits) if bits else name
    return quirk


def summarize_gear(obj, tree, objects):
    return {
        "path_id": obj.path_id,
        "name": tree.get("m_Name", ""),
        "refName": tree.get("RefName", ""),
        "guid": get_guid(tree),
        "slot": tree.get("SlotType"),
        "rare_quirks": [compact_ref(ref) for ref in tree.get("RareQuirks", [])],
        "legendary_quirks": [compact_ref(ref) for ref in tree.get("LegendaryQuirks", [])],
        "rareQuirks": [summarize_quirk(ref, objects) for ref in tree.get("RareQuirks", [])],
        "legendaryQuirks": [summarize_quirk(ref, objects) for ref in tree.get("LegendaryQuirks", [])],
    }


def make_web_data(gears):
    names = {}
    observed = {}
    for gear in gears:
        guid = gear.get("guid")
        if not guid:
            continue
        names[guid] = gear.get("refName") or gear.get("name")
        observed[guid] = {
            "RQ": {str(index): quirk.get("label") for index, quirk in enumerate(gear.get("rareQuirks", []))},
            "LQ": {str(index): quirk.get("label") for index, quirk in enumerate(gear.get("legendaryQuirks", []))},
        }
    quirk_names = sorted(
        {
            quirk.get("name")
            for gear in gears
            for quirk in [*gear.get("rareQuirks", []), *gear.get("legendaryQuirks", [])]
            if quirk.get("name")
        }
    )
    return {"names": names, "observedQuirks": observed, "discoveredQuirkNames": quirk_names, "gears": gears}


def main():
    parser = argparse.ArgumentParser(description="Extract DRG Survivor gear ScriptableObject data from Unity assets.")
    parser.add_argument("paths", nargs="+", type=Path)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--js-out", type=Path)
    parser.add_argument("--sample", action="store_true")
    args = parser.parse_args()

    objects, samples = load_objects(args.paths)
    gears = [
        summarize_gear(obj, tree, objects)
        for obj, tree in objects.values()
        if is_gear_data(tree)
    ]
    web_data = make_web_data(gears)

    result = {
        "gear_count": len(gears),
        "gears": gears,
        "samples": samples[:100] if args.sample else [],
    }

    text = json.dumps(result, indent=2, ensure_ascii=False)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text, encoding="utf-8")
    else:
        print(text)

    if args.js_out:
        args.js_out.write_text(
            "window.DRG_GEAR_DATA = "
            + json.dumps(web_data, indent=2, ensure_ascii=False)
            + ";\n",
            encoding="utf-8",
        )


if __name__ == "__main__":
    main()
