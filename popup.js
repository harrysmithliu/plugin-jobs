const launchButton = document.getElementById("launchButton");
const statusElement = document.getElementById("status");
const autofillToggle = document.getElementById("autofillToggle");

const profileTabsElement = document.getElementById("profileTabs");
const refreshProfileButton = document.getElementById("refreshProfileButton");
const currentProfileLabelElement = document.getElementById("currentProfileLabel");
const currentProfileCorpusCountElement = document.getElementById("currentProfileCorpusCount");
const currentProfileFileNameElement = document.getElementById("currentProfileFileName");
const currentProfileCacheCountElement = document.getElementById("currentProfileCacheCount");
const downloadProfileButton = document.getElementById("downloadProfileButton");
const clearProfileCacheButton = document.getElementById("clearProfileCacheButton");

const confirmOverlay = document.getElementById("confirmOverlay");
const confirmTitleElement = document.getElementById("confirmTitle");
const confirmMessageElement = document.getElementById("confirmMessage");
const confirmCancelButton = document.getElementById("confirmCancelButton");
const confirmOkButton = document.getElementById("confirmOkButton");

const SETTINGS_KEY = "formMemory.enabled";
const ANALYZER_SETTINGS_KEY = "analyzerSettings";
const JD_CORPUS_STORAGE_KEY = "jdCorpusByProfile";
const ANALYSIS_CACHE_KEY = "analysisCacheByUrl";
const LAST_ANALYSIS_KEY = "lastAnalysis";

const PROFILE_ORDER = ["backend", "agenticsys", "appsec"];
const PROFILE_LABELS = {
  backend: "Backend",
  agenticsys: "AgenticSys",
  appsec: "AppSec"
};
const PROFILE_FILE_BY_ID = {
  backend: "backend.txt",
  agenticsys: "agenticsys.txt",
  appsec: "appsec.txt"
};

let isAutofillEnabled = false;
let selectedProfileId = "backend";
let pendingConfirmResolver = null;

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
    await persistSelectedProfile(selectedProfileId);

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

refreshProfileButton.addEventListener("click", async () => {
  await loadProfileState(true);
});

downloadProfileButton.addEventListener("click", async () => {
  const confirmed = await showConfirmDialog({
    title: "Download Profile Cache File",
    message: `Download cached JD corpus for ${PROFILE_LABELS[selectedProfileId]} to a local folder you choose?`,
    confirmText: "Download",
    danger: false
  });

  if (!confirmed) {
    return;
  }

  downloadProfileButton.disabled = true;
  try {
    await downloadCurrentProfileCorpus();
  } catch (error) {
    setStatus(error.message || "Unable to download profile cache file.", true);
  } finally {
    downloadProfileButton.disabled = false;
  }
});

clearProfileCacheButton.addEventListener("click", async () => {
  const confirmed = await showConfirmDialog({
    title: "Delete Current Tab Analysis Cache",
    message:
      `Delete only analysis cache for ${PROFILE_LABELS[selectedProfileId]} tab?\n` +
      "This will NOT delete analyzer settings, applied state, corpus files, or form memory.",
    confirmText: "Delete",
    danger: true
  });

  if (!confirmed) {
    return;
  }

  clearProfileCacheButton.disabled = true;
  try {
    await clearCurrentProfileAnalysisCache();
  } catch (error) {
    setStatus(error.message || "Unable to delete current tab analysis cache.", true);
  } finally {
    clearProfileCacheButton.disabled = false;
  }
});

confirmCancelButton.addEventListener("click", () => closeConfirmDialog(false));
confirmOkButton.addEventListener("click", () => closeConfirmDialog(true));

confirmOverlay.addEventListener("click", (event) => {
  if (event.target === confirmOverlay) {
    closeConfirmDialog(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !confirmOverlay.hidden) {
    closeConfirmDialog(false);
  }
});

async function initializePopup() {
  try {
    await migrateLegacyCorpusToJsonStructure();

    const bootstrap = await chrome.storage.local.get({
      [SETTINGS_KEY]: false,
      [ANALYZER_SETTINGS_KEY]: null
    });

    isAutofillEnabled = Boolean(bootstrap[SETTINGS_KEY]);
    autofillToggle.checked = isAutofillEnabled;
    selectedProfileId = normalizeProfileId(bootstrap[ANALYZER_SETTINGS_KEY]?.activeProfileId) || "backend";

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

  renderProfileTabs();
  await loadProfileState();
}

async function loadProfileState(isManualRefresh = false) {
  const stored = await chrome.storage.local.get({
    [ANALYZER_SETTINGS_KEY]: null,
    [JD_CORPUS_STORAGE_KEY]: {},
    [ANALYSIS_CACHE_KEY]: {},
    [LAST_ANALYSIS_KEY]: null
  });

  const analyzerSettings = stored[ANALYZER_SETTINGS_KEY];
  const storageProfileId = normalizeProfileId(analyzerSettings?.activeProfileId);
  if (storageProfileId && storageProfileId !== selectedProfileId) {
    selectedProfileId = storageProfileId;
    renderProfileTabs();
  }

  const corpusByProfile = stored[JD_CORPUS_STORAGE_KEY] || {};
  const analysisCacheByUrl = stored[ANALYSIS_CACHE_KEY] || {};
  const profileData = corpusByProfile[selectedProfileId] || {};
  const corpusItems = normalizeCorpusItems(profileData.items || []);
  const fileName = profileData.fileName || getProfileFileName(selectedProfileId);
  const profileCacheCount = countAnalysisCacheForProfile(analysisCacheByUrl, selectedProfileId);

  currentProfileLabelElement.textContent = PROFILE_LABELS[selectedProfileId];
  currentProfileCorpusCountElement.textContent = `${corpusItems.length}`;
  currentProfileFileNameElement.textContent = fileName;
  currentProfileCacheCountElement.textContent = `${profileCacheCount}`;

  if (isManualRefresh) {
    setStatus(
      `${PROFILE_LABELS[selectedProfileId]} refreshed. Corpus ${corpusItems.length}, analysis cache ${profileCacheCount}.`
    );
  }
}

function renderProfileTabs() {
  profileTabsElement.replaceChildren();

  for (const profileId of PROFILE_ORDER) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = `profile-tab ${profileId === selectedProfileId ? "profile-tab--active" : ""}`;
    tab.textContent = PROFILE_LABELS[profileId];
    tab.addEventListener("click", async () => {
      if (profileId === selectedProfileId) {
        return;
      }

      selectedProfileId = profileId;
      renderProfileTabs();
      await persistSelectedProfile(profileId);
      await loadProfileState();
      setStatus(`Switched profile tab to ${PROFILE_LABELS[profileId]}.`);
    });

    profileTabsElement.appendChild(tab);
  }
}

async function persistSelectedProfile(profileId) {
  const normalized = normalizeProfileId(profileId);
  if (!normalized) {
    return;
  }

  const stored = await chrome.storage.local.get({ [ANALYZER_SETTINGS_KEY]: null });
  const raw = stored[ANALYZER_SETTINGS_KEY];
  const next = {
    ...(raw && typeof raw === "object" ? raw : {}),
    version: Number(raw?.version) || 2,
    activeProfileId: normalized,
    updatedAt: new Date().toISOString()
  };

  await chrome.storage.local.set({ [ANALYZER_SETTINGS_KEY]: next });
}

async function downloadCurrentProfileCorpus() {
  const stored = await chrome.storage.local.get({ [JD_CORPUS_STORAGE_KEY]: {} });
  const corpusByProfile = stored[JD_CORPUS_STORAGE_KEY] || {};
  const profileData = corpusByProfile[selectedProfileId] || {};
  const items = normalizeCorpusItems(profileData.items || []);
  const fileName = profileData.fileName || getProfileFileName(selectedProfileId);
  const fileText = buildCorpusFileText(items);

  if (!fileText.trim()) {
    throw new Error("Current tab has no cached corpus content to download.");
  }

  const response = await chrome.runtime.sendMessage({
    action: "downloadProfileCorpusFile",
    fileName,
    fileText
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Download channel is not available. Please reload the extension.");
  }

  setStatus(`Download started: ${fileName}`);
}

async function clearCurrentProfileAnalysisCache() {
  const stored = await chrome.storage.local.get({
    [ANALYSIS_CACHE_KEY]: {},
    [LAST_ANALYSIS_KEY]: null
  });

  const analysisCacheByUrl = stored[ANALYSIS_CACHE_KEY] || {};
  const nextCacheByUrl = {};
  let removed = 0;

  for (const [url, entry] of Object.entries(analysisCacheByUrl)) {
    if (resolveEntryProfileId(entry) === selectedProfileId) {
      removed += 1;
      continue;
    }

    nextCacheByUrl[url] = entry;
  }

  const lastAnalysis = stored[LAST_ANALYSIS_KEY];
  const nextLastAnalysis =
    lastAnalysis && resolveEntryProfileId(lastAnalysis) === selectedProfileId ? null : lastAnalysis || null;

  await chrome.storage.local.set({
    [ANALYSIS_CACHE_KEY]: nextCacheByUrl,
    [LAST_ANALYSIS_KEY]: nextLastAnalysis
  });

  await loadProfileState();
  setStatus(
    removed > 0
      ? `Deleted ${removed} analysis cache entries for ${PROFILE_LABELS[selectedProfileId]}.`
      : `No analysis cache entries found for ${PROFILE_LABELS[selectedProfileId]}.`
  );
}

function resolveEntryProfileId(entry) {
  const explicit = normalizeProfileId(entry?.profileId);
  if (explicit) {
    return explicit;
  }

  return "backend";
}

function countAnalysisCacheForProfile(cacheByUrl, profileId) {
  return Object.values(cacheByUrl || {}).filter((entry) => resolveEntryProfileId(entry) === profileId).length;
}

function getProfileFileName(profileId) {
  return PROFILE_FILE_BY_ID[profileId] || `${profileId}.txt`;
}

async function migrateLegacyCorpusToJsonStructure() {
  try {
    const stored = await chrome.storage.local.get({
      [JD_CORPUS_STORAGE_KEY]: {},
      [ANALYSIS_CACHE_KEY]: {}
    });
    const corpusByProfile = stored[JD_CORPUS_STORAGE_KEY] || {};
    const analysisCacheByUrl = stored[ANALYSIS_CACHE_KEY] || {};
    const nextCorpusByProfile = { ...corpusByProfile };
    let changed = false;

    for (const [profileId, profileDataRaw] of Object.entries(corpusByProfile)) {
      const normalizedProfileId = normalizeProfileId(profileId) || profileId;
      const profileData = profileDataRaw && typeof profileDataRaw === "object" ? profileDataRaw : {};
      const normalizedItems = normalizeCorpusItems(profileData.items || [], { analysisCacheByUrl });
      const fileName = profileData.fileName || getProfileFileName(normalizeProfileId(profileId) || "backend");
      const fileText = buildCorpusFileText(normalizedItems);
      const isNormalized = isCorpusProfileDataNormalized(profileData, normalizedItems, fileText, fileName);

      if (isNormalized && normalizedProfileId === profileId) {
        continue;
      }

      if (normalizedProfileId !== profileId) {
        delete nextCorpusByProfile[profileId];
      }

      nextCorpusByProfile[normalizedProfileId] = {
        ...profileData,
        fileName,
        schemaVersion: 2,
        updatedAt: new Date().toISOString(),
        items: normalizedItems,
        fileText
      };
      changed = true;
    }

    if (!changed) {
      return;
    }

    await chrome.storage.local.set({ [JD_CORPUS_STORAGE_KEY]: nextCorpusByProfile });
  } catch (_error) {
    // Non-fatal for popup initialization.
  }
}

function normalizeCorpusItems(items, options = {}) {
  const list = Array.isArray(items) ? items : [];
  const analysisCacheByUrl = options.analysisCacheByUrl || {};
  const nextItems = [];
  const seenKeys = new Set();

  for (const item of list) {
    const jd = normalizeCorpusJdText(item?.JD || item?.text || item?.jd || "");
    if (!jd) {
      continue;
    }

    let key = normalizeCorpusKey(item?.KEY || item?.key || "");
    if (!key) {
      key = buildCorpusEntryKey({
        jobTitle: item?.jobTitle || item?.title || "",
        companyName: item?.companyName || item?.company || "",
        pageTitle: item?.jobTitle || item?.title || ""
      });
    }

    if (!key) {
      const sourceUrl = String(item?.url || "").trim();
      const cacheEntry = sourceUrl ? analysisCacheByUrl[sourceUrl] : null;
      key = buildCorpusEntryKey(cacheEntry?.extraction || {});
    }

    if (!key) {
      key = `Legacy Entry ${nextItems.length + 1}`;
    }

    if (seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);

    nextItems.push({
      NO: nextItems.length + 1,
      KEY: key,
      JD: jd
    });
  }

  return nextItems;
}

function normalizeCorpusJdText(value) {
  return String(value || "")
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function normalizeCorpusKey(value) {
  return String(value || "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function buildCorpusEntryKey(extraction) {
  const title = normalizeCorpusKey(extraction?.jobTitle || extraction?.pageTitle || "");
  const company = normalizeCorpusKey(extraction?.companyName || "");
  return normalizeCorpusKey([title, company].filter(Boolean).join(" "));
}

function isCorpusProfileDataNormalized(profileData, normalizedItems, fileText, fileName) {
  const existingItems = Array.isArray(profileData?.items) ? profileData.items : [];
  if (existingItems.length !== normalizedItems.length) {
    return false;
  }

  for (let index = 0; index < normalizedItems.length; index += 1) {
    const left = normalizedItems[index];
    const right = existingItems[index] || {};
    if (Number(right.NO) !== Number(left.NO) || String(right.KEY || "") !== left.KEY || String(right.JD || "") !== left.JD) {
      return false;
    }
  }

  return (
    Number(profileData?.schemaVersion) === 2 &&
    String(profileData?.fileName || "") === String(fileName || "") &&
    String(profileData?.fileText || "") === String(fileText || "")
  );
}

function buildCorpusFileText(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }

  return JSON.stringify(normalizeCorpusItems(items), null, 2);
}

function normalizeProfileId(profileId) {
  const normalized = String(profileId || "").trim().toLowerCase();
  return PROFILE_ORDER.includes(normalized) ? normalized : "";
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

function showConfirmDialog({ title, message, confirmText = "Yes", danger = false }) {
  if (pendingConfirmResolver) {
    pendingConfirmResolver(false);
    pendingConfirmResolver = null;
  }

  confirmTitleElement.textContent = title;
  confirmMessageElement.textContent = message;
  confirmOkButton.textContent = confirmText;
  confirmOkButton.classList.toggle("danger-button", Boolean(danger));
  confirmOkButton.classList.toggle("primary-button", !danger);
  confirmOverlay.hidden = false;

  return new Promise((resolve) => {
    pendingConfirmResolver = resolve;
  });
}

function closeConfirmDialog(result) {
  if (confirmOverlay.hidden || !pendingConfirmResolver) {
    return;
  }

  const resolve = pendingConfirmResolver;
  pendingConfirmResolver = null;
  confirmOverlay.hidden = true;
  resolve(Boolean(result));
}

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.style.color = isError ? "#b91c1c" : "#1f2933";
}
