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
const tree = document.querySelector("#tree");

let saveData = null;
let originalName = "drg-survivor-save.dat";
let selected = null;
let allExpanded = false;

fileInput.addEventListener("change", handleFileSelect);
downloadButton.addEventListener("click", downloadSave);
searchInput.addEventListener("input", renderTree);
applyButton.addEventListener("click", applySelectedValue);
expandButton.addEventListener("click", toggleExpandAll);

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
    renderTree();
  } catch (error) {
    saveData = null;
    setControlsEnabled(false);
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
  anchor.download = originalName.replace(/(\.dat|\.json|\.txt)?$/i, "-edited.dat");
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
