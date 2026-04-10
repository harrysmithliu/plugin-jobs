import { KEYWORD_GROUPS } from "./keywords.js";

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
  "strong experience",
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

export function analyzeJobText(jobText) {
  const normalizedText = normalizeText(jobText);
  const sentences = splitIntoSentences(normalizedText);
  const results = [];

  for (const group of KEYWORD_GROUPS) {
    for (const item of group.items) {
      const matches = collectMatches(item.aliases, sentences);

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
        snippets: unique(matches.map((match) => match.sentence)).slice(0, 3),
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

function collectMatches(aliases, sentences) {
  const matches = [];

  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    const matchedAlias = aliases.find((alias) => containsAlias(lowerSentence, alias));

    if (!matchedAlias) {
      continue;
    }

    const years = parseYears(sentence);
    const isRequired = REQUIRED_HINTS.some((hint) => lowerSentence.includes(hint));
    const isStrong = STRONG_HINTS.some((hint) => lowerSentence.includes(hint));
    const isPreferred = PREFERRED_HINTS.some((hint) => lowerSentence.includes(hint));

    matches.push({
      alias: matchedAlias,
      sentence,
      years,
      isRequired,
      isStrong,
      isPreferred
    });
  }

  return matches;
}

function containsAlias(sentence, alias) {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");

  return matcher.test(sentence);
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

function calculateScore(matches) {
  let bestScore = 0;

  for (const match of matches) {
    let score = 45;

    if (match.isRequired) {
      score += 25;
    }

    if (match.isStrong) {
      score += 12;
    }

    if (match.isPreferred) {
      score -= 10;
    }

    if (match.years !== null) {
      score += Math.min(match.years * 4, 25);
    }

    if (matches.length > 1) {
      score += Math.min((matches.length - 1) * 6, 12);
    }

    bestScore = Math.max(bestScore, score);
  }

  return clamp(bestScore, 0, 100);
}

function summarizeReasons(matches) {
  const reasons = new Set();

  if (matches.some((match) => match.isRequired)) {
    reasons.add("Required-style wording found");
  }

  if (matches.some((match) => match.isStrong)) {
    reasons.add("Strong experience wording found");
  }

  if (matches.some((match) => match.isPreferred)) {
    reasons.add("Preferred-style wording found");
  }

  const maxYears = Math.max(...matches.map((match) => match.years || 0));
  if (maxYears > 0) {
    reasons.add(`${maxYears}+ year requirement mentioned`);
  }

  if (matches.length > 1) {
    reasons.add(`Mentioned in ${matches.length} separate sentences`);
  }

  if (reasons.size === 0) {
    reasons.add("Direct keyword mention found");
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
