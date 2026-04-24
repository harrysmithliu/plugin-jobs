import { KEYWORD_GROUPS, PROFILE_KEYWORD_GROUPS } from "./keywords.js";

const REQUIRED_HINTS = [
  "must",
  "required",
  "mandatory",
  "must have",
  "must be proficient",
  "must be comfortable with",
  "core requirement",
  "required skills",
  "required qualifications",
  "requirements",
  "必须",
  "必须有",
  "精通"
];

const STRONG_HINTS = [
  "proven experience",
  "hands-on",
  "hands on",
  "expertise",
  "deep understanding",
  "proficiency with",
  "proficient with",
  "proficient in",
  "experience with",
  "experience in",
  "strong knowledge of",
  "strong experience",
  "strong development experience",
  "tech you should be comfortable with",
  "comfortable with",
  "what we're looking for",
  "qualifications",
  "skills:",
  "skill sets",
  "熟练",
  "具备"
];

const PREFERRED_HINTS = [
  "preferred",
  "preferred qualifications",
  "nice to have",
  "plus",
  "bonus",
  "good to have",
  "bonus points",
  "highly desirable",
  "desirable",
  "asset",
  "is an asset",
  "优先",
  "加分"
];

const YEAR_PATTERNS = [
  /\b(\d+)\s*[–-]\s*(\d+)\+?\s*(?:years?|yrs?)\b/i,
  /\b(\d+)\s*(?:\+|plus)?\s*(?:years?|yrs?)\b/i,
  /(\d+)\s*[–-]\s*(\d+)\+?\s*年/i,
  /(\d+)\s*年(?:\+|以上)?/i
];

const aliasRegexCache = new Map();
const SNIPPET_MAX_LENGTH = 180;
const SNIPPET_LEFT_CONTEXT = 72;
const SNIPPET_RIGHT_CONTEXT = 96;
const SNIPPET_DELIMITERS = [".", ",", ";", ":", "!", "?", "。", "，", "；", "：", "！", "？", "\n"];

export function analyzeJobText(jobText, keywordGroups = KEYWORD_GROUPS) {
  const normalizedText = normalizeText(jobText);
  const sentenceRecords = buildSentenceRecords(normalizedText);
  const results = [];

  for (const group of keywordGroups) {
    for (const item of group.items) {
      const matches = collectMatches(item, sentenceRecords);

      if (matches.length === 0) {
        results.push(buildEmptyResult(group.group, item.name));
        continue;
      }

      const score = calculateScore(matches);

      results.push({
        group: group.group,
        name: item.name,
        score,
        signal: scoreToSignal(score),
        snippets: unique(matches.map((match) => match.snippet || match.sentence)).slice(0, 3),
        reasons: summarizeReasons(matches)
      });
    }
  }

  const matchedResults = results.filter((item) => item.score > 0);
  const overallScore = matchedResults.length
    ? Math.round(matchedResults.reduce((sum, item) => sum + item.score, 0) / matchedResults.length)
    : 0;

  return {
    overallScore,
    totalKeywords: results.length,
    matchedKeywords: matchedResults.length,
    results: results
      .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
  };
}

export function analyzeJobTextByProfile(jobText, profileId = "backend") {
  const normalizedProfileId = String(profileId || "").trim().toLowerCase();
  const keywordGroups = PROFILE_KEYWORD_GROUPS[normalizedProfileId] || KEYWORD_GROUPS;
  return analyzeJobText(jobText, keywordGroups);
}

function buildEmptyResult(group, name) {
  return {
    group,
    name,
    score: 0,
    signal: "No signal",
    snippets: [],
    reasons: ["No direct mention found"]
  };
}

function collectMatches(item, sentenceRecords) {
  const matches = [];
  const aliases = item.aliases;

  for (let index = 0; index < sentenceRecords.length; index += 1) {
    const sentenceRecord = sentenceRecords[index];
    const { text: sentence, lower: lowerSentence } = sentenceRecord;
    const matchedAlias = findMatchedAlias(item, lowerSentence);

    if (!matchedAlias) {
      continue;
    }

    const contextRecords = collectContextRecords(sentenceRecords, index);
    const directYears = parseYears(sentence);
    const contextualYears = directYears ?? parseYearsFromContext(contextRecords, sentenceRecord);
    const isRequired = hasHint(lowerSentence, REQUIRED_HINTS) || hasContextualHint(contextRecords, sentenceRecord, REQUIRED_HINTS);
    const isStrong = hasHint(lowerSentence, STRONG_HINTS) || hasContextualHint(contextRecords, sentenceRecord, STRONG_HINTS);
    const isPreferred =
      hasHint(lowerSentence, PREFERRED_HINTS) || hasContextualHint(contextRecords, sentenceRecord, PREFERRED_HINTS);

    matches.push({
      alias: matchedAlias,
      sentence,
      snippet: buildMatchSnippet(item, sentence, matchedAlias),
      years: contextualYears,
      yearsSource: directYears !== null ? "direct" : contextualYears !== null ? "context" : null,
      isRequired,
      isStrong,
      isPreferred,
      looksTechnical: looksLikeTechnicalRequirement(sentence)
    });
  }

  return matches;
}

function buildSentenceRecords(text) {
  return splitIntoSentences(text).map((sentence, index) => ({
    index,
    text: sentence,
    lower: sentence.toLowerCase(),
    isHeading: looksLikeSectionHeading(sentence)
  }));
}

function containsAlias(sentence, alias) {
  const cacheKey = String(alias || "").trim().toLowerCase();
  if (!cacheKey) {
    return false;
  }

  let matcher = aliasRegexCache.get(cacheKey);
  if (!matcher) {
    const escaped = cacheKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    matcher = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
    aliasRegexCache.set(cacheKey, matcher);
  }

  return matcher.test(sentence);
}

function findMatchedAlias(item, sentence) {
  const directAlias = item.aliases.find((alias) => containsAlias(sentence, alias));
  if (directAlias) {
    return directAlias;
  }

  if (item.name === "REST APIs" && containsRestApiContext(sentence)) {
    return "rest contextual match";
  }

  if (item.name === "AI Agents" && containsAiAgentContext(sentence)) {
    return "agent contextual match";
  }

  if (item.name === "LLM APIs" && containsLlmApiContext(sentence)) {
    return "llm api contextual match";
  }

  if (item.name === "Vector DB" && containsVectorDbContext(sentence)) {
    return "vector db contextual match";
  }

  if (item.name === "Evals" && containsEvalsContext(sentence)) {
    return "eval contextual match";
  }

  return null;
}

function containsRestApiContext(sentence) {
  return /\brest(?:ful)?(?:\s*\/\s*soap)?(?:[-\s]+(?:based|style|driven))?[-\s]+(?:apis?|services?|endpoints?|framework|integration|integrations)\b/i.test(
    sentence
  );
}

function containsAiAgentContext(sentence) {
  if (!/\bagents?\b/i.test(sentence)) {
    return false;
  }

  return /\b(ai|llm|language model|agentic|orchestrat|reasoning|autonomous|tool(?:-|\s)?use|coding|copilot)\b/i.test(
    sentence
  );
}

function containsLlmApiContext(sentence) {
  return /\b(openai|anthropic|claude|gemini|bedrock|vertex ai|azure openai|google gen ai)\b[\s\S]{0,40}\bapis?\b/i.test(sentence) ||
    /\bapis?\b[\s\S]{0,40}\b(openai|anthropic|claude|gemini|bedrock|vertex ai|azure openai|google gen ai)\b/i.test(sentence);
}

function containsVectorDbContext(sentence) {
  return /\b(pinecone|weaviate|milvus|faiss|pgvector|qdrant|chromadb?|vector index|vector indexes|vector indices|vector search)\b/i.test(
    sentence
  );
}

function containsEvalsContext(sentence) {
  return /\b(model|llm|agent|rag|prompt)\s+evaluations?\b/i.test(sentence) ||
    /\bevaluations?\b[\s\S]{0,24}\b(model|llm|agent|rag|prompt)\b/i.test(sentence) ||
    /\bbenchmark(?:ing)?\b[\s\S]{0,24}\b(model|llm|agent|rag)\b/i.test(sentence);
}

function buildMatchSnippet(item, sentence, matchedAlias) {
  const normalizedSentence = String(sentence || "").replace(/\s+/g, " ").trim();
  if (!normalizedSentence) {
    return "";
  }

  if (normalizedSentence.length <= SNIPPET_MAX_LENGTH) {
    return normalizedSentence;
  }

  const anchor = findSnippetAnchor(normalizedSentence, item, matchedAlias);
  if (!anchor) {
    return `${normalizedSentence.slice(0, SNIPPET_MAX_LENGTH - 1).trim()}…`;
  }

  const lowerSentence = normalizedSentence.toLowerCase();
  const lowerAnchor = anchor.toLowerCase();
  const anchorIndex = lowerSentence.indexOf(lowerAnchor);

  if (anchorIndex < 0) {
    return `${normalizedSentence.slice(0, SNIPPET_MAX_LENGTH - 1).trim()}…`;
  }

  let start = Math.max(0, anchorIndex - SNIPPET_LEFT_CONTEXT);
  let end = Math.min(normalizedSentence.length, anchorIndex + lowerAnchor.length + SNIPPET_RIGHT_CONTEXT);

  const leftBoundary = findLeftBoundary(normalizedSentence, start, anchorIndex);
  if (leftBoundary !== -1) {
    start = leftBoundary + 1;
  }

  const rightBoundary = findRightBoundary(normalizedSentence, anchorIndex + lowerAnchor.length, end);
  if (rightBoundary !== -1) {
    end = rightBoundary;
  }

  let snippet = normalizedSentence.slice(start, end).trim();
  if (snippet.length > SNIPPET_MAX_LENGTH) {
    snippet = snippet.slice(0, SNIPPET_MAX_LENGTH - 1).trim();
  }

  if (start > 0) {
    snippet = `…${snippet}`;
  }

  if (end < normalizedSentence.length) {
    snippet = `${snippet}…`;
  }

  return snippet;
}

function findSnippetAnchor(sentence, item, matchedAlias) {
  const lowerSentence = sentence.toLowerCase();
  const candidates = [];

  if (matchedAlias && !/contextual match/i.test(matchedAlias)) {
    candidates.push(String(matchedAlias));
  }

  candidates.push(...getSnippetAnchorTerms(item.name));
  const uniqueCandidates = unique(candidates.map((term) => String(term || "").trim()).filter(Boolean));

  for (const candidate of uniqueCandidates) {
    if (lowerSentence.includes(candidate.toLowerCase())) {
      return candidate;
    }
  }

  return null;
}

function getSnippetAnchorTerms(keywordName) {
  switch (keywordName) {
    case "AI Agents":
      return ["ai agents", "agentic", "autonomous agents", "agent orchestration", "coding agents", "agent"];
    case "LLM APIs":
      return ["openai api", "claude api", "gemini api", "llm api", "model api", "apis"];
    case "Vector DB":
      return ["vector db", "vector database", "vector search", "pinecone", "weaviate", "milvus", "faiss", "pgvector", "qdrant", "chroma"];
    case "Evals":
      return ["llm eval", "model eval", "agent eval", "evaluation", "benchmark", "benchmarking"];
    case "REST APIs":
      return ["rest api", "restful api", "rest/soap", "rest services", "rest endpoints"];
    default:
      return [String(keywordName || "")];
  }
}

function findLeftBoundary(text, fromIndex, toIndex) {
  const start = Math.max(0, fromIndex);
  const end = Math.min(text.length - 1, toIndex - 1);

  for (let index = end; index >= start; index -= 1) {
    if (SNIPPET_DELIMITERS.includes(text[index])) {
      return index;
    }
  }

  return -1;
}

function findRightBoundary(text, fromIndex, toIndex) {
  const start = Math.max(0, fromIndex);
  const end = Math.min(text.length - 1, toIndex);

  for (let index = start; index <= end; index += 1) {
    if (SNIPPET_DELIMITERS.includes(text[index])) {
      return index;
    }
  }

  return -1;
}

function collectContextRecords(sentenceRecords, index) {
  const current = sentenceRecords[index];
  const previous = sentenceRecords[index - 1];
  const context = [];

  if (isRelevantContextRecord(previous)) {
    context.push(previous);
  }

  context.push(current);

  return context;
}

function isRelevantContextRecord(record) {
  if (!record) {
    return false;
  }

  return record.isHeading;
}

function hasContextualHint(contextRecords, currentRecord, hints) {
  return contextRecords.some((record) => {
    if (record.index === currentRecord.index) {
      return false;
    }

    if (!record.isHeading) {
      return false;
    }

    return hasHint(record.lower, hints);
  });
}

function hasHint(lowerText, hints) {
  return hints.some((hint) => lowerText.includes(hint));
}

function parseYears(sentence) {
  for (const pattern of YEAR_PATTERNS) {
    const matched = sentence.match(pattern);
    if (!matched) {
      continue;
    }

    const values = matched
      .slice(1)
      .filter(Boolean)
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isFinite(value));

    if (values.length > 0) {
      return Math.max(...values);
    }
  }

  return null;
}

function parseYearsFromContext(contextRecords, currentRecord) {
  for (const record of contextRecords) {
    if (record.index === currentRecord.index) {
      continue;
    }

    const years = parseYears(record.text);
    if (years !== null) {
      return years;
    }
  }

  return null;
}

function looksLikeSectionHeading(sentence) {
  const trimmed = sentence.trim();
  const lower = trimmed.toLowerCase();
  const headingTerms = [
    "qualifications",
    "required qualifications",
    "preferred qualifications",
    "requirements",
    "responsibilities",
    "must have",
    "nice to have",
    "bonus points",
    "about the job",
    "job summary",
    "position summary",
    "what you'll do",
    "what you will do"
  ];

  if (trimmed.length <= 90 && trimmed.endsWith(":")) {
    return true;
  }

  if (
    trimmed.length <= 56 &&
    !/[.!?]$/.test(trimmed) &&
    headingTerms.some((term) => lower === term || lower.startsWith(`${term} `))
  ) {
    return true;
  }

  return (
    trimmed.length <= 56 &&
    !/[.!?]$/.test(trimmed) &&
    trimmed.split(/\s+/).length <= 6 &&
    /^[A-Z][A-Za-z0-9/&(),+\- ]+$/.test(trimmed)
  );
}

function looksLikeTechnicalRequirement(sentence) {
  return /(develop|building|build|implement|design|architecture|api|backend|frontend|service|database|cloud|experience|proficien|knowledge|stack|microservice|deployment|security)/i.test(
    sentence
  );
}

function calculateScore(matches) {
  const mentionCount = unique(matches.map((match) => match.sentence)).length;
  let bestScore = 0;

  for (const match of matches) {
    let score = 34;

    if (match.isRequired) {
      score += 24;
    }

    if (match.isStrong) {
      score += 10;
    }

    if (match.isPreferred && !match.isRequired) {
      score -= 8;
    }

    if (match.years !== null) {
      const yearBonus = match.yearsSource === "direct" ? 10 + match.years * 2 : 6 + match.years * 2;
      score += Math.min(yearBonus, match.yearsSource === "direct" ? 24 : 18);
    }

    if (match.looksTechnical) {
      score += 5;
    }

    if (!match.isRequired && !match.isStrong && match.years === null && !match.looksTechnical) {
      score -= 6;
    }

    if (mentionCount > 1) {
      score += Math.min((mentionCount - 1) * 4, 10);
    }

    bestScore = Math.max(bestScore, score);
  }

  return clamp(bestScore, 0, 100);
}

function summarizeReasons(matches) {
  const reasons = new Set();

  if (matches.some((match) => match.isRequired)) {
    reasons.add("Required evidence");
  }

  if (matches.some((match) => match.isStrong)) {
    reasons.add("Strong experience evidence");
  }

  if (matches.some((match) => match.isPreferred)) {
    reasons.add("Preferred evidence");
  }

  const maxYears = Math.max(...matches.map((match) => match.years || 0));
  if (maxYears > 0) {
    reasons.add(`${maxYears}+ years near keyword`);
  }

  const mentionCount = unique(matches.map((match) => match.sentence)).length;
  if (mentionCount > 1) {
    reasons.add(`Seen in ${mentionCount} JD lines`);
  }

  if (reasons.size === 0) {
    reasons.add("Direct mention");
  }

  return Array.from(reasons);
}

function scoreToSignal(score) {
  if (score >= 80) {
    return "High";
  }

  if (score >= 55) {
    return "Medium";
  }

  if (score > 0) {
    return "Low";
  }

  return "No signal";
}

function normalizeText(text) {
  return text
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitIntoSentences(text) {
  return text
    .split(/\n+|(?<=[.!?。！？])\s+|[•▪·]/)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.length >= 4);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function unique(items) {
  return Array.from(new Set(items));
}
