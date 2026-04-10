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
  const FUZZY_MATCH_THRESHOLD = 0.78;
  const FUZZY_STOP_WORDS = new Set([
    "a",
    "an",
    "and",
    "any",
    "are",
    "be",
    "by",
    "can",
    "could",
    "current",
    "currently",
    "do",
    "for",
    "in",
    "is",
    "its",
    "of",
    "or",
    "our",
    "the",
    "to",
    "with",
    "would",
    "you",
    "your"
  ]);

  const fieldButtons = new Map();
  const knownFields = new Set();
  const autofillRetryCount = new WeakMap();

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
      const normalizedKey = canonicalizeKey(normalizedLabel || rawKey || "");
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

    const fieldTypeGroup = getFieldTypeGroup(field);
    const entry = resolveEntryByKey(keyData.key, fieldTypeGroup);
    if (!entry) {
      return;
    }

    if (!isValueCompatibleWithKey(keyData.key, entry, fieldTypeGroup, keyData.evidence)) {
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
    scheduleAutofillRetry(field, entry.value);
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
    const semanticHint = buildFieldSemanticHint(field, label, fallback);
    const keySource = semanticHint || label || fallback;
    const key = canonicalizeKey(keySource);
    const evidence = buildFieldEvidence(field, label, fallback);

    return {
      key,
      label: label || fallback || "Unknown field",
      evidence
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

    const ariaLabel = field.getAttribute("aria-label");
    if (ariaLabel) {
      pushChunk(ariaLabel);
    }

    const ariaLabelledBy = field.getAttribute("aria-labelledby");
    if (ariaLabelledBy) {
      const ids = ariaLabelledBy
        .split(/\s+/)
        .map((value) => value.trim())
        .filter(Boolean);
      for (const refId of ids) {
        const refElement = document.getElementById(refId);
        if (refElement) {
          pushChunk(refElement.textContent || "");
        }
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
    while (previous && hops < 2) {
      const candidate = cleanLabelChunk(previous.textContent || "");
      if (looksLikeQuestionLabel(candidate)) {
        pushChunk(candidate);
      }
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

    const merged = chunks
      .join(" ")
      .replace(/\s+/g, " ")
      .replace(/\*/g, "")
      .trim();

    return cleanLabelChunk(merged).slice(0, MAX_CONTEXT_LENGTH);
  }

  function looksLikeQuestionLabel(text) {
    const normalized = cleanLabelChunk(text);
    if (!normalized) {
      return false;
    }

    const lower = normalizeLooseToken(normalized);
    if (!lower) {
      return false;
    }

    if (lower.includes("save") || lower.includes("next") || lower.includes("previous")) {
      return false;
    }

    const words = lower.split(" ").filter(Boolean);
    if (words.length > 20) {
      return false;
    }

    return /[a-z0-9]/i.test(lower);
  }

  function cleanLabelChunk(text) {
    const cleaned = String(text || "")
      .replace(/\s+/g, " ")
      .replace(/\*/g, "")
      .replace(/\s*:\s*$/, "")
      .trim();

    const colonParts = cleaned
      .split(/\s*:\s*/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (
      colonParts.length === 2 &&
      normalizeLooseToken(colonParts[0]) &&
      normalizeLooseToken(colonParts[0]) === normalizeLooseToken(colonParts[1])
    ) {
      return colonParts[0];
    }

    const repeated = cleaned.match(/^(.{2,120}?)\s+\1$/i);
    return repeated ? repeated[1].trim() : cleaned;
  }

  function resolveEntryByKey(key, fieldTypeGroup) {
    const direct = cachedEntriesByKey[key];
    if (direct && isEntryCompatibleWithField(direct, fieldTypeGroup)) {
      return direct;
    }

    // Text input auto-fill should be conservative to avoid harmful mis-fill.
    if (fieldTypeGroup === "text") {
      return null;
    }

    const targetLoose = normalizeLooseToken(key);
    if (!targetLoose) {
      return null;
    }

    let bestEntry = null;
    let bestScore = -1;
    let bestUpdatedAt = 0;

    for (const [entryKey, entry] of Object.entries(cachedEntriesByKey || {})) {
      if (!entry) {
        continue;
      }

      if (!isEntryCompatibleWithField(entry, fieldTypeGroup)) {
        continue;
      }

      const entryLoose = normalizeLooseToken(entryKey);
      if (!entryLoose) {
        continue;
      }

      let score = 0;
      if (
        entryLoose === targetLoose ||
        (targetLoose.length >= 12 && entryLoose.includes(targetLoose)) ||
        (entryLoose.length >= 12 && targetLoose.includes(entryLoose))
      ) {
        score = 0.95;
      } else {
        score = computeFuzzyScore(targetLoose, entryLoose);
      }

      if (score < FUZZY_MATCH_THRESHOLD) {
        continue;
      }

      const updatedAt = new Date(entry.updatedAt || 0).getTime();
      if (score > bestScore || (score === bestScore && updatedAt > bestUpdatedAt)) {
        bestEntry = entry;
        bestScore = score;
        bestUpdatedAt = updatedAt;
      }
    }

    return bestEntry;
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

  function normalizeLooseToken(text) {
    return normalizeToken(text)
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function buildFieldEvidence(field, label, fallback) {
    return normalizeLooseToken(
      [
        label,
        fallback,
        field.getAttribute("aria-label"),
        field.getAttribute("placeholder"),
        field.getAttribute("name"),
        field.getAttribute("id"),
        field.getAttribute("autocomplete"),
        field.getAttribute("data-ph-at-id")
      ]
        .filter(Boolean)
        .join(" ")
    );
  }

  function getFieldTypeGroup(field) {
    return field.tagName === "SELECT" ? "select" : "text";
  }

  function isEntryCompatibleWithField(entry, fieldTypeGroup) {
    if (!entry || !fieldTypeGroup) {
      return false;
    }

    if (fieldTypeGroup === "select") {
      return entry.fieldType === "select";
    }

    return entry.fieldType !== "select";
  }

  function computeFuzzyScore(targetLoose, entryLoose) {
    const targetTokens = tokenizeForFuzzy(targetLoose);
    const entryTokens = tokenizeForFuzzy(entryLoose);
    if (targetTokens.length === 0 || entryTokens.length === 0) {
      return 0;
    }

    const targetSet = new Set(targetTokens);
    const entrySet = new Set(entryTokens);
    let overlap = 0;
    for (const token of targetSet) {
      if (entrySet.has(token)) {
        overlap += 1;
      }
    }

    if (overlap === 0) {
      return 0;
    }

    const precision = overlap / entrySet.size;
    const recall = overlap / targetSet.size;
    const f1 = (2 * precision * recall) / (precision + recall);
    const bigramScore = computeBigramScore(targetTokens, entryTokens);
    const anchorBoost = computeAnchorBoost(targetLoose, entryLoose);
    return Math.min(0.94, 0.65 * f1 + 0.3 * bigramScore + anchorBoost);
  }

  function tokenizeForFuzzy(text) {
    return normalizeLooseToken(text)
      .split(" ")
      .map((part) => part.trim())
      .filter((part) => part.length >= 3)
      .filter((part) => !FUZZY_STOP_WORDS.has(part));
  }

  function computeBigramScore(leftTokens, rightTokens) {
    const leftBigrams = toBigrams(leftTokens);
    const rightBigrams = new Set(toBigrams(rightTokens));
    if (leftBigrams.length === 0 || rightBigrams.size === 0) {
      return 0;
    }

    let matches = 0;
    for (const gram of leftBigrams) {
      if (rightBigrams.has(gram)) {
        matches += 1;
      }
    }

    return matches / leftBigrams.length;
  }

  function toBigrams(tokens) {
    const grams = [];
    for (let index = 0; index < tokens.length - 1; index += 1) {
      grams.push(`${tokens[index]} ${tokens[index + 1]}`);
    }
    return grams;
  }

  function computeAnchorBoost(targetLoose, entryLoose) {
    const anchors = [
      ["legally authorized", "work"],
      ["currently live"],
      ["non compete"],
      ["retain your information"],
      ["relocating", "remote"],
      ["employee", "contractor"],
      ["hybrid", "office"]
    ];

    let boost = 0;
    for (const group of anchors) {
      const targetHasAll = group.every((term) => targetLoose.includes(term));
      if (!targetHasAll) {
        continue;
      }

      const entryHasAll = group.every((term) => entryLoose.includes(term));
      if (entryHasAll) {
        boost += 0.08;
      }
    }

    return Math.min(0.16, boost);
  }

  function scheduleAutofillRetry(field, value) {
    const current = autofillRetryCount.get(field) || 0;
    if (current >= 3) {
      return;
    }

    autofillRetryCount.set(field, current + 1);
    window.setTimeout(() => {
      if (!field.isConnected) {
        return;
      }

      const liveValue = String(field.value || "").trim();
      if (liveValue) {
        return;
      }

      setNativeInputValue(field, value);
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
      scheduleAutofillRetry(field, value);
    }, 260);
  }

  function buildFieldSemanticHint(field, label, fallback) {
    const chunks = [
      label,
      fallback,
      field.getAttribute("aria-label"),
      field.getAttribute("placeholder"),
      field.getAttribute("name"),
      field.getAttribute("id"),
      field.getAttribute("autocomplete"),
      field.getAttribute("data-ph-at-id")
    ];

    const loose = normalizeLooseToken(chunks.filter(Boolean).join(" "));
    if (!loose) {
      return "";
    }

    if (loose.includes("linkedin") && (loose.includes("profile") || loose.includes("url") || loose.includes("social"))) {
      return "linkedin profile";
    }

    if (loose.includes("github") && (loose.includes("profile") || loose.includes("url") || loose.includes("social"))) {
      return "github profile";
    }

    return "";
  }

  function canonicalizeKey(text) {
    const loose = normalizeLooseToken(text);
    if (!loose) {
      return "";
    }

    if (loose.includes("linkedin profile")) {
      return "linkedin profile";
    }

    if (loose.includes("github profile")) {
      return "github profile";
    }

    if (
      loose.includes("authorized") &&
      loose.includes("work") &&
      (loose.includes("country") || loose.includes("legally") || loose.includes("canada"))
    ) {
      return "work authorization";
    }

    if (
      loose.includes("currently live") ||
      (loose.includes("current") && loose.includes("live")) ||
      loose.includes("country of residence") ||
      loose.includes("where do you live") ||
      loose.includes("地点") ||
      loose.includes("所在地") ||
      loose.includes("居住")
    ) {
      return "current location";
    }

    if (loose.includes("non compete")) {
      return "non compete agreement";
    }

    if (loose.includes("retain your information") || loose.includes("positions in the future")) {
      return "retain information future roles";
    }

    if (
      loose.includes("open to relocating") ||
      loose.includes("remote opportunities") ||
      loose.includes("relocat")
    ) {
      return "relocation preference";
    }

    if (
      (loose.includes("employee") && loose.includes("contractor")) ||
      (loose.includes("employed") && loose.includes("company"))
    ) {
      return "employee or contractor history";
    }

    if (loose.includes("hybrid work") && loose.includes("office")) {
      return "hybrid onsite comfort";
    }

    if (
      (loose.includes("salary") || loose.includes("compensation") || loose.includes("pay")) &&
      (
        loose.includes("requirement") ||
        loose.includes("requirements") ||
        loose.includes("expectation") ||
        loose.includes("expectations") ||
        loose.includes("expected") ||
        loose.includes("desired") ||
        loose.includes("range")
      )
    ) {
      return "salary expectation";
    }

    if (loose.includes("薪资") || loose.includes("薪酬") || loose.includes("工资") || loose.includes("期望薪资")) {
      return "salary expectation";
    }

    return normalizeToken(text);
  }

  function isValueCompatibleWithKey(key, entry, fieldTypeGroup, evidence = "") {
    const value = String(entry?.optionText || entry?.value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    if (!value) {
      return false;
    }

    if (fieldTypeGroup === "select") {
      return true;
    }

    const numericOnly = /^\d+(?:\.\d+)?$/.test(value);
    const hasUrl = value.includes("http://") || value.includes("https://") || value.includes(".com/");

    if (key === "linkedin profile") {
      return value.includes("linkedin.com");
    }

    if (key === "github profile") {
      return value.includes("github.com");
    }

    if (key === "salary expectation") {
      return hasAnyKeyword(evidence, ["salary", "compensation", "pay", "薪资", "薪酬", "工资", "期望"]) && /\d/.test(value);
    }

    if (key === "current location") {
      return (
        hasAnyKeyword(evidence, ["location", "live", "residence", "city", "country", "地点", "所在地", "居住"]) &&
        !numericOnly &&
        !hasUrl
      );
    }

    if (key.includes("job title")) {
      return !numericOnly && !hasUrl;
    }

    if (key.includes("available") || key.includes("availability") || key.includes("start")) {
      return !hasUrl;
    }

    // Unknown text keys are not auto-filled to reduce mis-fill risk.
    return false;
  }

  function hasAnyKeyword(text, keywords) {
    const normalized = normalizeLooseToken(text);
    if (!normalized) {
      return false;
    }

    return keywords.some((keyword) => {
      const token = normalizeLooseToken(keyword);
      return token && normalized.includes(token);
    });
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
