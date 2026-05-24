import argparse
import json
from pathlib import Path

import UnityPy


def get_guid(tree):
    guid = tree.get("GuidObject")
    if isinstance(guid, dict):
        return guid.get("GuidString")
    return None


def ref_path_id(value):
    if isinstance(value, dict):
        return value.get("m_PathID")
    return None


def read_objects(paths):
    objects = {}
    for path in paths:
        env = UnityPy.load(str(path))
        for obj in env.objects:
            if obj.type.name != "MonoBehaviour":
                continue
            try:
                tree = obj.read_typetree()
            except Exception:
                continue
            objects[obj.path_id] = tree
    return objects


def local_variable(tree, name):
    refs = tree.get("references", {}).get("RefIds", [])
    wanted_rids = {
        variable.get("variable", {}).get("rid")
        for variable in tree.get("locTitle", {}).get("m_LocalVariables", [])
        if variable.get("name") == name
    }
    for ref in refs:
        if ref.get("rid") in wanted_rids:
            return ref.get("data", {}).get("m_Value")
    return None


def extract_weapons(objects):
    weapons_by_path = {}
    for path_id, tree in objects.items():
        if "MasteryStatMods" not in tree or "StatsToShow" not in tree:
            continue
        guid = get_guid(tree)
        name = tree.get("RefName") or local_variable(tree, "weaponName") or tree.get("m_Name")
        if not guid or not name:
            continue
        weapons_by_path[path_id] = {
            "path_id": path_id,
            "guid": guid,
            "name": name.strip('"'),
        }
    return weapons_by_path


def extract_class_mods(objects):
    class_mods_by_path = {}
    for path_id, tree in objects.items():
        if "MasteryStatMod" not in tree or "PossibleClasses" not in tree:
            continue
        guid = get_guid(tree)
        name = tree.get("RefName") or tree.get("m_Name")
        if not guid or not name:
            continue
        class_mods_by_path[path_id] = {
            "path_id": path_id,
            "guid": guid,
            "name": str(name).strip('"'),
            "classType": tree.get("DefaultClass"),
        }
    return class_mods_by_path


def extract_weapon_challenges(objects, weapons_by_path):
    challenges = []
    for path_id, tree in objects.items():
        if tree.get("ChallengeType") != 6:
            continue
        weapon = weapons_by_path.get(ref_path_id(tree.get("StarterWeapon")))
        guid = get_guid(tree)
        if not guid:
            continue
        title = local_variable(tree, "weaponName") or tree.get("RefName") or tree.get("m_Name")
        challenges.append(
            {
                "path_id": path_id,
                "guid": guid,
                "name": str(title).strip('"'),
                "refName": tree.get("RefName") or tree.get("m_Name"),
                "weaponGuid": weapon.get("guid") if weapon else None,
                "weaponName": weapon.get("name") if weapon else None,
                "minHazIndex": tree.get("MinHazIndex"),
                "unlockLevels": tree.get("WeaponUnlockLevels", []),
            }
        )
    return sorted(challenges, key=lambda entry: (entry.get("weaponName") or "", entry["name"]))


def extract_class_mod_challenges(objects, class_mods_by_path):
    challenges = []
    for path_id, tree in objects.items():
        if tree.get("ChallengeType") != 7:
            continue
        class_mod = class_mods_by_path.get(ref_path_id(tree.get("FixedClassMod")))
        guid = get_guid(tree)
        if not guid:
            continue
        title = local_variable(tree, "classModName") or tree.get("RefName") or tree.get("m_Name")
        challenges.append(
            {
                "path_id": path_id,
                "guid": guid,
                "name": str(title).strip('"'),
                "refName": tree.get("RefName") or tree.get("m_Name"),
                "classModGuid": class_mod.get("guid") if class_mod else None,
                "classModName": class_mod.get("name") if class_mod else None,
                "classType": class_mod.get("classType") if class_mod else None,
                "minHazIndex": tree.get("MinHazIndex"),
            }
        )
    return sorted(challenges, key=lambda entry: (entry.get("classModName") or "", entry["name"]))


def make_web_data(weapons_by_path, weapon_challenges, class_mods_by_path, class_mod_challenges):
    challenge_weapon_guids = {
        challenge.get("weaponGuid") for challenge in weapon_challenges if challenge.get("weaponGuid")
    }
    weapons = sorted(
        [weapon for weapon in weapons_by_path.values() if weapon["guid"] in challenge_weapon_guids],
        key=lambda weapon: weapon["name"],
    )
    challenges_by_weapon = {}
    for challenge in weapon_challenges:
        weapon_guid = challenge.get("weaponGuid") or ""
        challenges_by_weapon.setdefault(weapon_guid, []).append(challenge)

    challenge_class_mod_guids = {
        challenge.get("classModGuid") for challenge in class_mod_challenges if challenge.get("classModGuid")
    }
    class_mods = sorted(
        [class_mod for class_mod in class_mods_by_path.values() if class_mod["guid"] in challenge_class_mod_guids],
        key=lambda class_mod: (class_mod.get("classType") or 0, class_mod["name"]),
    )
    challenges_by_class_mod = {}
    for challenge in class_mod_challenges:
        class_mod_guid = challenge.get("classModGuid") or ""
        challenges_by_class_mod.setdefault(class_mod_guid, []).append(challenge)

    return {
        "weapons": weapons,
        "weaponNames": {weapon["guid"]: weapon["name"] for weapon in weapons},
        "weaponMasteryChallenges": weapon_challenges,
        "challengesByWeapon": challenges_by_weapon,
        "classMods": class_mods,
        "classModNames": {class_mod["guid"]: class_mod["name"] for class_mod in class_mods},
        "classModMasteryChallenges": class_mod_challenges,
        "challengesByClassMod": challenges_by_class_mod,
    }


def main():
    parser = argparse.ArgumentParser(description="Extract DRG Survivor weapon mastery data from Unity assets.")
    parser.add_argument("paths", nargs="+", type=Path)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--js-out", type=Path)
    args = parser.parse_args()

    objects = read_objects(args.paths)
    weapons_by_path = extract_weapons(objects)
    class_mods_by_path = extract_class_mods(objects)
    weapon_challenges = extract_weapon_challenges(objects, weapons_by_path)
    class_mod_challenges = extract_class_mod_challenges(objects, class_mods_by_path)
    result = make_web_data(weapons_by_path, weapon_challenges, class_mods_by_path, class_mod_challenges)

    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    else:
        print(json.dumps(result, indent=2, ensure_ascii=False))

    if args.js_out:
        args.js_out.write_text(
            "window.DRG_MASTERY_DATA = "
            + json.dumps(result, indent=2, ensure_ascii=False)
            + ";\n",
            encoding="utf-8",
        )


if __name__ == "__main__":
    main()
