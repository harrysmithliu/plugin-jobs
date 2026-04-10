(() => {
  if (window.__jdFormMemoryBootstrapped) {
    return;
  }
  window.__jdFormMemoryBootstrapped = true;

  const SETTINGS_KEY = "formMemory.enabled";
  const MANUAL_ENTRIES_KEY = "formMemory.manualEntriesByKey";
  const CANDIDATE_SELECTOR = "input, textarea, select";
  const MAX_CONTEXT_LENGTH = 320;
  const PLACEHOLDER_OPTION_PATTERNS = [
    /^$/,
    /^please select$/i,
    /^select$/i,
    /^choose$/i,
    /^--+$/,
    /^n\/a$/i
  ];

  const fieldButtons = new Map();
  const knownFields = new Set();

  let isEnabled = false;
  let cachedEntriesByKey = {};
  let scanQueued = false;
  let layoutQueued = false;

  init().catch(() => {
    // Keep content script silent on restricted pages.
  });

  async function init() {
    injectStyles();
    await loadState();
    scanAndBind();
    observeDomChanges();
    observeStorageChanges();
    observeViewportChanges();
  }

  function injectStyles() {
    if (document.getElementById("jd-form-memory-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "jd-form-memory-style";
    style.textContent = `
      .jd-memory-save-btn {
        position: fixed;
        z-index: 2147483646;
        border: 1px solid #0f172a;
        background: #0f172a;
        color: #ffffff;
        border-radius: 6px;
        padding: 2px 8px;
        font-size: 11px;
        line-height: 1.4;
        font-family: "Segoe UI", Tahoma, sans-serif;
        cursor: pointer;
        opacity: 0.96;
      }
      .jd-memory-save-btn:hover {
        background: #1f2937;
      }
      .jd-memory-save-btn[data-state="saved"] {
        background: #166534;
        border-color: #166534;
      }
      .jd-memory-save-btn[data-state="empty"] {
        background: #991b1b;
        border-color: #991b1b;
      }
    `;

    document.documentElement.appendChild(style);
  }

  async function loadState() {
    try {
      const result = await chrome.storage.local.get({
        [SETTINGS_KEY]: false,
        [MANUAL_ENTRIES_KEY]: {}
      });

      isEnabled = Boolean(result?.[SETTINGS_KEY]);
      const sanitized = sanitizeCachedEntries(result?.[MANUAL_ENTRIES_KEY] || {});
      cachedEntriesByKey = sanitized.entriesByKey;

      if (sanitized.changed) {
        await chrome.storage.local.set({
          [MANUAL_ENTRIES_KEY]: cachedEntriesByKey
        });
      }
    } catch (_error) {
      isEnabled = false;
      cachedEntriesByKey = {};
    }
  }

  function sanitizeCachedEntries(entriesByKey) {
    const next = {};
    let changed = false;

    for (const [rawKey, rawEntry] of Object.entries(entriesByKey || {})) {
      if (!rawEntry || typeof rawEntry !== "object") {
        changed = true;
        continue;
      }

      const normalizedLabel = cleanLabelChunk(rawEntry.label || rawKey || "");
      const normalizedKey = normalizeToken(normalizedLabel || rawKey || "");
      if (!normalizedKey) {
        changed = true;
        continue;
      }

      const entry = {
        ...rawEntry,
        key: normalizedKey,
        label: normalizedLabel || rawEntry.label || rawKey
      };

      const existing = next[normalizedKey];
      if (!existing) {
        next[normalizedKey] = entry;
      } else {
        const existingTime = new Date(existing.updatedAt || 0).getTime();
        const entryTime = new Date(entry.updatedAt || 0).getTime();
        if (entryTime >= existingTime) {
          next[normalizedKey] = entry;
        }
      }

      if (rawKey !== normalizedKey || rawEntry.label !== entry.label || rawEntry.key !== entry.key) {
        changed = true;
      }
    }

    return { entriesByKey: next, changed };
  }

  function observeDomChanges() {
    const observer = new MutationObserver(() => {
      queueScan();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function observeStorageChanges() {
    if (!chrome.storage?.onChanged) {
      return;
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") {
        return;
      }

      if (changes[SETTINGS_KEY]) {
        isEnabled = Boolean(changes[SETTINGS_KEY].newValue);
      }

      if (changes[MANUAL_ENTRIES_KEY]) {
        cachedEntriesByKey = changes[MANUAL_ENTRIES_KEY].newValue || {};
      }

      queueScan();
    });
  }

  function observeViewportChanges() {
    window.addEventListener("scroll", queueLayout, true);
    window.addEventListener("resize", queueLayout, true);
  }

  function queueScan() {
    if (scanQueued) {
      return;
    }

    scanQueued = true;
    window.setTimeout(() => {
      scanQueued = false;
      scanAndBind();
    }, 120);
  }

  function queueLayout() {
    if (layoutQueued) {
      return;
    }

    layoutQueued = true;
    window.requestAnimationFrame(() => {
      layoutQueued = false;
      if (!isEnabled) {
        return;
      }

      for (const [field, button] of fieldButtons.entries()) {
        if (!field.isConnected || !button.isConnected) {
          removeButton(field);
          continue;
        }

        positionButton(field, button);
      }
    });
  }

  function scanAndBind() {
    if (!isEnabled) {
      clearButtons();
      return;
    }

    const fields = Array.from(document.querySelectorAll(CANDIDATE_SELECTOR)).filter(isCandidateField);
    const currentSet = new Set(fields);

    for (const field of fields) {
      knownFields.add(field);
      applyAutofill(field);
      ensureButton(field);
    }

    for (const field of Array.from(fieldButtons.keys())) {
      if (!currentSet.has(field) || !field.isConnected) {
        removeButton(field);
      }
    }

    queueLayout();
  }

  function isCandidateField(field) {
    if (!field || field.disabled) {
      return false;
    }

    if (field.tagName === "TEXTAREA") {
      return !field.readOnly;
    }

    if (field.tagName === "SELECT") {
      return !field.multiple && field.options?.length > 1;
    }

    if (field.tagName === "INPUT") {
      if (field.readOnly) {
        return false;
      }

      const type = String(field.type || "text").toLowerCase();
      const unsupported = new Set(["hidden", "checkbox", "radio", "submit", "button", "file", "password"]);
      return !unsupported.has(type);
    }

    return false;
  }

  function ensureButton(field) {
    if (fieldButtons.has(field)) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "jd-memory-save-btn";
    button.textContent = "Save";
    button.dataset.state = "idle";
    button.title = "Save this field value to form memory";

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void saveFieldValue(field, button);
    });

    document.documentElement.appendChild(button);
    fieldButtons.set(field, button);
    positionButton(field, button);
  }

  function removeButton(field) {
    const button = fieldButtons.get(field);
    if (button) {
      button.remove();
    }
    fieldButtons.delete(field);
  }

  function clearButtons() {
    for (const button of fieldButtons.values()) {
      button.remove();
    }
    fieldButtons.clear();
  }

  function positionButton(field, button) {
    const rect = field.getBoundingClientRect();
    const isVisible =
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.left < window.innerWidth &&
      rect.top < window.innerHeight;

    if (!isVisible) {
      button.style.display = "none";
      return;
    }

    button.style.display = "inline-block";
    const top = Math.max(4, rect.top + 4);
    const right = Math.max(4, window.innerWidth - rect.right + 4);
    button.style.top = `${top}px`;
    button.style.right = `${right}px`;
    button.style.left = "auto";
  }

  function applyAutofill(field) {
    if (!isEnabled) {
      return;
    }

    const keyData = buildFieldKeyData(field);
    if (!keyData.key) {
      return;
    }

    const entry = cachedEntriesByKey[keyData.key];
    if (!entry) {
      return;
    }

    if (field.tagName === "SELECT") {
      if (hasMeaningfulSelectValue(field)) {
        return;
      }

      const selectedByValue = Array.from(field.options).find((option) => option.value === entry.value);
      const selectedByText = selectedByValue || Array.from(field.options).find((option) => {
        return normalizeToken(option.textContent || "") === normalizeToken(entry.optionText || "");
      });

      if (!selectedByText || isPlaceholderOption(selectedByText)) {
        return;
      }

      setNativeSelectValue(field, selectedByText.value);
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    const currentValue = String(field.value || "").trim();
    if (currentValue) {
      return;
    }

    if (!entry.value) {
      return;
    }

    setNativeInputValue(field, entry.value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function saveFieldValue(field, button) {
    if (!isEnabled) {
      return;
    }

    const keyData = buildFieldKeyData(field);
    if (!keyData.key) {
      markButton(button, "empty", "No key");
      return;
    }

    if (field.tagName === "SELECT") {
      const option = field.options?.[field.selectedIndex];
      if (!option || isPlaceholderOption(option)) {
        markButton(button, "empty", "Empty");
        return;
      }

      const value = String(option.value || "").trim();
      const optionText = String(option.textContent || "").trim();
      if (!value && !optionText) {
        markButton(button, "empty", "Empty");
        return;
      }

      cachedEntriesByKey = {
        ...cachedEntriesByKey,
        [keyData.key]: {
          key: keyData.key,
          label: keyData.label,
          value,
          optionText,
          fieldType: "select",
          updatedAt: new Date().toISOString(),
          sourceUrl: window.location.href,
          host: window.location.hostname
        }
      };

      await persistEntries();
      markButton(button, "saved", "Saved");
      return;
    }

    const value = String(field.value || "").trim();
    if (!value) {
      markButton(button, "empty", "Empty");
      return;
    }

    cachedEntriesByKey = {
      ...cachedEntriesByKey,
      [keyData.key]: {
        key: keyData.key,
        label: keyData.label,
        value,
        fieldType: field.tagName.toLowerCase(),
        updatedAt: new Date().toISOString(),
        sourceUrl: window.location.href,
        host: window.location.hostname
      }
    };

    await persistEntries();
    markButton(button, "saved", "Saved");
  }

  async function persistEntries() {
    try {
      await chrome.storage.local.set({
        [MANUAL_ENTRIES_KEY]: cachedEntriesByKey
      });
    } catch (_error) {
      // Keep silent on restricted contexts.
    }
  }

  function buildFieldKeyData(field) {
    const label = readFieldLabelText(field);
    const fallback = field.getAttribute("name") || field.getAttribute("id") || "";
    const keySource = label || fallback;
    const key = normalizeToken(keySource);

    return {
      key,
      label: label || fallback || "Unknown field"
    };
  }

  function readFieldLabelText(field) {
    const chunks = [];
    const seen = new Set();
    const pushChunk = (text) => {
      const cleaned = cleanLabelChunk(text);
      if (!cleaned) {
        return;
      }

      const normalized = normalizeToken(cleaned);
      if (!normalized || seen.has(normalized)) {
        return;
      }

      seen.add(normalized);
      chunks.push(cleaned);
    };

    if (field.labels?.length) {
      for (const label of field.labels) {
        pushChunk(label.textContent || "");
      }
    }

    const id = field.getAttribute("id");
    if (id) {
      const forLabel = document.querySelector(`label[for="${cssEscape(id)}"]`);
      if (forLabel) {
        pushChunk(forLabel.textContent || "");
      }
    }

    const nearestLabel = field.closest("label");
    if (nearestLabel) {
      pushChunk(nearestLabel.textContent || "");
    }

    let previous = field.previousElementSibling;
    let hops = 0;
    while (previous && hops < 5) {
      pushChunk(previous.textContent || "");
      previous = previous.previousElementSibling;
      hops += 1;
    }

    const fieldset = field.closest("fieldset");
    if (fieldset) {
      const legend = fieldset.querySelector("legend");
      if (legend) {
        pushChunk(legend.textContent || "");
      }
    }

    const container = field.closest("div, td, li, section, form");
    if (container) {
      const candidate = container.querySelector("label, legend, h1, h2, h3, h4, strong, p, span");
      if (candidate) {
        pushChunk(candidate.textContent || "");
      }
    }

    const merged = chunks
      .join(" ")
      .replace(/\s+/g, " ")
      .replace(/\*/g, "")
      .trim();

    return cleanLabelChunk(merged).slice(0, MAX_CONTEXT_LENGTH);
  }

  function cleanLabelChunk(text) {
    const cleaned = String(text || "")
      .replace(/\s+/g, " ")
      .replace(/\*/g, "")
      .replace(/\s*:\s*$/, "")
      .trim();

    const repeated = cleaned.match(/^(.{2,120}?)\s+\1$/i);
    return repeated ? repeated[1].trim() : cleaned;
  }

  function hasMeaningfulSelectValue(select) {
    const selectedOption = select.options?.[select.selectedIndex];
    return Boolean(selectedOption && !isPlaceholderOption(selectedOption));
  }

  function isPlaceholderOption(option) {
    const value = normalizeToken(option.value || "");
    const text = normalizeToken(option.textContent || "");
    return PLACEHOLDER_OPTION_PATTERNS.some((pattern) => pattern.test(value) || pattern.test(text));
  }

  function normalizeToken(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function setNativeInputValue(input, value) {
    if (input.tagName === "TEXTAREA") {
      const descriptor = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value");
      const setter = descriptor?.set;
      if (setter) {
        setter.call(input, value);
        return;
      }

      input.value = value;
      return;
    }

    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
    const setter = descriptor?.set;
    if (setter) {
      setter.call(input, value);
      return;
    }

    input.value = value;
  }

  function setNativeSelectValue(select, value) {
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value");
    const setter = descriptor?.set;
    if (setter) {
      setter.call(select, value);
      return;
    }

    select.value = value;
  }

  function markButton(button, state, text) {
    button.dataset.state = state;
    button.textContent = text;
    window.setTimeout(() => {
      button.dataset.state = "idle";
      button.textContent = "Save";
    }, 1200);
  }

  function cssEscape(value) {
    if (window.CSS?.escape) {
      return window.CSS.escape(value);
    }

    return String(value).replace(/["\\]/g, "\\$&");
  }
})();
