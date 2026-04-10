(() => {
  const ROOT_ID = "jd-keyword-analyzer-overlay-root";
  let setStatusSafely = null;

  window.addEventListener("error", (event) => {
    if (!isExtensionContextInvalidated(event?.error || event?.message)) {
      return;
    }

    event.preventDefault();
    notifyInvalidatedContext();
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (!isExtensionContextInvalidated(event?.reason)) {
      return;
    }

    event.preventDefault();
    notifyInvalidatedContext();
  });

  const KEYWORD_DISPLAY_ORDER = [
    "Java",
    "Spring Boot",
    "SQL",
    "MySQL",
    "PostgreSQL",
    "Redis",
    "RabbitMQ",
    "Microservices",
    "Docker",
    "GitHub",
    "GitHub Actions",
    "REST APIs",
    "JWT",
    "AWS",
    "EC2",
    "EKS",
    "Nginx",
    "CI/CD",
    "Kafka",
    "MongoDB",
    "Prometheus",
    "Grafana",
    "k6",
    "Python",
    "FastAPI",
    "React",
    "TypeScript",
    "Vite"
  ];

  const KEYWORD_COLOR_GROUPS = {
    green: new Set([
      "Java",
      "Spring Boot",
      "SQL",
      "MySQL",
      "PostgreSQL",
      "Redis",
      "RabbitMQ",
      "Microservices",
      "Docker",
      "GitHub",
      "GitHub Actions",
      "REST APIs",
      "JWT"
    ]),
    yellow: new Set([
      "AWS",
      "EC2",
      "EKS",
      "Nginx",
      "CI/CD",
      "Kafka",
      "MongoDB",
      "Prometheus",
      "Grafana",
      "k6"
    ]),
    orange: new Set([
      "Python",
      "FastAPI",
      "React",
      "TypeScript",
      "Vite"
    ])
  };

  const COLOR_LABELS = {
    green: "Green",
    yellow: "Yellow",
    orange: "Orange",
    red: "Other"
  };

  const KEYWORD_GROUPS = [
    {
      group: "Backend",
      items: [
        { name: "Java", aliases: ["java", "j2ee"] },
        { name: "Spring Boot", aliases: ["spring boot", "springboot", "spring framework"] },
        { name: "Python", aliases: ["python"] },
        { name: "FastAPI", aliases: ["fastapi", "fast api"] },
        { name: "Go", aliases: ["golang", "go language"] },
        { name: ".NET", aliases: [".net", ".net core", "dot net", "dot net core", "asp.net core", "asp.net mvc"] },
        { name: "C#", aliases: ["c#", "c sharp"] },
        { name: "NestJS", aliases: ["nestjs", "nest js"] },
        { name: "Django", aliases: ["django"] }
      ]
    },
    {
      group: "Frontend",
      items: [
        { name: "React", aliases: ["react", "react.js", "reactjs"] },
        { name: "TypeScript", aliases: ["typescript"] },
        { name: "Vite", aliases: ["vite"] },
        { name: "Next.js", aliases: ["next.js", "nextjs", "next js"] },
        { name: "Angular", aliases: ["angular"] },
        { name: "ShadCN", aliases: ["shadcn", "shadcn/ui"] }
      ]
    },
    {
      group: "Data",
      items: [
        { name: "SQL", aliases: ["sql", "pl/sql", "plsql", "rdbms"] },
        { name: "PostgreSQL", aliases: ["postgresql", "postgres", "postgre sql"] },
        { name: "MySQL", aliases: ["mysql"] },
        { name: "MongoDB", aliases: ["mongodb", "mongo db"] },
        { name: "Redis", aliases: ["redis"] },
        { name: "Oracle", aliases: ["oracle", "oracle adf"] },
        { name: "Snowflake", aliases: ["snowflake"] },
        { name: "ClickHouse", aliases: ["clickhouse"] },
        { name: "Vector DB", aliases: ["vector db", "vector database", "vector databases", "vectordb", "vector store", "vector stores"] }
      ]
    },
    {
      group: "Messaging & Workflow",
      items: [
        { name: "RabbitMQ", aliases: ["rabbitmq", "rabbit mq"] },
        { name: "Kafka", aliases: ["kafka", "apache kafka"] },
        { name: "Microservices", aliases: ["microservices", "microservice", "distributed systems", "distributed system"] },
        { name: "SQS", aliases: ["sqs", "amazon sqs"] },
        { name: "Temporal", aliases: ["temporal", "temporal.io"] }
      ]
    },
    {
      group: "Infrastructure",
      items: [
        { name: "Docker", aliases: ["docker"] },
        { name: "Docker Compose", aliases: ["docker compose", "docker-compose"] },
        { name: "Kubernetes", aliases: ["kubernetes", "k8s"] },
        { name: "Terraform", aliases: ["terraform"] },
        { name: "Helm", aliases: ["helm"] }
      ]
    },
    {
      group: "Cloud",
      items: [
        { name: "AWS", aliases: ["aws", "amazon web services"] },
        { name: "Azure", aliases: ["azure", "microsoft azure"] },
        { name: "GCP", aliases: ["gcp", "google cloud", "google cloud platform"] },
        { name: "EC2", aliases: ["ec2"] },
        { name: "EKS", aliases: ["eks", "elastic kubernetes service"] },
        { name: "AKS", aliases: ["aks", "azure kubernetes service"] },
        { name: "Nginx", aliases: ["nginx"] }
      ]
    },
    {
      group: "Delivery",
      items: [
        { name: "GitHub", aliases: ["github", "git hub"] },
        { name: "GitHub Actions", aliases: ["github actions", "github action"] },
        { name: "CI/CD", aliases: ["ci/cd", "cicd", "continuous integration", "continuous delivery", "continuous deployment"] },
        { name: "Jenkins", aliases: ["jenkins", "cloudbees jenkins"] },
        { name: "GitOps", aliases: ["gitops"] },
        { name: "ArgoCD", aliases: ["argocd", "argo cd"] }
      ]
    },
    {
      group: "API & Auth",
      items: [
        { name: "REST APIs", aliases: ["rest api", "restful api", "rest apis", "restful apis", "rest over http"] },
        { name: "OpenAPI", aliases: ["openapi", "swagger"] },
        { name: "GraphQL", aliases: ["graphql"] },
        { name: "JWT", aliases: ["jwt", "json web token", "json web tokens", "jwt validation"] },
        { name: "OAuth2", aliases: ["oauth2", "oauth 2", "oauth 2.0", "oauth"] },
        { name: "SAML", aliases: ["saml", "saml endpoints"] },
        { name: "API Gateway", aliases: ["api gateway", "apic", "api connect", "ibm api connect", "datapower"] },
        { name: "Webhooks", aliases: ["webhook", "webhooks"] }
      ]
    },
    {
      group: "AI & LLM",
      items: [
        { name: "LLM", aliases: ["llm", "llms", "large language model", "large language models"] },
        { name: "GenAI", aliases: ["genai", "generative ai", "ai-native", "ai native"] },
        { name: "Prompt Engineering", aliases: ["prompt engineering", "prompt writing", "prompt-driven", "prompt driven"] },
        { name: "RAG", aliases: ["rag", "retrieval augmented generation", "rag-style systems", "rag pipelines"] },
        { name: "LangChain", aliases: ["langchain"] },
        { name: "AI Agents", aliases: ["agentic", "ai agent", "ai agents", "agent workflows", "agent systems", "conversational agents", "multimodal ai agents"] },
        { name: "MCP", aliases: ["mcp", "mcp servers"] },
        { name: "LLM APIs", aliases: ["llm api", "llm apis", "openai", "claude", "gemini"] }
      ]
    },
    {
      group: "Observability",
      items: [
        { name: "Prometheus", aliases: ["prometheus"] },
        { name: "Grafana", aliases: ["grafana"] },
        { name: "k6", aliases: ["k6"] },
        { name: "Observability", aliases: ["observability", "monitoring"] }
      ]
    }
  ];

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

  const existingRoot = document.getElementById(ROOT_ID);
  if (existingRoot) {
    existingRoot.hidden = false;
    existingRoot.style.display = "block";
    existingRoot.style.zIndex = "2147483647";
    existingRoot.dispatchEvent(new CustomEvent("jd-analyzer-focus"));
    return;
  }

  const host = document.createElement("div");
  host.id = ROOT_ID;
  host.style.position = "fixed";
  host.style.top = "24px";
  host.style.left = "24px";
  host.style.width = "min(720px, calc(100vw - 48px))";
  host.style.height = "min(88vh, calc(100vh - 48px))";
  host.style.minWidth = "420px";
  host.style.minHeight = "360px";
  host.style.maxWidth = "calc(100vw - 24px)";
  host.style.maxHeight = "calc(100vh - 24px)";
  host.style.resize = "both";
  host.style.overflow = "hidden";
  host.style.zIndex = "2147483647";
  host.style.boxSizing = "border-box";
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host {
        all: initial;
      }

      * {
        box-sizing: border-box;
      }

      .shell {
        height: 100%;
        display: flex;
        flex-direction: column;
        border: 1px solid rgba(15, 23, 42, 0.14);
        border-radius: 16px;
        overflow: hidden;
        background: #f8fafc;
        color: #0f172a;
        font-family: "Segoe UI", Tahoma, sans-serif;
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 14px;
        border-bottom: 1px solid #dbe3ec;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        cursor: move;
        user-select: none;
      }

      .header-title {
        min-width: 0;
      }

      .header-title h1 {
        margin: 0;
        font-size: 18px;
        line-height: 1.2;
      }

      .header-title p {
        margin: 3px 0 0;
        color: #64748b;
        font-size: 12px;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      button {
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        padding: 9px 12px;
        background: #ffffff;
        color: #0f172a;
        font: inherit;
        cursor: pointer;
      }

      button:hover {
        background: #f1f5f9;
      }

      button:disabled {
        opacity: 0.6;
        cursor: wait;
      }

      .primary-button {
        background: #111827;
        border-color: #111827;
        color: #ffffff;
      }

      .primary-button:hover {
        background: #1f2937;
      }

      .icon-button {
        min-width: 42px;
        padding: 9px 10px;
      }

      .body {
        flex: 1;
        overflow: auto;
        padding: 14px;
      }

      .status-block,
      .summary-card,
      .results,
      .raw-section {
        margin-bottom: 14px;
        border: 1px solid #dde3e8;
        border-radius: 12px;
        background: #ffffff;
        padding: 12px;
      }

      .status {
        margin: 0;
        font-size: 13px;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px 16px;
      }

      .summary-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .summary-row span {
        color: #64748b;
        font-size: 12px;
      }

      .summary-row strong {
        font-size: 14px;
        word-break: break-word;
      }

      .results h2,
      .raw-section h2 {
        margin: 0 0 12px;
        font-size: 15px;
      }

      .results-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .result-card {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 12px;
        background: #fafafa;
        border-left-width: 6px;
      }

      .result-card--green {
        border-left-color: #2f855a;
      }

      .result-card--yellow {
        border-left-color: #b7791f;
      }

      .result-card--orange {
        border-left-color: #dd6b20;
      }

      .result-card--red {
        border-left-color: #c53030;
      }

      .result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }

      .result-name-block {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .result-name {
        font-weight: 600;
      }

      .result-badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 2px 8px;
        font-size: 11px;
        font-weight: 700;
      }

      .result-badge--green {
        background: #e6f6ec;
        color: #1f6f43;
      }

      .result-badge--yellow {
        background: #fff6dd;
        color: #8a5a00;
      }

      .result-badge--orange {
        background: #fff0e5;
        color: #a64b00;
      }

      .result-badge--red {
        background: #fdeaea;
        color: #a61b1b;
      }

      .result-score {
        color: #111827;
        font-weight: 700;
        white-space: nowrap;
      }

      .result-meta {
        margin-top: 6px;
        color: #52606d;
        font-size: 12px;
      }

      .snippet-list {
        margin: 8px 0 0;
        padding-left: 18px;
      }

      .snippet-list li {
        margin: 6px 0;
      }

      .snippet-empty {
        margin-top: 8px;
        color: #6b7280;
        font-size: 12px;
      }

      .raw-text {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 320px;
        overflow: auto;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        line-height: 1.45;
      }

      @media (max-width: 720px) {
        .summary-grid {
          grid-template-columns: 1fr;
        }

        .header {
          flex-wrap: wrap;
          cursor: default;
        }
      }
    </style>
    <div class="shell">
      <div class="header" id="dragHandle">
        <div class="header-title">
          <h1>JD Keyword Analyzer</h1>
          <p>Drag this window, resize from the corner, or maximize it</p>
        </div>
        <div class="header-actions">
          <button id="analyzeButton" class="primary-button">Analyze JD</button>
          <button id="toggleRawButton" hidden>Show Raw Text</button>
          <button id="maximizeButton" class="icon-button" title="Toggle fullscreen">[]</button>
          <button id="closeButton" class="icon-button" title="Close">X</button>
        </div>
      </div>

      <div class="body">
        <section class="status-block">
          <p id="status" class="status">Reading the current page...</p>
        </section>

        <section id="summarySection" class="summary-card" hidden>
          <div class="summary-grid">
            <div class="summary-row">
              <span>Job Title</span>
              <strong id="jobTitle">-</strong>
            </div>
            <div class="summary-row">
              <span>Company</span>
              <strong id="companyName">-</strong>
            </div>
            <div class="summary-row">
              <span>Overall Signal</span>
              <strong id="overallScore">-</strong>
            </div>
            <div class="summary-row">
              <span>Source</span>
              <strong id="sourceLabel">-</strong>
            </div>
            <div class="summary-row">
              <span>Cached</span>
              <strong id="cachedAt">-</strong>
            </div>
            <div class="summary-row">
              <span>Current URL</span>
              <strong id="currentUrl">-</strong>
            </div>
          </div>
        </section>

        <section id="resultsSection" class="results" hidden>
          <h2>Keyword Scores</h2>
          <div id="resultsList" class="results-list"></div>
        </section>

        <section id="rawSection" class="raw-section" hidden>
          <h2>Extracted JD</h2>
          <pre id="rawText" class="raw-text"></pre>
        </section>
      </div>
    </div>
  `;

  const analyzeButton = shadow.getElementById("analyzeButton");
  const toggleRawButton = shadow.getElementById("toggleRawButton");
  const maximizeButton = shadow.getElementById("maximizeButton");
  const closeButton = shadow.getElementById("closeButton");
  const dragHandle = shadow.getElementById("dragHandle");
  const statusElement = shadow.getElementById("status");
  const summarySection = shadow.getElementById("summarySection");
  const resultsSection = shadow.getElementById("resultsSection");
  const rawSection = shadow.getElementById("rawSection");
  const resultsList = shadow.getElementById("resultsList");
  const rawTextElement = shadow.getElementById("rawText");
  const jobTitleElement = shadow.getElementById("jobTitle");
  const companyNameElement = shadow.getElementById("companyName");
  const overallScoreElement = shadow.getElementById("overallScore");
  const sourceLabelElement = shadow.getElementById("sourceLabel");
  const cachedAtElement = shadow.getElementById("cachedAt");
  const currentUrlElement = shadow.getElementById("currentUrl");

  let isRawVisible = false;
  let isMaximized = false;
  let restoreRect = null;
  let dragState = null;

  host.addEventListener("jd-analyzer-focus", () => {
    host.style.zIndex = "2147483647";
  });

  analyzeButton.addEventListener("click", () => {
    analyzeCurrentPage();
  });

  toggleRawButton.addEventListener("click", () => {
    isRawVisible = !isRawVisible;
    rawSection.hidden = !isRawVisible;
    toggleRawButton.textContent = isRawVisible ? "Hide Raw Text" : "Show Raw Text";
  });

  maximizeButton.addEventListener("click", toggleMaximize);
  closeButton.addEventListener("click", () => host.remove());
  dragHandle.addEventListener("dblclick", toggleMaximize);
  dragHandle.addEventListener("mousedown", startDrag);
  window.addEventListener("mousemove", onDrag);
  window.addEventListener("mouseup", stopDrag);

  analyzeCurrentPage();

  async function analyzeCurrentPage() {
    setLoading(true);
    hideResults();

    try {
      const extraction = await extractJobDescription();

      if (!extraction?.jobText) {
        throw new Error("No job description text was found on this page.");
      }

      const analysis = analyzeJobText(extraction.jobText);
      const cacheEntry = {
        url: extraction.url,
        hostname: extraction.hostname,
        title: extraction.pageTitle,
        extractedAt: new Date().toISOString(),
        extraction,
        analysis
      };

      renderResult(cacheEntry, false);
      await saveCachedAnalysis(cacheEntry);
    } catch (error) {
      if (isExtensionContextInvalidated(error)) {
        setStatus("This floating window belongs to an older extension version. Close it and reopen the analyzer.", true);
        return;
      }

      const cached = await getCachedAnalysis(window.location.href);

      if (cached) {
        renderResult(cached, true);
        setStatus(
          `Live extraction failed, showing cached analysis instead. ${error.message || ""}`.trim(),
          true
        );
      } else {
        setStatus(error.message || "Failed to analyze this page.", true);
      }
    } finally {
      setLoading(false);
    }
  }

  function renderResult(cacheEntry, fromCache) {
    const { extraction, analysis, extractedAt } = cacheEntry;

    setStatus(
      fromCache
        ? `Loaded ${analysis.matchedKeywords} matched keywords from cache for this page.`
        : `Extracted ${analysis.matchedKeywords} matched keywords from ${analysis.totalKeywords} tracked items.`
    );

    summarySection.hidden = false;
    resultsSection.hidden = false;
    toggleRawButton.hidden = false;
    rawTextElement.textContent = extraction.jobText;
    rawSection.hidden = !isRawVisible;

    jobTitleElement.textContent = extraction.jobTitle || extraction.pageTitle || "-";
    companyNameElement.textContent = extraction.companyName || "-";
    overallScoreElement.textContent = analysis.overallScore ? `${analysis.overallScore}%` : "No direct signal";
    sourceLabelElement.textContent = extraction.extractionSource || extraction.hostname || "-";
    cachedAtElement.textContent = extractedAt ? formatDateTime(extractedAt) : "Not saved";
    currentUrlElement.textContent = extraction.url || window.location.href;

    resultsList.replaceChildren();

    const orderedResults = sortResultsForDisplay(analysis.results);

    for (const item of orderedResults) {
      const colorGroup = getColorGroup(item.name);
      const card = document.createElement("article");
      card.className = `result-card result-card--${colorGroup}`;

      const header = document.createElement("div");
      header.className = "result-header";

      const nameBlock = document.createElement("div");
      nameBlock.className = "result-name-block";

      const name = document.createElement("div");
      name.className = "result-name";
      name.textContent = item.name;

      const badge = document.createElement("span");
      badge.className = `result-badge result-badge--${colorGroup}`;
      badge.textContent = COLOR_LABELS[colorGroup];

      nameBlock.append(name, badge);

      const score = document.createElement("div");
      score.className = "result-score";
      score.textContent = `${item.score}%`;

      const meta = document.createElement("div");
      meta.className = "result-meta";
      meta.textContent = `${item.group} | ${item.signal} | ${item.reasons.join(" | ")}`;

      header.append(nameBlock, score);
      card.append(header, meta);

      if (item.snippets.length > 0) {
        const snippets = document.createElement("ul");
        snippets.className = "snippet-list";

        for (const snippet of item.snippets) {
          const snippetItem = document.createElement("li");
          snippetItem.textContent = snippet;
          snippets.appendChild(snippetItem);
        }

        card.appendChild(snippets);
      } else {
        const empty = document.createElement("p");
        empty.className = "snippet-empty";
        empty.textContent = "No supporting snippet.";
        card.appendChild(empty);
      }

      resultsList.appendChild(card);
    }
  }

  function hideResults() {
    summarySection.hidden = true;
    resultsSection.hidden = true;
    rawSection.hidden = true;
    toggleRawButton.hidden = true;
    resultsList.replaceChildren();
  }

  function setLoading(isLoading) {
    analyzeButton.disabled = isLoading;
    analyzeButton.textContent = isLoading ? "Analyzing..." : "Analyze JD";
    if (isLoading) {
      setStatus("Reading the current page and scoring keyword matches...");
    }
  }

  function setStatus(message, isError = false) {
    statusElement.textContent = message;
    statusElement.style.color = isError ? "#b91c1c" : "#1f2933";
  }

  setStatusSafely = setStatus;

  function startDrag(event) {
    if (window.innerWidth <= 720) {
      return;
    }

    if (isMaximized) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    if (event.target.closest("button")) {
      return;
    }

    const rect = host.getBoundingClientRect();
    dragState = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
    event.preventDefault();
  }

  function onDrag(event) {
    if (!dragState) {
      return;
    }

    const maxLeft = Math.max(12, window.innerWidth - host.offsetWidth - 12);
    const maxTop = Math.max(12, window.innerHeight - host.offsetHeight - 12);
    const nextLeft = clamp(event.clientX - dragState.offsetX, 12, maxLeft);
    const nextTop = clamp(event.clientY - dragState.offsetY, 12, maxTop);

    host.style.left = `${nextLeft}px`;
    host.style.top = `${nextTop}px`;
  }

  function stopDrag() {
    dragState = null;
  }

  function toggleMaximize() {
    if (!isMaximized) {
      const rect = host.getBoundingClientRect();
      restoreRect = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      };
      host.style.left = "12px";
      host.style.top = "12px";
      host.style.width = "calc(100vw - 24px)";
      host.style.height = "calc(100vh - 24px)";
      host.style.maxWidth = "calc(100vw - 24px)";
      host.style.maxHeight = "calc(100vh - 24px)";
      maximizeButton.textContent = "<>";
      isMaximized = true;
      return;
    }

    if (restoreRect) {
      host.style.left = `${restoreRect.left}px`;
      host.style.top = `${restoreRect.top}px`;
      host.style.width = `${restoreRect.width}px`;
      host.style.height = `${restoreRect.height}px`;
      host.style.maxWidth = "calc(100vw - 24px)";
      host.style.maxHeight = "calc(100vh - 24px)";
    }
    maximizeButton.textContent = "[]";
    isMaximized = false;
  }

  function sortResultsForDisplay(results) {
    const displayOrder = new Map(KEYWORD_DISPLAY_ORDER.map((name, index) => [name, index]));

    return [...results].sort((left, right) => {
      const leftIndex = displayOrder.has(left.name) ? displayOrder.get(left.name) : Number.MAX_SAFE_INTEGER;
      const rightIndex = displayOrder.has(right.name) ? displayOrder.get(right.name) : Number.MAX_SAFE_INTEGER;

      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }

      const leftColor = colorRank(getColorGroup(left.name));
      const rightColor = colorRank(getColorGroup(right.name));
      if (leftColor !== rightColor) {
        return leftColor - rightColor;
      }

      if (!displayOrder.has(left.name) && !displayOrder.has(right.name) && left.score !== right.score) {
        return right.score - left.score;
      }

      return left.name.localeCompare(right.name);
    });
  }

  function getColorGroup(keywordName) {
    if (KEYWORD_COLOR_GROUPS.green.has(keywordName)) {
      return "green";
    }

    if (KEYWORD_COLOR_GROUPS.yellow.has(keywordName)) {
      return "yellow";
    }

    if (KEYWORD_COLOR_GROUPS.orange.has(keywordName)) {
      return "orange";
    }

    return "red";
  }

  function colorRank(color) {
    const rank = {
      green: 0,
      yellow: 1,
      orange: 2,
      red: 3
    };

    return rank[color] ?? 99;
  }

  async function saveCachedAnalysis(entry) {
    try {
      const stored = await chrome.storage.local.get({ analysisCacheByUrl: {} });
      const analysisCacheByUrl = stored.analysisCacheByUrl || {};
      analysisCacheByUrl[entry.url] = entry;

      await chrome.storage.local.set({
        analysisCacheByUrl,
        lastAnalysis: entry
      });
    } catch (error) {
      if (!isExtensionContextInvalidated(error)) {
        throw error;
      }
    }
  }

  async function getCachedAnalysis(url) {
    try {
      const stored = await chrome.storage.local.get({ analysisCacheByUrl: {} });
      return stored.analysisCacheByUrl?.[url] || null;
    } catch (error) {
      if (isExtensionContextInvalidated(error)) {
        return null;
      }

      throw error;
    }
  }

  function isExtensionContextInvalidated(error) {
    const message = String(error?.message || error || "");
    return message.toLowerCase().includes("extension context invalidated");
  }

  function notifyInvalidatedContext() {
    if (typeof setStatusSafely === "function") {
      setStatusSafely("This floating window belongs to an older extension version. Close it and reopen the analyzer.", true);
    }
  }

  function formatDateTime(isoString) {
    const parsed = new Date(isoString);

    if (Number.isNaN(parsed.getTime())) {
      return "Unknown";
    }

    return parsed.toLocaleString();
  }

  async function extractJobDescription() {
    const cleanText = (value) => (value || "").replace(/\s+/g, " ").trim();
    const textFromSelector = (selector) => {
      const element = document.querySelector(selector);
      return cleanText(element?.innerText || element?.textContent || "");
    };

    const hostname = window.location.hostname;
    const pageTitle = document.title;

    const linkedInDescriptionSelectors = [
      ".jobs-description-content__text",
      ".jobs-box__html-content",
      ".jobs-description__content",
      ".show-more-less-html__markup",
      ".jobs-search__job-details--container .jobs-box__html-content",
      ".jobs-search__right-rail .jobs-box__html-content"
    ];

    const indeedDescriptionSelectors = [
      "#jobDescriptionText",
      ".jobsearch-JobComponent-description",
      "[data-testid='jobsearch-JobComponent-description']",
      "[data-testid='jobsearch-jobDescriptionText']",
      ".jobsearch-InfoHeaderContainer + div"
    ];

    await expandCollapsedSections(hostname, linkedInDescriptionSelectors, indeedDescriptionSelectors);

    let jobText = "";
    let extractionSource = "fallback-largest-block";

    if (hostname.includes("linkedin.com")) {
      const found = findLinkedInJobDescription() || collectTextBySelectors(linkedInDescriptionSelectors, "linkedin");
      if (found) {
        jobText = found.text;
        extractionSource = found.selector;
      }
    } else if (hostname.includes("indeed.com")) {
      const found = findIndeedJobDescription() || collectTextBySelectors(indeedDescriptionSelectors, "indeed");
      if (found) {
        jobText = found.text;
        extractionSource = found.selector;
      }
    }

    if (!jobText) {
      const fallbackCandidates = Array.from(document.querySelectorAll("main, article, section, div"))
        .map((element) => ({
          text: cleanText(element.innerText || element.textContent || ""),
          selector: describeElement(element)
        }))
        .map((entry) => normalizeFallbackEntry(entry, hostname))
        .filter(Boolean)
        .filter((entry) => entry.text.length >= 400)
        .sort((left, right) => right.text.length - left.text.length);

      jobText = fallbackCandidates[0]?.text || "";
      extractionSource = fallbackCandidates[0]?.selector || extractionSource;
    }

    const jobTitle = cleanText(
      textFromSelector(".job-details-jobs-unified-top-card__job-title") ||
        textFromSelector(".top-card-layout__title") ||
        textFromSelector("[data-testid='jobsearch-JobInfoHeader-title']") ||
        textFromSelector(".jobsearch-JobInfoHeader-title") ||
        textFromSelector("h1") ||
        cleanMetaContent('meta[property="og:title"]') ||
        titleFromDocument(pageTitle)
    );

    const companyName = cleanText(
      textFromSelector(".job-details-jobs-unified-top-card__company-name") ||
        textFromSelector(".topcard__org-name-link") ||
        textFromSelector(".topcard__flavor") ||
        textFromSelector("[data-testid='inlineHeader-companyName']") ||
        textFromSelector("[data-company-name='true']") ||
        textFromSelector(".jobsearch-CompanyInfoWithoutHeaderImage div") ||
        cleanMetaContent('meta[name="twitter:title"]') ||
        companyFromDocument(pageTitle)
    );

    return {
      url: window.location.href,
      hostname,
      pageTitle,
      jobTitle,
      companyName,
      jobText,
      extractionSource
    };

    function collectTextBySelectors(selectors, platform) {
      for (const selector of selectors) {
        const rawText = textFromSelector(selector);
        const text = normalizeTextForPlatform(rawText, platform);
        if (text.length >= 200) {
          return { text, selector };
        }
      }

      return null;
    }

    function cleanMetaContent(selector) {
      const element = document.querySelector(selector);
      return cleanText(element?.getAttribute("content") || "");
    }

    function titleFromDocument(title) {
      const cleanTitle = cleanText(title);
      const fragments = cleanTitle
        .split(/[-|@]/)
        .map((fragment) => cleanText(fragment))
        .filter(Boolean);

      return fragments[0] || "";
    }

    function companyFromDocument(title) {
      const cleanTitle = cleanText(title);
      const fragments = cleanTitle
        .split(/[-|@]/)
        .map((fragment) => cleanText(fragment))
        .filter(Boolean);

      return fragments[1] || "";
    }

    function describeElement(element) {
      if (!element) {
        return "unknown";
      }

      if (element.id) {
        return `#${element.id}`;
      }

      if (element.className && typeof element.className === "string") {
        const firstClass = element.className.split(/\s+/).filter(Boolean)[0];
        if (firstClass) {
          return `.${firstClass}`;
        }
      }

      return element.tagName.toLowerCase();
    }

    function findIndeedJobDescription() {
      const heading = findHeadingByText(["full job description"]);
      const descriptionNode = document.querySelector("#jobDescriptionText");

      if (heading && descriptionNode) {
        const text = cleanText(descriptionNode.innerText || descriptionNode.textContent || "");
        if (text.length >= 200) {
          return {
            text,
            selector: "#jobDescriptionTitleHeading -> #jobDescriptionText"
          };
        }
      }

      if (descriptionNode) {
        const text = cleanText(descriptionNode.innerText || descriptionNode.textContent || "");
        if (text.length >= 200) {
          return {
            text,
            selector: "#jobDescriptionText"
          };
        }
      }

      return null;
    }

    function findLinkedInJobDescription() {
      const headings = findHeadingElementsByText(["about the job"]);
      if (headings.length === 0) {
        return null;
      }

      for (const heading of headings) {
        const candidateContainers = collectAncestorCandidates(heading);
        for (const container of candidateContainers) {
          const text = cleanText(container.innerText || container.textContent || "");
          if (text.length < 250) {
            continue;
          }

          const normalized = normalizeLinkedInJobText(text);
          if (normalized.length >= 200) {
            return {
              text: normalized,
              selector: `${describeElement(heading)} -> ${describeElement(container)}`
            };
          }
        }
      }

      return null;
    }

    function findHeadingByText(targets) {
      return findHeadingElementsByText(targets)[0] || null;
    }

    function findHeadingElementsByText(targets) {
      const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, strong, span, div, p"));
      const matches = [];

      for (const element of headings) {
        const text = cleanText(element.innerText || element.textContent || "").toLowerCase();
        if (!text || text.length > 80) {
          continue;
        }

        if (!isVisibleish(element)) {
          continue;
        }

        if (targets.some((target) => text === target || text.startsWith(`${target} `))) {
          matches.push(element);
        }
      }

      return matches;
    }

    function collectAncestorCandidates(element) {
      const candidates = [];
      let current = element.parentElement;
      let depth = 0;

      while (current && depth < 8) {
        candidates.push(current);
        current = current.parentElement;
        depth += 1;
      }

      return candidates;
    }

    function normalizeFallbackEntry(entry, currentHostname) {
      if (!entry?.text) {
        return null;
      }

      const text = currentHostname.includes("linkedin.com")
        ? normalizeLinkedInJobText(entry.text)
        : entry.text;

      if (!text) {
        return null;
      }

      return {
        text,
        selector: entry.selector
      };
    }

    function normalizeTextForPlatform(text, platform) {
      if (!text) {
        return "";
      }

      if (platform === "linkedin") {
        return normalizeLinkedInJobText(text);
      }

      return text;
    }

    function normalizeLinkedInJobText(text) {
      const normalized = cleanText(text);
      const lower = normalized.toLowerCase();
      const aboutJobIndex = lower.indexOf("about the job");

      if (aboutJobIndex === -1) {
        if (looksLikeLinkedInJobDescription(normalized) && !startsWithCompanySection(normalized)) {
          return normalized;
        }

        return "";
      }

      let trimmed = normalized.slice(aboutJobIndex);
      const stopMarkers = [
        "people you can reach out to",
        "meet the hiring team",
        "about the company",
        "get personalized tips to stand out to hirers",
        "interested in working with us in the future",
        "commitments",
        "reactivate premium",
        "your profile and resume match",
        "did you finish applying"
      ];

      const trimmedLower = trimmed.toLowerCase();
      let stopIndex = trimmed.length;

      for (const marker of stopMarkers) {
        const markerIndex = trimmedLower.indexOf(marker, "about the job".length);
        if (markerIndex !== -1) {
          stopIndex = Math.min(stopIndex, markerIndex);
        }
      }

      trimmed = trimmed.slice(0, stopIndex).trim();

      if (startsWithCompanySection(trimmed) && !trimmed.toLowerCase().includes("about the job")) {
        return "";
      }

      return trimmed;
    }

    function startsWithCompanySection(text) {
      return text.toLowerCase().startsWith("about the company");
    }

    function looksLikeLinkedInJobDescription(text) {
      const lower = text.toLowerCase();
      const positiveSignals = [
        "responsibilities",
        "qualifications",
        "requirements",
        "experience",
        "skills",
        "what you'll do",
        "what you will do",
        "job summary",
        "position summary",
        "role",
        "about the job"
      ];

      const negativeSignals = [
        "about the company",
        "followers",
        "learn more",
        "people you can reach out to"
      ];

      const positiveCount = positiveSignals.filter((signal) => lower.includes(signal)).length;
      const negativeCount = negativeSignals.filter((signal) => lower.includes(signal)).length;

      return positiveCount >= 2 && negativeCount <= 1;
    }

    function isVisibleish(element) {
      if (!element) {
        return false;
      }

      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }

    async function expandCollapsedSections(currentHostname) {
      const expandLabels = [
        "see more",
        "show more",
        "read more",
        "more",
        "... more",
        "… more",
        "view more"
      ];

      const ignoreLabels = [
        "apply",
        "easy apply",
        "sign in",
        "next",
        "save",
        "follow",
        "learn more"
      ];

      if (currentHostname.includes("linkedin.com")) {
        const expanded = expandLinkedInJobSection();
        if (expanded) {
          await wait(250);
        }
        return;
      }

      const rootSelectors = currentHostname.includes("indeed.com")
        ? indeedDescriptionSelectors
        : ["main", "article"];

      const clickedElements = new Set();

      for (const rootSelector of rootSelectors) {
        const root = document.querySelector(rootSelector)?.parentElement || document.querySelector(rootSelector);
        if (!root) {
          continue;
        }

        const clickables = root.querySelectorAll("button, a, span[role='button'], div[role='button']");
        for (const element of clickables) {
          const label = (element.innerText || element.textContent || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

          if (!label || label.length > 40) {
            continue;
          }

          if (!expandLabels.some((text) => label.includes(text))) {
            continue;
          }

          if (ignoreLabels.some((text) => label.includes(text))) {
            continue;
          }

          if (clickedElements.has(element)) {
            continue;
          }

          clickedElements.add(element);
          element.click();
        }
      }

      if (clickedElements.size > 0) {
        await wait(250);
      }

      function expandLinkedInJobSection() {
        let clicked = false;
        const headings = findHeadingElementsByText(["about the job"]);

        for (const heading of headings) {
          const candidateContainers = collectAncestorCandidates(heading).slice(0, 4);
          for (const container of candidateContainers) {
            const clickables = container.querySelectorAll("button, a, span[role='button'], div[role='button']");
            for (const element of clickables) {
              const label = (element.innerText || element.textContent || "")
                .replace(/\s+/g, " ")
                .trim()
                .toLowerCase();

              if (!label || label.length > 40) {
                continue;
              }

              if (!expandLabels.some((text) => label.includes(text))) {
                continue;
              }

              if (ignoreLabels.some((text) => label.includes(text))) {
                continue;
              }

              element.click();
              clicked = true;
            }
          }
        }

        return clicked;
      }
    }

    function wait(durationMs) {
      return new Promise((resolve) => {
        window.setTimeout(resolve, durationMs);
      });
    }
  }

  function analyzeJobText(jobText) {
    const normalizedText = normalizeText(jobText);
    const sentenceRecords = buildSentenceRecords(normalizedText);
    const results = [];

    for (const group of KEYWORD_GROUPS) {
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
      results: results.sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
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
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matcher = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");

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

    return null;
  }

  function containsRestApiContext(sentence) {
    return /\brest(?:ful)?(?:\s*\/\s*soap)?(?:[-\s]+(?:based|style|driven))?[-\s]+(?:apis?|services?|endpoints?|framework|integration|integrations)\b/i.test(
      sentence
    );
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
})();
