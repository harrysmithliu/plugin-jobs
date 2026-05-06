const MANUAL_ENTRIES_KEY = "formMemory.manualEntriesByKey";

const refreshButton = document.getElementById("refreshButton");
const countLabel = document.getElementById("countLabel");
const entriesList = document.getElementById("entriesList");
const emptyState = document.getElementById("emptyState");

refreshButton.addEventListener("click", () => {
  loadEntries();
});

loadEntries();

async function loadEntries() {
  refreshButton.disabled = true;

  try {
    const stored = await chrome.storage.local.get({ [MANUAL_ENTRIES_KEY]: {} });
    const byKey = stored[MANUAL_ENTRIES_KEY] || {};

    const entries = Object.values(byKey)
      .filter((item) => item && typeof item === "object")
      .sort((left, right) => {
        const leftTime = Date.parse(left.updatedAt || "") || 0;
        const rightTime = Date.parse(right.updatedAt || "") || 0;
        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }

        const leftLabel = String(left.label || "").toLowerCase();
        const rightLabel = String(right.label || "").toLowerCase();
        return leftLabel.localeCompare(rightLabel);
      });

    renderEntries(entries);
  } catch (_error) {
    renderEntries([]);
  } finally {
    refreshButton.disabled = false;
  }
}

function renderEntries(entries) {
  const count = Array.isArray(entries) ? entries.length : 0;
  countLabel.textContent = `${count} ${count === 1 ? "entry" : "entries"}`;

  entriesList.replaceChildren();
  emptyState.hidden = count > 0;

  for (const entry of entries) {
    const card = document.createElement("li");
    card.className = "entry-card";
    card.appendChild(createRow("label", String(entry.label || "-")));
    card.appendChild(createRow("value", String(entry.value || "-")));
    card.appendChild(createRow("updatedAt", formatUpdatedAt(entry.updatedAt)));
    entriesList.appendChild(card);
  }
}

function createRow(label, value) {
  const row = document.createElement("div");
  row.className = "entry-row";

  const keyNode = document.createElement("div");
  keyNode.className = "entry-key";
  keyNode.textContent = label;

  const valueNode = document.createElement("div");
  valueNode.className = "entry-value";
  valueNode.textContent = value;

  row.appendChild(keyNode);
  row.appendChild(valueNode);
  return row;
}

function formatUpdatedAt(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "-";
  }

  const timestamp = Date.parse(text);
  if (!Number.isFinite(timestamp)) {
    return text;
  }

  return new Date(timestamp).toLocaleString();
}
