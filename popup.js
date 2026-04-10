const launchButton = document.getElementById("launchButton");
const statusElement = document.getElementById("status");
const refreshCacheButton = document.getElementById("refreshCacheButton");
const copyCacheButton = document.getElementById("copyCacheButton");
const downloadCacheButton = document.getElementById("downloadCacheButton");
const cacheListElement = document.getElementById("cacheList");
const cacheEmptyStateElement = document.getElementById("cacheEmptyState");
const autofillToggle = document.getElementById("autofillToggle");
const refreshMemoryButton = document.getElementById("refreshMemoryButton");
const copyMemoryButton = document.getElementById("copyMemoryButton");
const memoryManualCountElement = document.getElementById("memoryManualCount");
const memoryLastUpdatedElement = document.getElementById("memoryLastUpdated");

let latestCacheEntries = [];
let isAutofillEnabled = false;
let latestManualEntriesByKey = {};

const SETTINGS_KEY = "formMemory.enabled";
const MANUAL_ENTRIES_KEY = "formMemory.manualEntriesByKey";

initializePopup();

autofillToggle.addEventListener("change", async () => {
  const nextValue = Boolean(autofillToggle.checked);

  try {
    await chrome.storage.local.set({ [SETTINGS_KEY]: nextValue });
    isAutofillEnabled = nextValue;

    if (nextValue) {
      await injectFormMemoryToActiveTab();
    }

    setStatus(
      nextValue
        ? "Form memory enabled. Save buttons should appear on editable fields in this page."
        : "Form memory disabled. No scan or auto-fill will run."
    );
  } catch (error) {
    autofillToggle.checked = isAutofillEnabled;
    setStatus(error.message || "Unable to update form memory setting.", true);
  }
});

launchButton.addEventListener("click", async () => {
  setStatus("Opening floating analyzer on the current page...");
  launchButton.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id || !tab.url) {
      throw new Error("No active tab found.");
    }

    if (!isSupportedUrl(tab.url)) {
      throw new Error("Open an Indeed or LinkedIn job page first.");
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["overlay.js"]
    });

    setStatus("Floating analyzer opened on this page.");
    window.setTimeout(() => window.close(), 250);
  } catch (error) {
    setStatus(error.message || "Unable to open the floating analyzer.", true);
    launchButton.disabled = false;
  }
});

refreshCacheButton.addEventListener("click", async () => {
  await loadRecentCacheEntries(true);
});

refreshMemoryButton.addEventListener("click", async () => {
  await loadFormMemorySnapshot(true);
});

copyMemoryButton.addEventListener("click", async () => {
  if (Object.keys(latestManualEntriesByKey).length === 0) {
    setStatus("No form memory entries to copy.", true);
    return;
  }

  try {
    const payload = {
      [MANUAL_ENTRIES_KEY]: latestManualEntriesByKey
    };
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setStatus(`Copied ${Object.keys(latestManualEntriesByKey).length} form memory entries as JSON.`);
  } catch (error) {
    setStatus(error.message || "Unable to copy form memory JSON.", true);
  }
});

copyCacheButton.addEventListener("click", async () => {
  if (latestCacheEntries.length === 0) {
    setStatus("No cached JD entries to copy.", true);
    return;
  }

  try {
    await navigator.clipboard.writeText(JSON.stringify(toExportPayload(latestCacheEntries), null, 2));
    setStatus(`Copied ${latestCacheEntries.length} cached JD entries as JSON.`);
  } catch (error) {
    setStatus(error.message || "Unable to copy cached JD JSON.", true);
  }
});

downloadCacheButton.addEventListener("click", () => {
  if (latestCacheEntries.length === 0) {
    setStatus("No cached JD entries to download.", true);
    return;
  }

  const blob = new Blob([JSON.stringify(toExportPayload(latestCacheEntries), null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  link.href = url;
  link.download = `jd-cache-latest-5-${timestamp}.json`;
  link.click();
  URL.revokeObjectURL(url);
  setStatus(`Downloaded ${latestCacheEntries.length} cached JD entries as JSON.`);
});

async function initializePopup() {
  try {
    const autofillSetting = await chrome.storage.local.get({ [SETTINGS_KEY]: false });
    isAutofillEnabled = Boolean(autofillSetting[SETTINGS_KEY]);
    autofillToggle.checked = isAutofillEnabled;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url) {
      setStatus("Open an Indeed or LinkedIn job page to launch the analyzer.");
      launchButton.disabled = true;
    } else if (!isSupportedUrl(tab.url)) {
      setStatus("This launcher currently supports Indeed and LinkedIn job pages only.");
      launchButton.disabled = true;
    } else {
      const hostname = new URL(tab.url).hostname.replace(/^www\./, "");
      setStatus(`Ready to open the floating analyzer on ${hostname}.`);
    }

    if (isAutofillEnabled) {
      await injectFormMemoryToActiveTab();
    }
  } catch (error) {
    setStatus(error.message || "Unable to inspect the active tab.", true);
    launchButton.disabled = true;
  }

  await loadRecentCacheEntries();
  await loadFormMemorySnapshot();
}

function isSupportedUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    return (
      hostname === "linkedin.com" ||
      hostname.endsWith(".linkedin.com") ||
      hostname === "indeed.com" ||
      hostname.endsWith(".indeed.com")
    );
  } catch (_error) {
    return false;
  }
}

async function injectFormMemoryToActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || !/^https?:\/\//i.test(tab.url)) {
    return;
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    files: ["form-memory.js"]
  });
}

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.style.color = isError ? "#b91c1c" : "#1f2933";
}

async function loadRecentCacheEntries(isManualRefresh = false) {
  try {
    const stored = await chrome.storage.local.get({ analysisCacheByUrl: {} });
    const entries = Object.values(stored.analysisCacheByUrl || {})
      .sort((left, right) => {
        const leftTime = new Date(left.extractedAt || 0).getTime();
        const rightTime = new Date(right.extractedAt || 0).getTime();
        return rightTime - leftTime;
      })
      .slice(0, 5);

    latestCacheEntries = entries;
    renderCacheEntries(entries);

    if (isManualRefresh) {
      setStatus(entries.length > 0 ? `Loaded ${entries.length} recent cached JD entries.` : "No cached JD entries yet.");
    }
  } catch (error) {
    setStatus(error.message || "Unable to load cached JD entries.", true);
  }
}

async function loadFormMemorySnapshot(isManualRefresh = false) {
  try {
    const stored = await chrome.storage.local.get({
      [MANUAL_ENTRIES_KEY]: {}
    });

    const manualEntriesByKey = stored[MANUAL_ENTRIES_KEY] || {};
    latestManualEntriesByKey = manualEntriesByKey;
    const manualEntries = Object.values(manualEntriesByKey)
      .filter(Boolean)
      .sort((left, right) => {
        const leftTime = new Date(left.updatedAt || 0).getTime();
        const rightTime = new Date(right.updatedAt || 0).getTime();
        return rightTime - leftTime;
      });

    memoryManualCountElement.textContent = `${manualEntries.length}`;
    memoryLastUpdatedElement.textContent = formatDateTime(manualEntries[0]?.updatedAt || "");

    if (isManualRefresh) {
      setStatus(`Memory loaded: ${manualEntries.length} manual entries.`);
    }
  } catch (error) {
    setStatus(error.message || "Unable to load form memory snapshot.", true);
  }
}

function renderCacheEntries(entries) {
  cacheListElement.replaceChildren();
  cacheEmptyStateElement.hidden = entries.length > 0;

  for (const entry of entries) {
    const card = document.createElement("article");
    card.className = "cache-item";

    const header = document.createElement("div");
    header.className = "cache-item-header";

    const titleBlock = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "cache-item-title";
    title.textContent = entry.extraction?.jobTitle || entry.title || "Untitled job";

    const meta = document.createElement("div");
    meta.className = "cache-meta";
    meta.textContent = [
      entry.extraction?.companyName || "Unknown company",
      entry.extraction?.hostname || "-",
      formatDateTime(entry.extractedAt)
    ].join(" | ");

    titleBlock.append(title, meta);

    const score = document.createElement("div");
    score.className = "cache-item-score";
    score.textContent = entry.analysis?.overallScore ? `${entry.analysis.overallScore}%` : "No score";

    header.append(titleBlock, score);
    card.appendChild(header);

    const source = document.createElement("div");
    source.className = "cache-meta";
    source.textContent = `Source: ${entry.extraction?.extractionSource || "-"}`;
    card.appendChild(source);

    const preview = document.createElement("p");
    preview.className = "cache-preview";
    preview.textContent = truncate(entry.extraction?.jobText || "", 220);
    card.appendChild(preview);

    const details = document.createElement("details");
    details.className = "cache-details";

    const summary = document.createElement("summary");
    summary.textContent = "Show Extracted JD";

    const raw = document.createElement("pre");
    raw.className = "cache-raw";
    raw.textContent = entry.extraction?.jobText || "";

    details.append(summary, raw);
    card.appendChild(details);

    cacheListElement.appendChild(card);
  }
}

function toExportPayload(entries) {
  return entries.map((entry) => ({
    extractedAt: entry.extractedAt,
    url: entry.extraction?.url || entry.url || "",
    hostname: entry.extraction?.hostname || entry.hostname || "",
    jobTitle: entry.extraction?.jobTitle || entry.title || "",
    companyName: entry.extraction?.companyName || "",
    extractionSource: entry.extraction?.extractionSource || "",
    overallScore: entry.analysis?.overallScore || 0,
    matchedKeywords: entry.analysis?.matchedKeywords || 0,
    extractedJD: entry.extraction?.jobText || ""
  }));
}

function formatDateTime(isoString) {
  if (!isoString) {
    return "-";
  }

  const parsed = new Date(isoString);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString();
}

function truncate(text, maxLength) {
  if (!text || text.length <= maxLength) {
    return text || "";
  }

  return `${text.slice(0, maxLength).trim()}...`;
}
