const fileInput = document.querySelector("#fileInput");
const downloadButton = document.querySelector("#downloadButton");
const fileName = document.querySelector("#fileName");
const entryCount = document.querySelector("#entryCount");
const statusText = document.querySelector("#statusText");
const searchInput = document.querySelector("#searchInput");
const quickButtons = document.querySelectorAll(".quick-buttons button");
const selectedPath = document.querySelector("#selectedPath");
const valueType = document.querySelector("#valueType");
const valueEditor = document.querySelector("#valueEditor");
const applyButton = document.querySelector("#applyButton");
const expandButton = document.querySelector("#expandButton");
const emptyState = document.querySelector("#emptyState");
const dashboard = document.querySelector("#dashboard");
const saveInfo = document.querySelector("#saveInfo");
const resourceGrid = document.querySelector("#resourceGrid");
const classGrid = document.querySelector("#classGrid");
const metaGrid = document.querySelector("#metaGrid");
const masteryEditor = document.querySelector("#masteryEditor");
const classMasteryEditor = document.querySelector("#classMasteryEditor");
const itemSummary = document.querySelector("#itemSummary");
const itemCreator = document.querySelector("#itemCreator");
const itemTable = document.querySelector("#itemTable");
const maxResourcesButton = document.querySelector("#maxResourcesButton");
const maxMetaButton = document.querySelector("#maxMetaButton");
const legendaryItemsButton = document.querySelector("#legendaryItemsButton");
const maxItemsButton = document.querySelector("#maxItemsButton");
const itemScopeFilter = document.querySelector("#itemScopeFilter");
const itemRarityFilter = document.querySelector("#itemRarityFilter");
const tree = document.querySelector("#tree");

let saveData = null;
let originalName = "drg-survivor-save.dat";
let selected = null;
let allExpanded = false;
const itemCreatorState = {
  id: "",
  slot: "all",
  rarity: 4,
  level: 100,
  upgrades: 3,
  stats: [],
  rareQuirk: 0,
  legendaryQuirk: 0,
  isNew: true,
  favorite: false,
};

const resourceFields = ["Credits", "Bismor", "Croppa", "EnorPearl", "Jadiz", "Magnite", "Umanite", "PowerCore"];
const rarityLabels = {
  0: "Common",
  1: "Uncommon",
  2: "Rare",
  3: "Epic",
  4: "Legendary",
};
const gearSlotLabels = {
  0: "Tool",
  1: "Armor",
  2: "Grinder",
  3: "Weapon Mod",
  4: "Tank",
  5: "Companion",
};
const statLabels = {
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
  13: "Stat 13",
  14: "Reload speed",
  15: "Lifetime",
  16: "Clip size",
  17: "Weapon range",
  18: "Stat 18",
  19: "Explosion radius",
  20: "Luck",
  21: "XP gain",
  22: "Stat 22",
  23: "Beam count",
  24: "Drone count",
  25: "Turret count",
  26: "Potency",
  100: "Ground zone radius",
  101: "Ground zone damage",
  102: "Ground zone lifetime",
};
const traitLabels = {
  0: "Index 0",
  1: "Index 1",
  2: "Index 2",
  3: "Index 3",
  4: "Index 4",
  5: "Index 5",
  6: "Index 6",
  7: "Index 7",
  8: "Index 8",
  9: "Index 9",
  10: "Index 10",
};
const traitFieldLabels = {
  RQ: "Rare quirk",
  LQ: "Legendary quirk",
};
const signLabels = {
  "-1": "Negative",
  0: "Neutral",
  1: "Positive",
};
const gearData = window.DRG_GEAR_DATA ?? { names: {}, observedQuirks: {}, discoveredQuirkNames: [] };
const masteryData = window.DRG_MASTERY_DATA ?? {
  weapons: [],
  challengesByWeapon: {},
  weaponMasteryChallenges: [],
  classMods: [],
  challengesByClassMod: {},
  classModMasteryChallenges: [],
};
const masteryEditorState = {
  weaponGuid: "",
  challengeGuid: "",
};
const classMasteryEditorState = {
  classModGuid: "",
  challengeGuid: "",
};

fileInput.addEventListener("change", handleFileSelect);
downloadButton.addEventListener("click", downloadSave);
searchInput.addEventListener("input", renderTree);
applyButton.addEventListener("click", applySelectedValue);
expandButton.addEventListener("click", toggleExpandAll);
maxResourcesButton.addEventListener("click", setHighResources);
maxMetaButton.addEventListener("click", maxMetaUpgrades);
legendaryItemsButton.addEventListener("click", makeAllItemsLegendary);
maxItemsButton.addEventListener("click", maxItemLevels);
itemScopeFilter.addEventListener("change", renderDashboard);
itemRarityFilter.addEventListener("change", renderDashboard);

resourceGrid.addEventListener("change", handleNumberFieldChange);
classGrid.addEventListener("change", handleClassFieldChange);
metaGrid.addEventListener("change", handleMetaFieldChange);
masteryEditor.addEventListener("change", handleMasteryEditorChange);
masteryEditor.addEventListener("click", handleMasteryEditorClick);
classMasteryEditor.addEventListener("change", handleClassMasteryEditorChange);
classMasteryEditor.addEventListener("click", handleClassMasteryEditorClick);
itemTable.addEventListener("change", handleItemFieldChange);
itemCreator.addEventListener("change", handleItemCreatorChange);
itemCreator.addEventListener("click", handleItemCreatorClick);

quickButtons.forEach((button) => {
  button.addEventListener("click", () => {
    searchInput.value = button.dataset.query;
    renderTree();
  });
});

async function handleFileSelect(event) {
  const [file] = event.target.files;
  if (!file) return;

  try {
    const text = await file.text();
    saveData = JSON.parse(text);
    originalName = file.name;
    selected = null;
    allExpanded = false;
    fileName.textContent = file.name;
    statusText.textContent = "Geladen";
    entryCount.textContent = countLeaves(saveData).toLocaleString("de-DE");
    setControlsEnabled(true);
    renderDashboard();
    renderTree();
  } catch (error) {
    saveData = null;
    setControlsEnabled(false);
    dashboard.hidden = true;
    tree.hidden = true;
    emptyState.hidden = false;
    statusText.innerHTML = `<span class="error">Konnte JSON nicht lesen</span>`;
    console.error(error);
  }
}

function setControlsEnabled(enabled) {
  downloadButton.disabled = !enabled;
  searchInput.disabled = !enabled;
  expandButton.disabled = !enabled;
  quickButtons.forEach((button) => {
    button.disabled = !enabled;
  });
  setValueEditorEnabled(Boolean(enabled && selected));
}

function setValueEditorEnabled(enabled) {
  valueType.disabled = !enabled;
  valueEditor.disabled = !enabled;
  applyButton.disabled = !enabled;
}

function renderTree() {
  if (!saveData) return;

  tree.innerHTML = "";
  tree.hidden = false;
  emptyState.hidden = true;
  dashboard.hidden = false;

  const query = searchInput.value.trim().toLowerCase();
  const fragment = document.createDocumentFragment();
  renderNode({
    parent: fragment,
    key: "root",
    value: saveData,
    path: [],
    query,
    depth: 0,
  });
  tree.append(fragment);
}

function renderDashboard() {
  if (!saveData) return;
  dashboard.hidden = false;
  emptyState.hidden = true;
  renderResources();
  renderSaveInfo();
  renderClasses();
  renderMetaUpgrades();
  renderMasteryEditor();
  renderClassMasteryEditor();
  renderItems();
}

function renderSaveInfo() {
  const timestamp = saveData.Timestamp ?? "unknown";
  const version = saveData.Version ?? "unknown";
  const slotHint = originalName.match(/drg_save_slot(\d+)_(\d+)\.dat/i);
  const slotText = slotHint ? `Slot ${slotHint[1]}, file ${slotHint[2]}` : "Unknown slot file";
  saveInfo.textContent = `${originalName} | ${slotText} | Version ${version} | Timestamp ${timestamp}. Replace the active original save file after exporting.`;
}

function renderResources() {
  resourceGrid.innerHTML = "";
  for (const field of resourceFields) {
    resourceGrid.append(createNumberField(field, field, saveData[field] ?? 0));
  }
}

function renderClasses() {
  classGrid.innerHTML = "";
  const ranks = Array.isArray(saveData.ClassRanks) ? saveData.ClassRanks : [];
  if (!ranks.length) {
    classGrid.innerHTML = `<p class="muted">No class rank data found in this save.</p>`;
    return;
  }

  ranks.forEach((entry, index) => {
    classGrid.append(createNumberField(`Class ${entry.ClassType} rank`, `class:${index}:Rank`, entry.Rank ?? 0));
    classGrid.append(createNumberField(`Class ${entry.ClassType} XP`, `class:${index}:Xp`, entry.Xp ?? 0));
  });
}

function renderMetaUpgrades() {
  metaGrid.innerHTML = "";
  const upgrades = Array.isArray(saveData.MetaStatUpgrades) ? saveData.MetaStatUpgrades : [];
  if (!upgrades.length) {
    metaGrid.innerHTML = `<p class="muted">No meta upgrade data found in this save.</p>`;
    return;
  }

  upgrades.forEach((entry, index) => {
    metaGrid.append(createNumberField(entry.Id, `meta:${index}:Level`, entry.Level ?? 0));
  });
}

function renderMasteryEditor() {
  const weapons = masteryData.weapons ?? [];
  if (!weapons.length) {
    masteryEditor.innerHTML = `<p class="muted">No weapon mastery data found.</p>`;
    return;
  }

  if (!masteryEditorState.weaponGuid || !weapons.some((weapon) => weapon.guid === masteryEditorState.weaponGuid)) {
    masteryEditorState.weaponGuid = weapons[0].guid;
  }

  const challenges = getMasteryChallengesForWeapon(masteryEditorState.weaponGuid);
  if (!masteryEditorState.challengeGuid || !challenges.some((challenge) => challenge.guid === masteryEditorState.challengeGuid)) {
    masteryEditorState.challengeGuid = challenges[0]?.guid ?? "";
  }

  const weaponSave = getWeaponMasterySave(masteryEditorState.weaponGuid) ?? { Mastery: 0 };
  const challengeSave = getChallengeSave(masteryEditorState.challengeGuid) ?? {
    IsUnlocked: false,
    Completion: 0,
    CES: 0,
    CEH: 0,
  };
  const challengeScore = getChallengeScoreSave(masteryEditorState.challengeGuid) ?? { Score: 0 };

  masteryEditor.innerHTML = `
    <div class="mastery-grid">
      <label>
        <span>Weapon</span>
        <select data-mastery-field="weaponGuid">
          ${weapons
            .map(
              (weapon) =>
                `<option value="${escapeHtml(weapon.guid)}" ${weapon.guid === masteryEditorState.weaponGuid ? "selected" : ""}>${escapeHtml(weapon.name)}</option>`,
            )
            .join("")}
        </select>
      </label>
      <label>
        <span>Weapon mastery</span>
        <input type="number" min="0" data-mastery-field="weaponMastery" value="${weaponSave.Mastery ?? 0}" />
      </label>
      <label>
        <span>Challenge</span>
        <select data-mastery-field="challengeGuid">
          ${challenges
            .map(
              (challenge) =>
                `<option value="${escapeHtml(challenge.guid)}" ${challenge.guid === masteryEditorState.challengeGuid ? "selected" : ""}>${escapeHtml(challenge.name)}</option>`,
            )
            .join("")}
        </select>
      </label>
      <label>
        <span>Completion</span>
        <input type="number" min="0" data-mastery-field="challengeCompletion" value="${challengeSave.Completion ?? 0}" />
      </label>
      <label>
        <span>Escort completion</span>
        <input type="number" min="0" data-mastery-field="challengeEscort" value="${challengeSave.CES ?? 0}" />
      </label>
      <label>
        <span>Egg Hunt completion</span>
        <input type="number" min="0" data-mastery-field="challengeEggHunt" value="${challengeSave.CEH ?? 0}" />
      </label>
      <label>
        <span>Best score</span>
        <input type="number" min="0" data-mastery-field="challengeScore" value="${challengeScore.Score ?? 0}" />
      </label>
      <label class="checkbox-field">
        <input type="checkbox" data-mastery-field="challengeUnlocked" ${challengeSave.IsUnlocked ? "checked" : ""} />
        <span>Challenge unlocked</span>
      </label>
    </div>
    <div class="inline-actions">
      <button type="button" data-mastery-action="complete-selected">Complete selected</button>
      <button type="button" data-mastery-action="unlock-all-weapon">Unlock weapon challenges</button>
      <button type="button" data-mastery-action="max-all-weapon">Max all weapon mastery</button>
    </div>
  `;
}

function renderClassMasteryEditor() {
  const classMods = masteryData.classMods ?? [];
  if (!classMods.length) {
    classMasteryEditor.innerHTML = `<p class="muted">No class mastery data found.</p>`;
    return;
  }

  if (
    !classMasteryEditorState.classModGuid ||
    !classMods.some((classMod) => classMod.guid === classMasteryEditorState.classModGuid)
  ) {
    classMasteryEditorState.classModGuid = classMods[0].guid;
  }

  const challenges = getMasteryChallengesForClassMod(classMasteryEditorState.classModGuid);
  if (
    !classMasteryEditorState.challengeGuid ||
    !challenges.some((challenge) => challenge.guid === classMasteryEditorState.challengeGuid)
  ) {
    classMasteryEditorState.challengeGuid = challenges[0]?.guid ?? "";
  }

  const classModSave = getClassModMasterySave(classMasteryEditorState.classModGuid) ?? { Mastery: 0 };
  const challengeSave = getChallengeSave(classMasteryEditorState.challengeGuid) ?? {
    IsUnlocked: false,
    Completion: 0,
    CES: 0,
    CEH: 0,
  };
  const challengeScore = getChallengeScoreSave(classMasteryEditorState.challengeGuid) ?? { Score: 0 };

  classMasteryEditor.innerHTML = `
    <div class="mastery-grid">
      <label>
        <span>Class mod</span>
        <select data-class-mastery-field="classModGuid">
          ${classMods
            .map(
              (classMod) =>
                `<option value="${escapeHtml(classMod.guid)}" ${classMod.guid === classMasteryEditorState.classModGuid ? "selected" : ""}>${escapeHtml(classMod.name)}</option>`,
            )
            .join("")}
        </select>
      </label>
      <label>
        <span>Class mastery</span>
        <input type="number" min="0" data-class-mastery-field="classModMastery" value="${classModSave.Mastery ?? 0}" />
      </label>
      <label>
        <span>Challenge</span>
        <select data-class-mastery-field="challengeGuid">
          ${challenges
            .map(
              (challenge) =>
                `<option value="${escapeHtml(challenge.guid)}" ${challenge.guid === classMasteryEditorState.challengeGuid ? "selected" : ""}>${escapeHtml(challenge.name)}</option>`,
            )
            .join("")}
        </select>
      </label>
      <label>
        <span>Completion</span>
        <input type="number" min="0" data-class-mastery-field="challengeCompletion" value="${challengeSave.Completion ?? 0}" />
      </label>
      <label>
        <span>Escort completion</span>
        <input type="number" min="0" data-class-mastery-field="challengeEscort" value="${challengeSave.CES ?? 0}" />
      </label>
      <label>
        <span>Egg Hunt completion</span>
        <input type="number" min="0" data-class-mastery-field="challengeEggHunt" value="${challengeSave.CEH ?? 0}" />
      </label>
      <label>
        <span>Best score</span>
        <input type="number" min="0" data-class-mastery-field="challengeScore" value="${challengeScore.Score ?? 0}" />
      </label>
      <label class="checkbox-field">
        <input type="checkbox" data-class-mastery-field="challengeUnlocked" ${challengeSave.IsUnlocked ? "checked" : ""} />
        <span>Challenge unlocked</span>
      </label>
    </div>
    <div class="inline-actions">
      <button type="button" data-class-mastery-action="complete-selected">Complete selected</button>
      <button type="button" data-class-mastery-action="unlock-all-class-mod">Unlock class challenges</button>
      <button type="button" data-class-mastery-action="max-all-class-mods">Max all class mastery</button>
    </div>
  `;
}

function getMasteryChallengesForWeapon(weaponGuid) {
  return masteryData.challengesByWeapon?.[weaponGuid] ?? [];
}

function getMasteryChallengesForClassMod(classModGuid) {
  return masteryData.challengesByClassMod?.[classModGuid] ?? [];
}

function getSaveArray(field, create = false) {
  const value = saveData[field];
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    if (create) saveData[field] = [value];
    return create ? saveData[field] : [value];
  }
  if (create) saveData[field] = [];
  return create ? saveData[field] : [];
}

function getWeaponMasterySave(weaponGuid, create = false) {
  const weaponSaveData = getSaveArray("WeaponSaveData", create);
  let entry = weaponSaveData.find((item) => item.Guid === weaponGuid);
  if (!entry && create) {
    entry = { Guid: weaponGuid, Mastery: 0 };
    weaponSaveData.push(entry);
  }
  return entry;
}

function getClassModMasterySave(classModGuid, create = false) {
  const classModSaveData = getSaveArray("ClassModSaveData", create);
  let entry = classModSaveData.find((item) => item.Guid === classModGuid);
  if (!entry && create) {
    entry = { Guid: classModGuid, Mastery: 0 };
    classModSaveData.push(entry);
  }
  return entry;
}

function getChallengeSave(challengeGuid, create = false) {
  const challenges = getSaveArray("Challenges", create);
  let entry = challenges.find((item) => item.Guid === challengeGuid);
  if (!entry && create) {
    entry = { Guid: challengeGuid, IsUnlocked: true, Completion: 0, CES: 0, CEH: 0 };
    challenges.push(entry);
  }
  return entry;
}

function getChallengeScoreSave(challengeGuid, create = false) {
  const challengeScore = getSaveArray("ChallengeScore", create);
  let entry = challengeScore.find((item) => item.GUID === challengeGuid);
  if (!entry && create) {
    entry = { GUID: challengeGuid, Score: 0 };
    challengeScore.push(entry);
  }
  return entry;
}

function renderItems() {
  itemTable.innerHTML = "";
  renderItemCreator();
  const items = Array.isArray(saveData.GearSaveData) ? saveData.GearSaveData : [];
  const equippedMap = getEquippedGearMap();
  const scope = itemScopeFilter.value;
  const filter = itemRarityFilter.value;
  const scopedItems = items.filter((item) => {
    const isEquipped = equippedMap.has(String(item.HC));
    if (scope === "equipped") return isEquipped;
    if (scope === "unequipped") return !isEquipped;
    return true;
  });
  const visibleItems = filter === "all" ? scopedItems : scopedItems.filter((item) => String(item.R) === filter);
  const rarityCounts = items.reduce((counts, item) => {
    const key = rarityLabels[item.R] ?? `Rarity ${item.R}`;
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

  itemSummary.textContent = items.length
    ? `${items.length} collected, ${equippedMap.size} equipped, ${visibleItems.length} shown. ${Object.entries(rarityCounts)
        .map(([rarity, count]) => `${rarity}: ${count}`)
        .join(" | ")}`
    : "No GearSaveData items found in this save.";

  if (!visibleItems.length) {
    itemTable.innerHTML = `<p class="muted">No items match the current filter.</p>`;
    return;
  }

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Item</th>
        <th>Instance</th>
        <th>Equipped</th>
        <th>Rarity</th>
        <th>Level</th>
        <th>Upgrades</th>
        <th>Stats</th>
        <th>Quirks</th>
        <th>New</th>
        <th>Favorite</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const body = table.querySelector("tbody");
  visibleItems.forEach((item) => {
    const index = items.indexOf(item);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td title="${escapeHtml(item.ID)}">${escapeHtml(getGearName(item))}</td>
      <td>${escapeHtml(String(item.HC ?? ""))}</td>
      <td>${escapeHtml(equippedMap.get(String(item.HC))?.join(", ") ?? "-")}</td>
      <td>
        <select data-item-index="${index}" data-field="R">
          ${Object.entries(rarityLabels)
            .map(
              ([value, label]) =>
                `<option value="${value}" ${Number(value) === item.R ? "selected" : ""}>${label}</option>`,
            )
            .join("")}
        </select>
      </td>
      <td><input type="number" min="0" data-item-index="${index}" data-field="L" value="${item.L ?? 0}" /></td>
      <td><input type="number" min="0" data-item-index="${index}" data-field="U" value="${item.U ?? 0}" /></td>
      <td>${renderStatEditors(item, index)}</td>
      <td>${renderTraitEditors(item, index)}</td>
      <td><input type="checkbox" data-item-index="${index}" data-field="N" ${item.N ? "checked" : ""} /></td>
      <td><input type="checkbox" data-item-index="${index}" data-field="F" ${Number(item.F) ? "checked" : ""} /></td>
    `;
    body.append(row);
  });

  itemTable.append(table);
}

function renderItemCreator() {
  const gearOptions = getGearOptions();
  const filteredGearOptions = getFilteredGearOptions(gearOptions);
  if (!filteredGearOptions.length) {
    itemCreator.innerHTML = `<p class="muted">No extracted gear definitions available.</p>`;
    return;
  }

  if (!itemCreatorState.id || !filteredGearOptions.some((gear) => gear.id === itemCreatorState.id)) {
    itemCreatorState.id = filteredGearOptions[0].id;
    resetCreatorQuirks();
    resetCreatorStats();
  }

  const pseudoItem = {
    ID: itemCreatorState.id,
    RQ: itemCreatorState.rareQuirk,
    LQ: itemCreatorState.legendaryQuirk,
  };

  itemCreator.innerHTML = `
    <div class="creator-header">
      <h4>Create item</h4>
      <div class="creator-actions">
        <button type="button" data-creator-action="add">Add item</button>
        <button type="button" data-creator-action="give-all">Give all filtered</button>
      </div>
    </div>
    <div class="creator-grid">
      <label>
        <span>Slot filter</span>
        <select data-creator-field="slot">
          <option value="all" ${itemCreatorState.slot === "all" ? "selected" : ""}>All slots</option>
          ${Object.entries(gearSlotLabels)
            .map(
              ([value, label]) =>
                `<option value="${value}" ${String(value) === String(itemCreatorState.slot) ? "selected" : ""}>${label}</option>`,
            )
            .join("")}
        </select>
      </label>
      <label>
        <span>Item type</span>
        <select data-creator-field="id">
          ${filteredGearOptions
            .map(
              (gear) =>
                `<option value="${escapeHtml(gear.id)}" ${gear.id === itemCreatorState.id ? "selected" : ""}>${escapeHtml(gearSlotLabels[gear.slot] ?? "Slot")} - ${escapeHtml(gear.name)}</option>`,
            )
            .join("")}
        </select>
      </label>
      <label>
        <span>Rarity</span>
        <select data-creator-field="rarity">
          ${Object.entries(rarityLabels)
            .map(
              ([value, label]) =>
                `<option value="${value}" ${Number(value) === Number(itemCreatorState.rarity) ? "selected" : ""}>${label}</option>`,
            )
            .join("")}
        </select>
      </label>
      <label>
        <span>Level</span>
        <input type="number" min="0" data-creator-field="level" value="${Number(itemCreatorState.level) || 0}" />
      </label>
      <label>
        <span>Upgrades</span>
        <input type="number" min="0" data-creator-field="upgrades" value="${Number(itemCreatorState.upgrades) || 0}" />
      </label>
      <label>
        <span>Rare quirk</span>
        <select data-creator-field="rareQuirk">
          ${renderQuirkOptions(pseudoItem, "RQ")}
        </select>
      </label>
      <label>
        <span>Legendary quirk</span>
        <select data-creator-field="legendaryQuirk">
          ${renderQuirkOptions(pseudoItem, "LQ")}
        </select>
      </label>
      ${renderCreatorStatSelectors()}
      <label class="checkbox-field">
        <input type="checkbox" data-creator-field="isNew" ${itemCreatorState.isNew ? "checked" : ""} />
        <span>Mark as new</span>
      </label>
      <label class="checkbox-field">
        <input type="checkbox" data-creator-field="favorite" ${itemCreatorState.favorite ? "checked" : ""} />
        <span>Favorite</span>
      </label>
    </div>
  `;
}

function getGearOptions() {
  return (gearData.gears ?? [])
    .map((gear) => ({ id: gear.guid, name: gear.refName || gear.name, slot: gear.slot }))
    .filter((gear) => gear.id && gear.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getFilteredGearOptions(gearOptions) {
  if (itemCreatorState.slot === "all") return gearOptions;
  return gearOptions.filter((gear) => String(gear.slot) === String(itemCreatorState.slot));
}

function renderCreatorStatSelectors() {
  const statGroups = getCreatorStatGroups(itemCreatorState.id, itemCreatorState.rarity);
  ensureCreatorStats(statGroups);
  return ["primary", "secondary", "tertiary"]
    .map((group, index) => {
      const options = statGroups[group] ?? [];
      return `
        <label>
          <span>${group[0].toUpperCase()}${group.slice(1)} stat</span>
          <select data-creator-field="stat" data-stat-slot="${index}">
            <option value="">Empty</option>
            ${options
              .map(
                (option) =>
                  `<option value="${option.stat}" ${Number(option.stat) === Number(itemCreatorState.stats[index]) ? "selected" : ""}>${escapeHtml(option.statName)}</option>`,
              )
              .join("")}
          </select>
        </label>
      `;
    })
    .join("");
}

function getCreatorStatGroups(id, rarity) {
  const definition = getGearDefinition(id);
  return definition?.statOptions?.[String(rarity)] ?? { primary: [], secondary: [], tertiary: [] };
}

function ensureCreatorStats(statGroups) {
  if (!Array.isArray(itemCreatorState.stats)) itemCreatorState.stats = [];
  ["primary", "secondary", "tertiary"].forEach((group, index) => {
    const options = statGroups[group] ?? [];
    if (!options.length) {
      itemCreatorState.stats[index] = "";
      return;
    }
    const current = Number(itemCreatorState.stats[index]);
    if (!options.some((option) => Number(option.stat) === current)) {
      itemCreatorState.stats[index] = options[0].stat;
    }
  });
}

function getEquippedGearMap() {
  const map = new Map();
  const equippedGear = Array.isArray(saveData.EquippedGear) ? saveData.EquippedGear : [];
  const slotNames = {
    A: "Armor",
    C: "Class",
    G: "Grenade",
    Ta: "Tag",
    To: "Tool",
    W: "Weapon",
  };

  equippedGear.forEach((loadout, loadoutIndex) => {
    for (const [slot, label] of Object.entries(slotNames)) {
      const values = Array.isArray(loadout[slot]) ? loadout[slot] : [];
      values.forEach((hc) => {
        const key = String(hc);
        const entries = map.get(key) ?? [];
        const value = `${label} L${loadoutIndex + 1}`;
        if (!entries.includes(value)) entries.push(value);
        map.set(key, entries);
      });
    }
  });

  return map;
}

function renderStatEditors(item, index) {
  const stats = Array.isArray(item.S) ? item.S : [];
  const signs = Array.isArray(item.SG) ? item.SG : [];
  return [0, 1, 2]
    .map(
      (slot) => `
        <div class="stat-editor">
          <select data-item-index="${index}" data-array="S" data-slot="${slot}">
            <option value="">Empty</option>
            ${Object.entries(statLabels)
              .map(
                ([value, label]) =>
                  `<option value="${value}" ${Number(value) === stats[slot] ? "selected" : ""}>${label}</option>`,
              )
              .join("")}
          </select>
          <select data-item-index="${index}" data-array="SG" data-slot="${slot}">
            ${Object.entries(signLabels)
              .map(
                ([value, label]) =>
                  `<option value="${value}" ${Number(value) === signs[slot] ? "selected" : ""}>${label}</option>`,
              )
              .join("")}
          </select>
        </div>
      `,
    )
    .join("");
}

function renderTraitEditors(item, index) {
  return ["RQ", "LQ"]
    .map(
      (field) => `
        <label class="trait-editor">
          <span>${traitFieldLabels[field] ?? field}</span>
          <select data-item-index="${index}" data-field="${field}">
            ${renderQuirkOptions(item, field)}
          </select>
        </label>
      `,
    )
    .join("");
}

function renderQuirkOptions(item, field) {
  const observed = gearData.observedQuirks?.[item.ID]?.[field] ?? {};
  const currentValue = Number(item[field]);
  const options = Object.keys(observed).length
    ? Object.entries(observed).map(([value, label]) => [Number(value), label])
    : Object.entries(traitLabels).map(([value, label]) => [Number(value), label]);

  if (!options.some(([value]) => value === -1)) {
    options.unshift([-1, "None"]);
  }
  if (Number.isFinite(currentValue) && !options.some(([value]) => value === currentValue)) {
    options.push([currentValue, `Current index ${currentValue}`]);
  }

  return options
    .sort(([a], [b]) => a - b)
    .map(
      ([value, label]) =>
        `<option value="${value}" ${value === currentValue ? "selected" : ""}>${escapeHtml(label)}</option>`,
    )
    .join("");
}

function createNumberField(label, key, value) {
  const wrapper = document.createElement("label");
  wrapper.className = "number-field";
  wrapper.innerHTML = `
    <span>${escapeHtml(label)}</span>
    <input type="number" data-key="${escapeHtml(key)}" value="${Number(value) || 0}" />
  `;
  return wrapper;
}

function handleNumberFieldChange(event) {
  const key = event.target.dataset.key;
  if (!key || !resourceFields.includes(key)) return;
  saveData[key] = parseInputNumber(event.target.value);
  markChanged();
}

function handleClassFieldChange(event) {
  const key = event.target.dataset.key;
  if (!key) return;
  const [, index, field] = key.split(":");
  saveData.ClassRanks[Number(index)][field] = parseInputNumber(event.target.value);
  markChanged();
}

function handleMetaFieldChange(event) {
  const key = event.target.dataset.key;
  if (!key) return;
  const [, index, field] = key.split(":");
  saveData.MetaStatUpgrades[Number(index)][field] = parseInputNumber(event.target.value);
  markChanged();
}

function handleMasteryEditorChange(event) {
  const field = event.target.dataset.masteryField;
  if (!field) return;

  if (field === "weaponGuid") {
    masteryEditorState.weaponGuid = event.target.value;
    masteryEditorState.challengeGuid = getMasteryChallengesForWeapon(masteryEditorState.weaponGuid)[0]?.guid ?? "";
    renderMasteryEditor();
    return;
  }

  if (field === "challengeGuid") {
    masteryEditorState.challengeGuid = event.target.value;
    renderMasteryEditor();
    return;
  }

  if (field === "weaponMastery") {
    getWeaponMasterySave(masteryEditorState.weaponGuid, true).Mastery = parseInputNumber(event.target.value);
  } else if (field === "challengeCompletion") {
    getChallengeSave(masteryEditorState.challengeGuid, true).Completion = parseInputNumber(event.target.value);
  } else if (field === "challengeEscort") {
    getChallengeSave(masteryEditorState.challengeGuid, true).CES = parseInputNumber(event.target.value);
  } else if (field === "challengeEggHunt") {
    getChallengeSave(masteryEditorState.challengeGuid, true).CEH = parseInputNumber(event.target.value);
  } else if (field === "challengeScore") {
    getChallengeScoreSave(masteryEditorState.challengeGuid, true).Score = parseInputNumber(event.target.value);
  } else if (field === "challengeUnlocked") {
    getChallengeSave(masteryEditorState.challengeGuid, true).IsUnlocked = event.target.checked;
  }

  markChanged();
}

function handleMasteryEditorClick(event) {
  const action = event.target.dataset.masteryAction;
  if (action === "complete-selected") {
    completeMasteryChallenge(masteryEditorState.challengeGuid);
    markChanged();
    statusText.textContent = "Mastery challenge completed";
  } else if (action === "unlock-all-weapon") {
    getMasteryChallengesForWeapon(masteryEditorState.weaponGuid).forEach((challenge) => {
      getChallengeSave(challenge.guid, true).IsUnlocked = true;
    });
    markChanged();
    statusText.textContent = "Weapon challenges unlocked";
  } else if (action === "max-all-weapon") {
    maxAllWeaponMastery();
    markChanged();
    renderMasteryEditor();
    statusText.textContent = "All weapon mastery maxed";
  }
}

function handleClassMasteryEditorChange(event) {
  const field = event.target.dataset.classMasteryField;
  if (!field) return;

  if (field === "classModGuid") {
    classMasteryEditorState.classModGuid = event.target.value;
    classMasteryEditorState.challengeGuid =
      getMasteryChallengesForClassMod(classMasteryEditorState.classModGuid)[0]?.guid ?? "";
    renderClassMasteryEditor();
    return;
  }

  if (field === "challengeGuid") {
    classMasteryEditorState.challengeGuid = event.target.value;
    renderClassMasteryEditor();
    return;
  }

  if (field === "classModMastery") {
    getClassModMasterySave(classMasteryEditorState.classModGuid, true).Mastery = parseInputNumber(event.target.value);
  } else if (field === "challengeCompletion") {
    getChallengeSave(classMasteryEditorState.challengeGuid, true).Completion = parseInputNumber(event.target.value);
  } else if (field === "challengeEscort") {
    getChallengeSave(classMasteryEditorState.challengeGuid, true).CES = parseInputNumber(event.target.value);
  } else if (field === "challengeEggHunt") {
    getChallengeSave(classMasteryEditorState.challengeGuid, true).CEH = parseInputNumber(event.target.value);
  } else if (field === "challengeScore") {
    getChallengeScoreSave(classMasteryEditorState.challengeGuid, true).Score = parseInputNumber(event.target.value);
  } else if (field === "challengeUnlocked") {
    getChallengeSave(classMasteryEditorState.challengeGuid, true).IsUnlocked = event.target.checked;
  }

  markChanged();
}

function handleClassMasteryEditorClick(event) {
  const action = event.target.dataset.classMasteryAction;
  if (action === "complete-selected") {
    completeMasteryChallenge(classMasteryEditorState.challengeGuid);
    markChanged();
    statusText.textContent = "Class mastery challenge completed";
  } else if (action === "unlock-all-class-mod") {
    getMasteryChallengesForClassMod(classMasteryEditorState.classModGuid).forEach((challenge) => {
      getChallengeSave(challenge.guid, true).IsUnlocked = true;
    });
    markChanged();
    statusText.textContent = "Class challenges unlocked";
  } else if (action === "max-all-class-mods") {
    maxAllClassModMastery();
    markChanged();
    renderClassMasteryEditor();
    statusText.textContent = "All class mastery maxed";
  }
}

function completeMasteryChallenge(challengeGuid) {
  const challenge = getChallengeSave(challengeGuid, true);
  if (!challenge) return;
  challenge.IsUnlocked = true;
  challenge.Completion = Math.max(Number(challenge.Completion) || 0, 5);
  challenge.CES = Math.max(Number(challenge.CES) || 0, 5);
  challenge.CEH = Math.max(Number(challenge.CEH) || 0, 5);
  const score = getChallengeScoreSave(challengeGuid, true);
  score.Score = Math.max(Number(score.Score) || 0, 100000);
}

function maxAllWeaponMastery() {
  (masteryData.weapons ?? []).forEach((weapon) => {
    getWeaponMasterySave(weapon.guid, true).Mastery = 5;
  });
  (masteryData.weaponMasteryChallenges ?? []).forEach((challenge) => {
    completeMasteryChallenge(challenge.guid);
  });
}

function maxAllClassModMastery() {
  (masteryData.classMods ?? []).forEach((classMod) => {
    getClassModMasterySave(classMod.guid, true).Mastery = 5;
  });
  (masteryData.classModMasteryChallenges ?? []).forEach((challenge) => {
    completeMasteryChallenge(challenge.guid);
  });
}

function handleItemFieldChange(event) {
  const index = Number(event.target.dataset.itemIndex);
  const field = event.target.dataset.field;
  const arrayField = event.target.dataset.array;
  if (!Number.isInteger(index) || !Array.isArray(saveData.GearSaveData)) return;

  const item = saveData.GearSaveData[index];
  if (arrayField) {
    updateItemArrayField(item, arrayField, Number(event.target.dataset.slot), event.target.value);
  } else if (field) {
    item[field] = parseItemFieldValue(field, event.target);
  }
  markChanged();
  renderItems();
}

function parseItemFieldValue(field, target) {
  if (field === "N") return target.checked;
  if (field === "F") return target.checked ? 1 : 0;
  return parseInputNumber(target.value);
}

function handleItemCreatorChange(event) {
  const field = event.target.dataset.creatorField;
  if (!field) return;

  if (field === "id") {
    itemCreatorState.id = event.target.value;
    resetCreatorQuirks();
    resetCreatorStats();
  } else if (field === "slot") {
    itemCreatorState.slot = event.target.value;
    const [first] = getFilteredGearOptions(getGearOptions());
    if (first) itemCreatorState.id = first.id;
    resetCreatorQuirks();
    resetCreatorStats();
  } else if (field === "rarity") {
    itemCreatorState.rarity = parseInputNumber(event.target.value);
    resetCreatorStats();
  } else if (field === "level" || field === "upgrades") {
    itemCreatorState[field] = parseInputNumber(event.target.value);
  } else if (field === "rareQuirk" || field === "legendaryQuirk") {
    itemCreatorState[field] = parseInputNumber(event.target.value);
  } else if (field === "stat") {
    const slot = Number(event.target.dataset.statSlot);
    if (Number.isInteger(slot)) itemCreatorState.stats[slot] = event.target.value === "" ? "" : parseInputNumber(event.target.value);
  } else if (field === "isNew" || field === "favorite") {
    itemCreatorState[field] = event.target.checked;
  }

  renderItemCreator();
}

function handleItemCreatorClick(event) {
  const action = event.target.dataset.creatorAction;
  if (action === "add") {
    createItemFromCreator();
  } else if (action === "give-all") {
    createAllItemsFromCreator();
  }
}

function resetCreatorQuirks() {
  itemCreatorState.rareQuirk = getFirstQuirkIndex(itemCreatorState.id, "RQ");
  itemCreatorState.legendaryQuirk = getFirstQuirkIndex(itemCreatorState.id, "LQ");
}

function resetCreatorStats() {
  itemCreatorState.stats = [];
  ensureCreatorStats(getCreatorStatGroups(itemCreatorState.id, itemCreatorState.rarity));
}

function getFirstQuirkIndex(id, field) {
  const observed = gearData.observedQuirks?.[id]?.[field] ?? {};
  const first = Object.keys(observed)
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b)[0];
  return Number.isFinite(first) ? first : -1;
}

function createItemFromCreator() {
  if (!saveData) return;
  if (!Array.isArray(saveData.GearSaveData)) saveData.GearSaveData = [];

  const existingHcs = new Set(saveData.GearSaveData.map((gear) => Number(gear.HC)));
  const item = createGearItem({
    id: itemCreatorState.id,
    existingHcs,
    stats: itemCreatorState.stats,
    rareQuirk: itemCreatorState.rareQuirk,
    legendaryQuirk: itemCreatorState.legendaryQuirk,
  });

  saveData.GearSaveData.push(item);
  itemScopeFilter.value = "all";
  itemRarityFilter.value = "all";
  markChanged();
  statusText.textContent = `${gearData.names?.[item.ID] ?? "Item"} erstellt`;
}

function createAllItemsFromCreator() {
  if (!saveData) return;
  if (!Array.isArray(saveData.GearSaveData)) saveData.GearSaveData = [];

  const gearOptions = getFilteredGearOptions(getGearOptions());
  const existingHcs = new Set(saveData.GearSaveData.map((gear) => Number(gear.HC)));
  const created = gearOptions.map((gear) =>
    createGearItem({
      id: gear.id,
      existingHcs,
      stats: getDefaultStatsForGear(gear.id, itemCreatorState.rarity),
      rareQuirk: getFirstQuirkIndex(gear.id, "RQ"),
      legendaryQuirk: getFirstQuirkIndex(gear.id, "LQ"),
    }),
  );

  saveData.GearSaveData.push(...created);
  itemScopeFilter.value = "all";
  itemRarityFilter.value = "all";
  markChanged();
  statusText.textContent = `${created.length} Items erstellt`;
}

function createGearItem({ id, existingHcs, stats, rareQuirk, legendaryQuirk }) {
  const normalizedStats = stats.filter((value) => value !== "" && Number.isFinite(Number(value))).map(Number);
  return {
    HC: makeUniqueHc(hashString(`${id}:${Date.now()}:${existingHcs.size}`), existingHcs),
    ID: id,
    R: Number(itemCreatorState.rarity) || 0,
    L: Math.max(0, Number(itemCreatorState.level) || 0),
    U: Math.max(0, Number(itemCreatorState.upgrades) || 0),
    N: Boolean(itemCreatorState.isNew),
    S: normalizedStats,
    SG: normalizedStats.map(() => 1),
    ST: normalizedStats.map((_, index) => index),
    RQ: Number(rareQuirk),
    LQ: Number(legendaryQuirk),
    F: itemCreatorState.favorite ? 1 : 0,
  };
}

function getDefaultStatsForGear(id, rarity) {
  const statGroups = getCreatorStatGroups(id, rarity);
  return ["primary", "secondary", "tertiary"]
    .map((group) => statGroups[group]?.[0]?.stat ?? "")
    .filter((value) => value !== "");
}

function makeUniqueHc(seed, existingHcs) {
  let value = seed | 0;
  while (value === 0 || existingHcs.has(value)) {
    value = (value + 7919) | 0;
  }
  existingHcs.add(value);
  return value;
}

function updateItemArrayField(item, arrayField, slot, rawValue) {
  if (!Number.isInteger(slot)) return;
  item.S = Array.isArray(item.S) ? item.S : [];
  item.SG = Array.isArray(item.SG) ? item.SG : [];
  item.ST = Array.isArray(item.ST) ? item.ST : [];

  if (arrayField === "S" && rawValue === "") {
    item.S.splice(slot, 1);
    item.SG.splice(slot, 1);
    item.ST.splice(slot, 1);
    return;
  }

  while (item.S.length <= slot) item.S.push(0);
  while (item.SG.length <= slot) item.SG.push(1);
  while (item.ST.length <= slot) item.ST.push(item.ST.length);

  item[arrayField][slot] = parseInputNumber(rawValue);
}

function setHighResources() {
  for (const field of resourceFields) {
    if (field in saveData) saveData[field] = 999999;
  }
  markChanged();
}

function maxMetaUpgrades() {
  if (!Array.isArray(saveData.MetaStatUpgrades)) return;
  saveData.MetaStatUpgrades.forEach((upgrade) => {
    upgrade.Level = Math.max(Number(upgrade.Level) || 0, 24);
  });
  markChanged();
}

function makeAllItemsLegendary() {
  if (!Array.isArray(saveData.GearSaveData)) return;
  saveData.GearSaveData.forEach((item) => {
    item.R = 4;
    item.U = Math.max(Number(item.U) || 0, 3);
  });
  markChanged();
}

function maxItemLevels() {
  if (!Array.isArray(saveData.GearSaveData)) return;
  saveData.GearSaveData.forEach((item) => {
    item.L = Math.max(Number(item.L) || 0, 100);
    item.U = Math.max(Number(item.U) || 0, 3);
  });
  markChanged();
}

function markChanged() {
  statusText.textContent = "Geändert";
  entryCount.textContent = countLeaves(saveData).toLocaleString("de-DE");
  renderDashboard();
  renderTree();
}

function renderNode({ parent, key, value, path, query, depth }) {
  const type = getType(value);
  const childCount = type === "array" ? value.length : type === "object" ? Object.keys(value).length : 0;
  const isContainer = childCount > 0;
  const pathString = toPathString(path);
  const matches = query && `${key} ${pathString} ${previewValue(value)}`.toLowerCase().includes(query);
  const expanded = allExpanded || depth < 2 || matches || pathString === selected?.pathString;

  const node = document.createElement("div");
  node.className = "node";

  const row = document.createElement("div");
  row.className = "node-row";
  if (matches) row.classList.add("match");
  if (selected?.pathString === pathString) row.classList.add("selected");

  const twisty = document.createElement("button");
  twisty.className = "twisty";
  twisty.type = "button";
  twisty.textContent = isContainer ? (expanded ? "▾" : "▸") : "";
  twisty.disabled = !isContainer;

  const keyEl = document.createElement("span");
  keyEl.className = "key";
  keyEl.title = key;
  keyEl.textContent = key;

  const valueEl = document.createElement("span");
  valueEl.className = "value";
  valueEl.title = previewValue(value);
  valueEl.innerHTML = `<span class="type-badge">${type}</span> ${escapeHtml(previewValue(value))}`;

  row.append(twisty, keyEl, valueEl);
  row.addEventListener("click", () => selectValue(path, value));
  node.append(row);

  if (isContainer && expanded) {
    const entries = type === "array" ? value.map((item, index) => [String(index), item]) : Object.entries(value);
    for (const [childKey, childValue] of entries) {
      renderNode({
        parent: node,
        key: childKey,
        value: childValue,
        path: [...path, type === "array" ? Number(childKey) : childKey],
        query,
        depth: depth + 1,
      });
    }
  }

  parent.append(node);
}

function selectValue(path, value) {
  selected = {
    path,
    pathString: toPathString(path),
  };
  selectedPath.textContent = selected.pathString || "root";

  const type = getType(value);
  valueType.value = type === "array" || type === "object" ? "json" : type;
  valueEditor.value = type === "string" ? value : JSON.stringify(value, null, 2);
  setValueEditorEnabled(true);
  renderTree();
}

function applySelectedValue() {
  if (!selected) return;

  try {
    const nextValue = parseEditorValue(valueType.value, valueEditor.value);
    setByPath(saveData, selected.path, nextValue);
    statusText.textContent = "Geändert";
    entryCount.textContent = countLeaves(saveData).toLocaleString("de-DE");
    renderTree();
    selectValue(selected.path, getByPath(saveData, selected.path));
  } catch (error) {
    statusText.innerHTML = `<span class="error">${escapeHtml(error.message)}</span>`;
  }
}

function parseEditorValue(type, raw) {
  if (type === "string") return raw;
  if (type === "number") {
    const number = Number(raw);
    if (!Number.isFinite(number)) throw new Error("Keine gültige Zahl");
    return number;
  }
  if (type === "boolean") {
    if (raw.trim().toLowerCase() === "true") return true;
    if (raw.trim().toLowerCase() === "false") return false;
    throw new Error("Boolean muss true oder false sein");
  }
  if (type === "null") return null;
  return JSON.parse(raw);
}

function downloadSave() {
  const json = JSON.stringify(saveData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = originalName;
  anchor.click();
  URL.revokeObjectURL(url);
  statusText.textContent = "Exportiert";
}

function toggleExpandAll() {
  allExpanded = !allExpanded;
  expandButton.textContent = allExpanded ? "Reduzieren" : "Alle öffnen";
  renderTree();
}

function getType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function previewValue(value) {
  const type = getType(value);
  if (type === "array") return `[${value.length}]`;
  if (type === "object") return `{${Object.keys(value).length}}`;
  if (type === "string") return `"${value}"`;
  return String(value);
}

function parseInputNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function shortId(value) {
  if (!value) return "";
  const text = String(value);
  return text.length > 18 ? `${text.slice(0, 8)}...${text.slice(-6)}` : text;
}

function getGearName(item) {
  const name = gearData.names?.[item.ID];
  return name ? `${name} (${shortId(item.ID)})` : shortId(item.ID);
}

function getGearDefinition(id) {
  return (gearData.gears ?? []).find((gear) => gear.guid === id);
}

function hashString(value) {
  let hash = 0;
  for (const char of String(value)) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return hash || 1;
}

function countLeaves(value) {
  const type = getType(value);
  if (type !== "array" && type !== "object") return 1;
  const values = type === "array" ? value : Object.values(value);
  return values.reduce((sum, item) => sum + countLeaves(item), 0);
}

function toPathString(path) {
  if (!path.length) return "root";
  return path.reduce((result, part) => {
    if (typeof part === "number") return `${result}[${part}]`;
    return `${result}.${part}`;
  }, "root");
}

function getByPath(root, path) {
  return path.reduce((value, part) => value[part], root);
}

function setByPath(root, path, value) {
  if (!path.length) {
    saveData = value;
    return;
  }
  const parent = getByPath(root, path.slice(0, -1));
  parent[path[path.length - 1]] = value;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
