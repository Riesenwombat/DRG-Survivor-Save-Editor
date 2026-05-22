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
const itemSummary = document.querySelector("#itemSummary");
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

const resourceFields = ["Credits", "Bismor", "Croppa", "EnorPearl", "Jadiz", "Magnite", "Umanite", "PowerCore"];
const rarityLabels = {
  0: "Common",
  1: "Uncommon",
  2: "Rare",
  3: "Epic",
  4: "Legendary",
};
const statLabels = {
  0: "Stat 0",
  1: "Stat 1",
  2: "Stat 2",
  3: "Stat 3",
  4: "Fire rate",
  5: "Stat 5",
  6: "Critical damage",
  7: "Stat 7",
  8: "Stat 8",
  9: "Stat 9",
  10: "Status effect damage",
  11: "Damage",
  12: "Stat 12",
  13: "Stat 13",
  14: "Reload speed",
  15: "Stat 15",
  16: "Stat 16",
  17: "Weapon range",
  18: "Stat 18",
  19: "Stat 19",
  20: "Luck",
  21: "Stat 21",
  22: "Stat 22",
  23: "Stat 23",
  24: "Stat 24",
  25: "Stat 25",
  26: "Potency",
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
itemTable.addEventListener("change", handleItemFieldChange);
itemTable.addEventListener("click", handleItemActionClick);

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

function renderItems() {
  itemTable.innerHTML = "";
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
        <th>Test</th>
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
      <td class="test-actions">
        <button type="button" data-item-index="${index}" data-action="test-rare-quirks">Rare</button>
        <button type="button" data-item-index="${index}" data-action="test-legendary-quirks">Legendary</button>
      </td>
    `;
    body.append(row);
  });

  itemTable.append(table);
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
  return Object.entries(traitLabels)
    .map(([value, label]) => {
      const observedLabel = observed[value] ? `${label}: ${observed[value]}` : label;
      return `<option value="${value}" ${Number(value) === item[field] ? "selected" : ""}>${escapeHtml(observedLabel)}</option>`;
    })
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

function handleItemActionClick(event) {
  const action = event.target.dataset.action;
  if (action !== "test-rare-quirks" && action !== "test-legendary-quirks") return;
  const index = Number(event.target.dataset.itemIndex);
  if (!Number.isInteger(index) || !Array.isArray(saveData.GearSaveData)) return;
  createQuirkTestCopies(saveData.GearSaveData[index], action === "test-rare-quirks" ? "RQ" : "LQ");
  markChanged();
}

function createQuirkTestCopies(item, field) {
  const existingHcs = new Set(saveData.GearSaveData.map((gear) => Number(gear.HC)));
  const base = Math.abs(Number(item.HC) || hashString(item.ID));

  for (let index = 0; index <= 10; index += 1) {
    const copy = cloneJson(item);
    copy.HC = makeUniqueHc(base + 1000 + index, existingHcs);
    copy.R = 4;
    copy.L = 90 + index;
    copy.U = Math.max(Number(copy.U) || 0, 3);
    copy.N = true;
    copy.RQ = field === "RQ" ? index : Number(item.RQ) || 0;
    copy.LQ = field === "LQ" ? index : Number(item.LQ) || 0;
    copy.F = 0;
    saveData.GearSaveData.push(copy);
  }

  statusText.textContent = `${field}-Testkopien erstellt`;
}

function cloneJson(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
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
