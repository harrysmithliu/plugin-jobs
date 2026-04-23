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

  const VECTOR_DB_KEYWORD = KEYWORD_GROUPS.flatMap((group) => group.items).find((item) => item.name === "Vector DB") || null;
  const BACKEND_KEYWORD_GROUPS = KEYWORD_GROUPS.filter((group) => group.group !== "AI & LLM")
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.name !== "Vector DB")
    }))
    .filter((group) => group.items.length > 0);
  const AGENTICSYS_KEYWORD_GROUPS = KEYWORD_GROUPS.filter((group) => group.group === "AI & LLM").map((group) => ({
    ...group,
    items: [...group.items]
  }));
  if (VECTOR_DB_KEYWORD) {
    AGENTICSYS_KEYWORD_GROUPS.push({
      group: "Data",
      items: [
        {
          ...VECTOR_DB_KEYWORD,
          aliases: [...VECTOR_DB_KEYWORD.aliases]
        }
      ]
    });
  }
  const AGENTICSYS_KEYWORD_DISPLAY_ORDER = buildAllKeywordNamesFromGroups(AGENTICSYS_KEYWORD_GROUPS);

  const COLOR_OPTIONS = ["green", "yellow", "orange", "red"];
  const DEFAULT_COLOR_WEIGHTS = {
    green: 1,
    yellow: 0.9,
    orange: 0.8,
    red: 0.7
  };
  const DEFAULT_PROFILE_ID = "backend";
  const PROFILE_ORDER = ["backend", "agenticsys", "appsec"];
  const PROFILE_LABELS = {
    backend: "Backend",
    agenticsys: "AgenticSys",
    appsec: "AppSec"
  };
  const PROFILE_DEFINITIONS = buildProfileDefinitions();
  const SETTINGS_STORAGE_KEY = "analyzerSettings";
  const APPLIED_STORAGE_KEY = "appliedByUrl";
  const JD_CORPUS_STORAGE_KEY = "jdCorpusByProfile";
  const PROFILE_FILE_BY_ID = {
    backend: "backend.txt",
    agenticsys: "agenticsys.txt",
    appsec: "appsec.txt"
  };
  const FEATURE_FLAGS = {
    enableProfileCacheWipeEntry: false
  };
  const MAX_ANALYSIS_TEXT_LENGTH = 20000;
  const MAX_FALLBACK_SCAN_NODES = 140;
  const MAX_HEADING_FALLBACK_NODES = 220;
  const MAX_LINKEDIN_CONTAINER_SCAN = 180;
  const aliasRegexCache = new Map();

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

      .header-credit {
        margin: 4px 0 0;
        color: #94a3b8;
        font-size: 11px;
        letter-spacing: 0.01em;
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

      .body--settings {
        display: flex;
        flex-direction: column;
        overflow: hidden;
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
        flex: 1;
        min-width: 0;
      }

      .status-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .status-profile {
        font-size: 13px;
        font-weight: 800;
        color: #111827;
        white-space: nowrap;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px 16px;
      }

      .color-summary-card {
        margin-bottom: 14px;
        border: 1px solid #dde3e8;
        border-radius: 12px;
        background: #ffffff;
        padding: 12px;
      }

      .color-summary-card h2 {
        margin: 0 0 12px;
        font-size: 15px;
      }

      .color-summary-list {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .color-summary-item {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 12px;
        background: #fafafa;
        border-left-width: 6px;
      }

      .color-summary-item--green {
        border-left-color: #2f855a;
      }

      .color-summary-item--yellow {
        border-left-color: #b7791f;
      }

      .color-summary-item--orange {
        border-left-color: #dd6b20;
      }

      .color-summary-item--red {
        border-left-color: #c53030;
      }

      .color-summary-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .color-summary-name {
        font-weight: 700;
      }

      .color-summary-share {
        font-weight: 800;
        font-size: 18px;
        color: #111827;
      }

      .color-summary-meta {
        margin-top: 6px;
        color: #52606d;
        font-size: 12px;
      }

      .summary-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .summary-row--history {
        grid-column: 1 / -1;
      }

      .summary-row span {
        color: #64748b;
        font-size: 12px;
      }

      .summary-row strong {
        font-size: 14px;
        word-break: break-word;
      }

      .current-url-wrap {
        position: relative;
        min-width: 0;
      }

      .current-url-value {
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        word-break: normal;
        cursor: pointer;
      }

      .copy-bubble {
        position: absolute;
        top: calc(100% + 6px);
        right: 0;
        z-index: 10;
        border: 1px solid #cbd5e1;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.1;
        background: #0f172a;
        color: #ffffff;
      }

      .copy-bubble:hover {
        background: #1f2937;
      }

      .summary-history-actions {
        margin-top: 2px;
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        width: 100%;
      }

      .summary-history-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: fit-content;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 12px;
        font-weight: 700;
        border: 1px solid transparent;
        min-height: 34px;
      }

      .summary-history-badge--seen {
        background: #e6f6ec;
        color: #1f6f43;
        border-color: #b7e1c7;
      }

      .summary-history-badge--new {
        background: #eef2f7;
        color: #334155;
        border-color: #d8e0ea;
      }

      .history-action-button {
        border: 1px solid #cbd5e1;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.1;
        background: #f8fafc;
        color: #475569;
        min-height: 34px;
      }

      .history-action-button:hover {
        background: #f1f5f9;
      }

      .history-action-button:disabled {
        cursor: default;
        opacity: 1;
      }

      .history-action-button--applied-on {
        background: #fff4e6;
        border-color: #f59e0b;
        color: #b45309;
      }

      .history-action-button--saved {
        background: #e6f6ec;
        border-color: #2f855a;
        color: #1f6f43;
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

      .settings-panel {
        margin-bottom: 14px;
        border: 1px solid #dde3e8;
        border-radius: 12px;
        background: #ffffff;
        padding: 12px;
      }

      .settings-panel--active {
        margin-bottom: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      .settings-panel h2 {
        margin: 0;
        font-size: 15px;
      }

      .settings-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
      }

      .settings-subtle {
        margin: 6px 0 0;
        color: #64748b;
        font-size: 12px;
      }

      .settings-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
        flex-shrink: 0;
      }

      .settings-tabs {
        margin-top: 10px;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .settings-tab {
        border: 1px solid #cbd5e1;
        border-radius: 999px;
        padding: 6px 12px;
        background: #ffffff;
        color: #0f172a;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
      }

      .settings-tab--active {
        background: #0f172a;
        border-color: #0f172a;
        color: #ffffff;
      }

      .settings-list {
        margin-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 320px;
        overflow: auto;
        border-top: 1px solid #edf2f7;
        padding-top: 10px;
      }

      .settings-panel--active .settings-list {
        flex: 1;
        min-height: 0;
        max-height: none;
        overflow: auto;
      }

      .settings-item {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 132px;
        gap: 10px;
        align-items: center;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 8px 10px;
        background: #fafafa;
      }

      .settings-item-name {
        font-weight: 600;
        line-height: 1.25;
      }

      .settings-item-group {
        margin-top: 2px;
        color: #64748b;
        font-size: 12px;
      }

      .settings-select {
        width: 100%;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 7px 8px;
        background: #ffffff;
        color: #0f172a;
        font: inherit;
      }

      @media (max-width: 720px) {
        .summary-grid {
          grid-template-columns: 1fr;
        }

        .color-summary-list {
          grid-template-columns: 1fr;
        }

        .header {
          flex-wrap: wrap;
          cursor: default;
        }

        .status-row {
          align-items: flex-start;
          flex-direction: column;
          gap: 6px;
        }
      }
    </style>
    <div class="shell">
      <div class="header" id="dragHandle">
        <div class="header-title">
          <h1>JD Keyword Analyzer</h1>
          <p>Drag this window, resize from the corner, or maximize it</p>
          <p class="header-credit">Developed by harrysmithliu</p>
        </div>
        <div class="header-actions">
          <button id="analyzeButton" class="primary-button">Analyze JD</button>
          <button id="settingsButton">Settings</button>
          <button id="toggleRawButton" hidden>Show Raw Text</button>
          <button id="maximizeButton" class="icon-button" title="Toggle fullscreen">[]</button>
          <button id="closeButton" class="icon-button" title="Close">X</button>
        </div>
      </div>

      <div class="body">
        <section class="status-block">
          <div class="status-row">
            <p id="status" class="status">Reading the current page...</p>
            <strong id="statusProfile" class="status-profile" hidden></strong>
          </div>
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
              <div id="currentUrlWrap" class="current-url-wrap">
                <strong id="currentUrl" class="current-url-value">-</strong>
                <button id="currentUrlCopyBubble" class="copy-bubble" type="button" hidden>Copy</button>
              </div>
            </div>
            <div class="summary-row summary-row--history">
              <div class="summary-history-actions">
                <strong id="historyStatus" class="summary-history-badge summary-history-badge--new">New(0)</strong>
                <button id="appliedButton" class="history-action-button" type="button">Applied(0)</button>
                <button id="saveJdButton" class="history-action-button" type="button">Save(0)</button>
                <button id="downloadJdButton" class="history-action-button" type="button">Download</button>
              </div>
            </div>
          </div>
        </section>

        <section id="colorSummarySection" class="color-summary-card" hidden>
          <h2>Color Breakdown</h2>
          <div id="colorSummaryList" class="color-summary-list"></div>
        </section>

        <section id="settingsSection" class="settings-panel" hidden>
          <div class="settings-header">
            <div>
              <h2>Keyword Color Settings</h2>
              <p id="settingsSubtle" class="settings-subtle">
                Change zone per keyword; changes apply when you click Done. Weights: Green 1.00, Yellow 0.90, Orange 0.80, Other 0.70
              </p>
              <div id="settingsTabs" class="settings-tabs"></div>
            </div>
            <div class="settings-actions">
              <button id="resetSettingsButton">Reset Defaults</button>
              <button id="closeSettingsButton">Done</button>
            </div>
          </div>
          <div id="settingsList" class="settings-list"></div>
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
  const settingsButton = shadow.getElementById("settingsButton");
  const toggleRawButton = shadow.getElementById("toggleRawButton");
  const maximizeButton = shadow.getElementById("maximizeButton");
  const closeButton = shadow.getElementById("closeButton");
  const dragHandle = shadow.getElementById("dragHandle");
  const statusElement = shadow.getElementById("status");
  const statusProfileElement = shadow.getElementById("statusProfile");
  const bodyElement = shadow.querySelector(".body");
  const statusSection = shadow.querySelector(".status-block");
  const summarySection = shadow.getElementById("summarySection");
  const colorSummarySection = shadow.getElementById("colorSummarySection");
  const colorSummaryList = shadow.getElementById("colorSummaryList");
  const settingsSection = shadow.getElementById("settingsSection");
  const settingsSubtle = shadow.getElementById("settingsSubtle");
  const settingsTabs = shadow.getElementById("settingsTabs");
  const settingsList = shadow.getElementById("settingsList");
  const resetSettingsButton = shadow.getElementById("resetSettingsButton");
  const closeSettingsButton = shadow.getElementById("closeSettingsButton");
  const resultsSection = shadow.getElementById("resultsSection");
  const rawSection = shadow.getElementById("rawSection");
  const resultsList = shadow.getElementById("resultsList");
  const rawTextElement = shadow.getElementById("rawText");
  const jobTitleElement = shadow.getElementById("jobTitle");
  const companyNameElement = shadow.getElementById("companyName");
  const overallScoreElement = shadow.getElementById("overallScore");
  const sourceLabelElement = shadow.getElementById("sourceLabel");
  const cachedAtElement = shadow.getElementById("cachedAt");
  const currentUrlWrapElement = shadow.getElementById("currentUrlWrap");
  const currentUrlElement = shadow.getElementById("currentUrl");
  const currentUrlCopyBubble = shadow.getElementById("currentUrlCopyBubble");
  const historyStatusElement = shadow.getElementById("historyStatus");
  const appliedButton = shadow.getElementById("appliedButton");
  const saveJdButton = shadow.getElementById("saveJdButton");
  const downloadJdButton = shadow.getElementById("downloadJdButton");

  let isRawVisible = false;
  let isSettingsVisible = false;
  let hasAnalysisResult = false;
  let isMaximized = false;
  let restoreRect = null;
  let dragState = null;
  let activeProfileId = DEFAULT_PROFILE_ID;
  let profileSettingsById = buildDefaultProfileSettingsById();
  let draftProfileSettingsById = null;
  let draftActiveProfileId = DEFAULT_PROFILE_ID;
  let hasPendingSettingsChanges = false;
  let latestExtraction = null;
  let currentHistoryUrl = "";
  let currentAppliedState = false;
  let currentSeenTotal = 0;
  let currentAppliedTotal = 0;
  let currentSavedTotal = 0;
  let currentJdKey = "";
  let saveButtonStateToken = 0;

  host.addEventListener("jd-analyzer-focus", () => {
    host.style.zIndex = "2147483647";
  });

  analyzeButton.addEventListener("click", () => {
    analyzeCurrentPage();
  });

  settingsButton.addEventListener("click", () => {
    if (!isSettingsVisible) {
      beginSettingsEdit();
      isSettingsVisible = true;
    } else {
      // Close without applying draft changes.
      isSettingsVisible = false;
      discardSettingsDraft();
    }
    applySettingsVisibility();
  });

  closeSettingsButton.addEventListener("click", async () => {
    await applySettingsDraft();
    isSettingsVisible = false;
    discardSettingsDraft();
    applySettingsVisibility();
  });

  resetSettingsButton.addEventListener("click", () => {
    const currentProfileId = getDraftActiveProfileId();
    ensureDraftProfileSettings(currentProfileId);
    draftProfileSettingsById[currentProfileId] = createDefaultProfileSettings(currentProfileId);
    hasPendingSettingsChanges = true;
    renderSettingsTabs();
    renderSettingsList();
  });

  appliedButton.addEventListener("click", async () => {
    if (!currentHistoryUrl) {
      return;
    }

    const nextState = !currentAppliedState;
    await setAppliedStateForUrl(currentHistoryUrl, nextState);
    const profileId = normalizeProfileId(activeProfileId) || DEFAULT_PROFILE_ID;
    const history = await detectAnalysisHistory(currentHistoryUrl, profileId);
    applyHistoryIndicator(history, currentHistoryUrl);
  });

  saveJdButton.addEventListener("click", async () => {
    const jdText = String(latestExtraction?.jobText || "").trim();
    if (!jdText) {
      setStatus("No live JD text available to save. Run Analyze JD on a page with visible JD content first.", true);
      return;
    }

    const profileId = normalizeProfileId(activeProfileId) || DEFAULT_PROFILE_ID;
    saveJdButton.disabled = true;
    try {
      const saved = await persistJdToCorpusFile(profileId, latestExtraction);
      if (!saved) {
        throw new Error("Unable to save JD.");
      }

      const profileLabel = PROFILE_LABELS[profileId] || profileId;
      const fileName = getCorpusFileName(profileId);
      setStatus(`Saved to local cache file ${fileName} (${profileLabel}).`);
      const history = await detectAnalysisHistory(latestExtraction.url || window.location.href, profileId);
      applyHistoryIndicator(history, latestExtraction.url || window.location.href);
      applySavedIndicator(true, currentSavedTotal);
    } catch (error) {
      setStatus(error?.message || "Unable to save JD text.", true);
    } finally {
      if (!saveJdButton.classList.contains("history-action-button--saved")) {
        saveJdButton.disabled = false;
      }
    }
  });

  downloadJdButton.addEventListener("click", async () => {
    const profileId = normalizeProfileId(activeProfileId) || DEFAULT_PROFILE_ID;
    downloadJdButton.disabled = true;

    try {
      const corpus = await getProfileCorpus(profileId);
      if (!corpus.fileText) {
        throw new Error("Current tab has no cached JD corpus to download yet.");
      }

      const response = await chrome.runtime.sendMessage({
        action: "downloadProfileCorpusFile",
        fileName: corpus.fileName,
        fileText: corpus.fileText
      });

      if (!response?.ok) {
        throw new Error(response?.error || "Unable to start download.");
      }

      setStatus(`Download started: ${corpus.fileName}`);
    } catch (error) {
      setStatus(error?.message || "Unable to download corpus file.", true);
    } finally {
      downloadJdButton.disabled = false;
    }
  });

  currentUrlWrapElement.addEventListener("click", (event) => {
    if (event.target === currentUrlCopyBubble) {
      return;
    }

    currentUrlCopyBubble.hidden = false;
    currentUrlCopyBubble.textContent = "Copy";
  });

  currentUrlCopyBubble.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const value = String(currentUrlElement.textContent || "").trim();
    if (!value || value === "-") {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      currentUrlCopyBubble.textContent = "Copied";
      window.setTimeout(() => {
        currentUrlCopyBubble.hidden = true;
      }, 900);
    } catch (_error) {
      currentUrlCopyBubble.textContent = "Failed";
      window.setTimeout(() => {
        currentUrlCopyBubble.hidden = true;
      }, 900);
    }
  });

  shadow.addEventListener("click", (event) => {
    if (!currentUrlWrapElement.contains(event.target)) {
      currentUrlCopyBubble.hidden = true;
    }
  });

  if (FEATURE_FLAGS.enableProfileCacheWipeEntry) {
    window.addEventListener("keydown", async (event) => {
      if (!(event.altKey && event.shiftKey && event.key === "Backspace")) {
        return;
      }

      event.preventDefault();
      const wiped = await wipeCurrentProfileCachesIfEnabled();
      if (!wiped) {
        return;
      }

      applySavedIndicator(false);
      const profileId = normalizeProfileId(activeProfileId) || DEFAULT_PROFILE_ID;
      setStatus(`Current profile analysis cache wiped: ${PROFILE_LABELS[profileId] || profileId}`);
    });
  }

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

  initializeOverlay();

  async function initializeOverlay() {
    await pruneCachedJobTextFromStorage();
    await migrateLegacyCorpusToJsonStructure();
    await loadAnalyzerSettings();
    renderSettingsTabs();
    renderSettingsList();
    applySettingsVisibility();
    analyzeCurrentPage();
  }

  async function analyzeCurrentPage() {
    setLoading(true);
    hideResults();

    try {
      const extraction = await extractJobDescription();

      if (!extraction?.jobText) {
        throw new Error("No job description text was found on this page.");
      }

      const analysis = analyzeJobText(extraction.jobText);
      const meta = buildCacheEntryMeta(extraction);
      const profileId = normalizeProfileId(activeProfileId) || DEFAULT_PROFILE_ID;
      const history = await detectAnalysisHistory(extraction.url, profileId);
      const cacheEntry = {
        url: extraction.url,
        hostname: extraction.hostname,
        title: extraction.pageTitle,
        profileId,
        extractedAt: new Date().toISOString(),
        extraction,
        analysis,
        meta,
        history,
        settingsHash: computeSettingsHash()
      };

      renderResult(cacheEntry, false);
      await saveCachedAnalysis(cacheEntry);
      const updatedHistory = await detectAnalysisHistory(extraction.url, profileId);
      applyHistoryIndicator(updatedHistory, extraction.url || window.location.href);
    } catch (error) {
      if (isExtensionContextInvalidated(error)) {
        setStatus("This floating window belongs to an older extension version. Close it and reopen the analyzer.", true);
        return;
      }

      const cached = await getCachedAnalysis(window.location.href);

      if (cached) {
        const extraction = cached.extraction || { url: cached.url || window.location.href, jobText: "" };
        const hasExtractionText = Boolean(extraction?.jobText);
        const needsRecompute = cached.settingsHash !== computeSettingsHash();
        const profileId = normalizeProfileId(cached?.profileId || activeProfileId) || DEFAULT_PROFILE_ID;
        const history = await detectAnalysisHistory(extraction.url || cached.url || window.location.href, profileId);
        if (hasExtractionText && needsRecompute) {
          const recalculated = {
            ...cached,
            profileId,
            extractedAt: new Date().toISOString(),
            meta: buildCacheEntryMeta(extraction),
            analysis: analyzeJobText(extraction.jobText),
            history,
            settingsHash: computeSettingsHash()
          };
          renderResult(recalculated, true);
          await saveCachedAnalysis(recalculated);
          const updatedHistory = await detectAnalysisHistory(extraction.url || cached.url || window.location.href, profileId);
          applyHistoryIndicator(updatedHistory, extraction.url || cached.url || window.location.href);
        } else {
          renderResult({ ...cached, profileId, history }, true);
        }
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
    const { extraction, analysis, extractedAt, history } = cacheEntry;
    const displayProfileId = normalizeProfileId(cacheEntry?.profileId || activeProfileId) || DEFAULT_PROFILE_ID;
    const displayProfileLabel = PROFILE_LABELS[displayProfileId] || displayProfileId;
    latestExtraction = extraction;
    hasAnalysisResult = true;
    setStatusProfile(displayProfileLabel);

    setStatus(
      fromCache
        ? `Loaded ${analysis.matchedKeywords} matched keywords from cache for this page.`
        : `Extracted ${analysis.matchedKeywords} matched keywords from ${analysis.totalKeywords} tracked items.`
    );

    summarySection.hidden = false;
    colorSummarySection.hidden = false;
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
    currentUrlElement.title = extraction.url || window.location.href;
    currentUrlCopyBubble.hidden = true;
    applyHistoryIndicator(history, extraction.url || window.location.href);
    void refreshSavedIndicator(extraction);

    renderColorSummary(analysis.results);
    resultsList.replaceChildren();

    const orderedResults = sortResultsForDisplay(analysis.results);
    const visibleResults = orderedResults.filter((item) => item.score > 0);

    if (visibleResults.length === 0) {
      const empty = document.createElement("p");
      empty.className = "snippet-empty";
      empty.textContent = "No keyword scores above 0% for this JD.";
      resultsList.appendChild(empty);
      return;
    }

    for (const item of visibleResults) {
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
          appendHighlightedSnippet(snippetItem, snippet, item.name);
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

    applySettingsVisibility();
  }

  function hideResults() {
    hasAnalysisResult = false;
    summarySection.hidden = true;
    colorSummarySection.hidden = true;
    resultsSection.hidden = true;
    rawSection.hidden = true;
    toggleRawButton.hidden = true;
    colorSummaryList.replaceChildren();
    resultsList.replaceChildren();
    applySettingsVisibility();
  }

  function renderColorSummary(results) {
    colorSummaryList.replaceChildren();

    const breakdown = buildColorBreakdown(results);
    const order = ["green", "yellow", "orange", "red"];

    for (const color of order) {
      const item = breakdown[color];
      const card = document.createElement("article");
      card.className = `color-summary-item color-summary-item--${color}`;

      const top = document.createElement("div");
      top.className = "color-summary-top";

      const name = document.createElement("div");
      name.className = "color-summary-name";
      name.textContent = `${COLOR_LABELS[color]} Zone`;

      const share = document.createElement("div");
      share.className = "color-summary-share";
      share.textContent = `${item.share}%`;

      top.append(name, share);

      const meta = document.createElement("div");
      meta.className = "color-summary-meta";
      meta.textContent = `${item.matchedCount} matched keywords | ${item.totalScore} total points`;

      card.append(top, meta);
      colorSummaryList.appendChild(card);
    }
  }

  function buildColorBreakdown(results) {
    const breakdown = {
      green: { totalScore: 0, matchedCount: 0, share: 0 },
      yellow: { totalScore: 0, matchedCount: 0, share: 0 },
      orange: { totalScore: 0, matchedCount: 0, share: 0 },
      red: { totalScore: 0, matchedCount: 0, share: 0 }
    };

    for (const result of results) {
      const color = getColorGroup(result.name);
      breakdown[color].totalScore += result.score;

      if (result.score > 0) {
        breakdown[color].matchedCount += 1;
      }
    }

    const totalScore = Object.values(breakdown).reduce((sum, item) => sum + item.totalScore, 0);

    for (const item of Object.values(breakdown)) {
      item.share = totalScore > 0 ? Math.round((item.totalScore / totalScore) * 100) : 0;
    }

    return breakdown;
  }

  function appendHighlightedSnippet(container, snippet, keywordName) {
    const aliases = getAliasesForKeyword(keywordName);
    const matches = findAliasMatches(snippet, aliases);

    if (matches.length === 0) {
      container.textContent = snippet;
      return;
    }

    let cursor = 0;

    for (const match of matches) {
      if (match.start > cursor) {
        container.appendChild(document.createTextNode(snippet.slice(cursor, match.start)));
      }

      const strong = document.createElement("strong");
      strong.textContent = snippet.slice(match.start, match.end);
      container.appendChild(strong);
      cursor = match.end;
    }

    if (cursor < snippet.length) {
      container.appendChild(document.createTextNode(snippet.slice(cursor)));
    }
  }

  function getAliasesForKeyword(keywordName) {
    const activeKeywordGroups = getProfileDefinition(activeProfileId).keywordGroups;
    for (const group of activeKeywordGroups) {
      const item = group.items.find((entry) => entry.name === keywordName);
      if (item) {
        return [item.name, ...item.aliases];
      }
    }

    return [keywordName];
  }

  function findAliasMatches(text, aliases) {
    const sortedAliases = unique(
      aliases
        .filter(Boolean)
        .map((alias) => alias.trim())
        .filter(Boolean)
    ).sort((left, right) => right.length - left.length);

    const matches = [];

    for (const alias of sortedAliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matcher = new RegExp(`(^|[^a-z0-9])(${escaped})(?=$|[^a-z0-9])`, "gi");
      let found;

      while ((found = matcher.exec(text)) !== null) {
        const fullMatch = found[0];
        const matchedText = found[2];
        const start = found.index + (fullMatch.length - matchedText.length);
        const end = start + matchedText.length;

        if (matches.some((existing) => !(end <= existing.start || start >= existing.end))) {
          continue;
        }

        matches.push({ start, end });
      }
    }

    return matches.sort((left, right) => left.start - right.start);
  }

  function setLoading(isLoading) {
    analyzeButton.disabled = isLoading;
    analyzeButton.textContent = isLoading ? "Analyzing..." : "Analyze JD";
    if (isLoading) {
      setStatusProfile(PROFILE_LABELS[normalizeProfileId(activeProfileId) || DEFAULT_PROFILE_ID] || "");
      setStatus("Reading the current page and scoring keyword matches...");
    }
  }

  function setStatusProfile(label) {
    const text = String(label || "").trim();
    if (!text) {
      statusProfileElement.hidden = true;
      statusProfileElement.textContent = "";
      return;
    }

    statusProfileElement.textContent = text;
    statusProfileElement.hidden = false;
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
    const displayOrder = new Map((getProfileDefinition(activeProfileId).keywordDisplayOrder || []).map((name, index) => [name, index]));

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

  function getColorGroup(keywordName, profileId = activeProfileId, settingsOverride = null) {
    const settings = settingsOverride || getLiveProfileSettings(profileId);
    const color = settings?.keywordColorByName?.[keywordName];
    return COLOR_OPTIONS.includes(color) ? color : "red";
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

  function applyHistoryIndicator(history, url) {
    const seenBefore = Boolean(history?.seenBefore);
    const totalCachedUrls = Number(history?.totalCachedUrls) || 0;
    const totalAppliedUrls = Number(history?.totalAppliedUrls) || 0;
    const totalSavedJds = Number(history?.totalSavedJds) || 0;
    const applied = Boolean(history?.applied);

    currentHistoryUrl = String(url || history?.url || "");
    currentAppliedState = applied;
    currentSeenTotal = totalCachedUrls;
    currentAppliedTotal = totalAppliedUrls;
    currentSavedTotal = totalSavedJds;

    historyStatusElement.className = `summary-history-badge ${
      seenBefore ? "summary-history-badge--seen" : "summary-history-badge--new"
    }`;
    historyStatusElement.textContent = `${seenBefore ? "Seen" : "New"}(${totalCachedUrls})`;
    appliedButton.disabled = !currentHistoryUrl;
    applyAppliedIndicator(currentAppliedState, totalAppliedUrls);
    applySavedIndicator(saveJdButton.classList.contains("history-action-button--saved"), totalSavedJds);
  }

  function applyAppliedIndicator(applied, totalApplied = currentAppliedTotal) {
    appliedButton.classList.toggle("history-action-button--applied-on", Boolean(applied));
    appliedButton.textContent = `Applied(${Math.max(0, Number(totalApplied) || 0)})`;
  }

  function applySavedIndicator(saved, totalSaved = currentSavedTotal) {
    const isSaved = Boolean(saved);
    saveJdButton.classList.toggle("history-action-button--saved", isSaved);
    saveJdButton.disabled = isSaved;
    saveJdButton.textContent = `Save(${Math.max(0, Number(totalSaved) || 0)})`;
  }

  function applySettingsVisibility() {
    settingsSection.hidden = !isSettingsVisible;
    settingsButton.textContent = isSettingsVisible ? "Hide Settings" : "Settings";
    bodyElement.classList.toggle("body--settings", isSettingsVisible);
    settingsSection.classList.toggle("settings-panel--active", isSettingsVisible);

    if (isSettingsVisible) {
      statusSection.hidden = true;
      summarySection.hidden = true;
      colorSummarySection.hidden = true;
      resultsSection.hidden = true;
      rawSection.hidden = true;
      toggleRawButton.hidden = true;
      return;
    }

    statusSection.hidden = false;
    summarySection.hidden = !hasAnalysisResult;
    colorSummarySection.hidden = !hasAnalysisResult;
    resultsSection.hidden = !hasAnalysisResult;
    toggleRawButton.hidden = !hasAnalysisResult;
    rawSection.hidden = !(hasAnalysisResult && isRawVisible);
  }

  function beginSettingsEdit() {
    draftProfileSettingsById = cloneProfileSettingsById(profileSettingsById);
    draftActiveProfileId = activeProfileId;
    hasPendingSettingsChanges = false;
    renderSettingsTabs();
    renderSettingsList();
  }

  function discardSettingsDraft() {
    draftProfileSettingsById = null;
    draftActiveProfileId = activeProfileId;
    hasPendingSettingsChanges = false;
  }

  async function applySettingsDraft() {
    if (!draftProfileSettingsById || !hasPendingSettingsChanges) {
      return;
    }

    profileSettingsById = cloneProfileSettingsById(draftProfileSettingsById);
    activeProfileId = normalizeProfileId(draftActiveProfileId) || DEFAULT_PROFILE_ID;
    await saveAnalyzerSettings();
    await rerunAnalysisWithCurrentSettings();
  }

  async function loadAnalyzerSettings() {
    try {
      const stored = await chrome.storage.local.get({ [SETTINGS_STORAGE_KEY]: null });
      const raw = stored[SETTINGS_STORAGE_KEY];
      if (!raw) {
        return;
      }

      const defaults = buildDefaultProfileSettingsById();
      const normalizedSettingsByProfile = cloneProfileSettingsById(defaults);

      const hasProfileShape = raw.settingsByProfile && typeof raw.settingsByProfile === "object";
      if (hasProfileShape) {
        const inputByProfile = raw.settingsByProfile || {};
        for (const profileId of PROFILE_ORDER) {
          normalizedSettingsByProfile[profileId] = normalizeSingleProfileSettings(profileId, inputByProfile[profileId]);
        }
      } else if (raw.keywordColorByName || raw.colorWeights) {
        // Backward compatibility with old shape:
        // { keywordColorByName, colorWeights }
        normalizedSettingsByProfile.backend = normalizeSingleProfileSettings("backend", raw);
      }

      profileSettingsById = normalizedSettingsByProfile;
      activeProfileId = normalizeProfileId(raw.activeProfileId) || DEFAULT_PROFILE_ID;
    } catch (error) {
      if (isExtensionContextInvalidated(error)) {
        return;
      }
      throw error;
    }
  }

  async function saveAnalyzerSettings() {
    try {
      await chrome.storage.local.set({
        [SETTINGS_STORAGE_KEY]: {
          version: 2,
          activeProfileId,
          settingsByProfile: profileSettingsById,
          updatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      if (isExtensionContextInvalidated(error)) {
        return;
      }
      throw error;
    }
  }

  function renderSettingsList() {
    settingsList.replaceChildren();

    const profileId = getDraftActiveProfileId();
    const keywordToGroup = buildKeywordToGroupMap(profileId);
    const orderedKeywords = getKeywordNamesForSettings(profileId);
    const settingsForProfile = getEditableProfileSettings(profileId);
    const keywordCount = orderedKeywords.length;

    settingsSubtle.textContent =
      keywordCount > 0
        ? `${PROFILE_LABELS[profileId]} tab: ${keywordCount} keywords. Weights: Green ${formatWeight(
            settingsForProfile.colorWeights.green
          )}, Yellow ${formatWeight(settingsForProfile.colorWeights.yellow)}, Orange ${formatWeight(
            settingsForProfile.colorWeights.orange
          )}, Other ${formatWeight(settingsForProfile.colorWeights.red)}`
        : `${PROFILE_LABELS[profileId]} tab is currently empty. Add keywords later to enable matching.`;

    if (orderedKeywords.length === 0) {
      const empty = document.createElement("p");
      empty.className = "snippet-empty";
      empty.textContent = "No keywords configured in this tab yet.";
      settingsList.appendChild(empty);
      return;
    }

    for (const keyword of orderedKeywords) {
      const item = document.createElement("div");
      item.className = "settings-item";

      const info = document.createElement("div");
      const name = document.createElement("div");
      name.className = "settings-item-name";
      name.textContent = keyword;

      const group = document.createElement("div");
      group.className = "settings-item-group";
      group.textContent = keywordToGroup.get(keyword) || "Other";

      info.append(name, group);

      const select = document.createElement("select");
      select.className = "settings-select";

      for (const color of COLOR_OPTIONS) {
        const option = document.createElement("option");
        option.value = color;
        option.textContent = COLOR_LABELS[color];
        select.appendChild(option);
      }

      select.value = getColorGroup(keyword, profileId, settingsForProfile);

      select.addEventListener("change", () => {
        const nextColor = normalizeColor(select.value) || "red";
        const currentProfileId = getDraftActiveProfileId();
        ensureDraftProfileSettings(currentProfileId);
        draftProfileSettingsById[currentProfileId].keywordColorByName[keyword] = nextColor;
        hasPendingSettingsChanges = true;
      });

      item.append(info, select);
      settingsList.appendChild(item);
    }
  }

  function renderSettingsTabs() {
    settingsTabs.replaceChildren();

    for (const profileId of PROFILE_ORDER) {
      const tab = document.createElement("button");
      tab.className = `settings-tab ${profileId === getDraftActiveProfileId() ? "settings-tab--active" : ""}`;
      tab.type = "button";
      tab.textContent = PROFILE_LABELS[profileId];
      tab.addEventListener("click", () => {
        if (profileId === getDraftActiveProfileId()) {
          return;
        }

        draftActiveProfileId = profileId;
        hasPendingSettingsChanges = true;
        renderSettingsTabs();
        renderSettingsList();
      });

      settingsTabs.appendChild(tab);
    }
  }

  async function rerunAnalysisWithCurrentSettings() {
    if (!latestExtraction?.jobText) {
      setStatus(`Settings saved for ${PROFILE_LABELS[activeProfileId]}. Click Analyze JD to refresh this page.`);
      return;
    }

    setLoading(true);
    try {
      const analysis = analyzeJobText(latestExtraction.jobText);
      const meta = buildCacheEntryMeta(latestExtraction);
      const profileId = normalizeProfileId(activeProfileId) || DEFAULT_PROFILE_ID;
      const history = await detectAnalysisHistory(latestExtraction.url || window.location.href, profileId);
      const entry = {
        url: latestExtraction.url || window.location.href,
        hostname: latestExtraction.hostname || window.location.hostname,
        title: latestExtraction.pageTitle || document.title,
        profileId,
        extractedAt: new Date().toISOString(),
        extraction: latestExtraction,
        analysis,
        meta,
        history,
        settingsHash: computeSettingsHash()
      };

      renderResult(entry, false);
      setStatus(`Scores refreshed using ${PROFILE_LABELS[activeProfileId]} profile settings.`);
      await saveCachedAnalysis(entry);
      const updatedHistory = await detectAnalysisHistory(latestExtraction.url || window.location.href, profileId);
      applyHistoryIndicator(updatedHistory, latestExtraction.url || window.location.href);
    } catch (error) {
      if (isExtensionContextInvalidated(error)) {
        setStatus("This floating window belongs to an older extension version. Close and reopen it.", true);
        return;
      }

      setStatus(error?.message || "Failed to refresh scores with current settings.", true);
    } finally {
      setLoading(false);
    }
  }

  function normalizeColor(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return COLOR_OPTIONS.includes(normalized) ? normalized : null;
  }

  function computeSettingsHash() {
    const payload = {
      activeProfileId,
      settingsByProfile: PROFILE_ORDER.reduce((acc, profileId) => {
        const settings = getLiveProfileSettings(profileId);
        const keywords = getAllKeywordNamesForProfile(profileId);

        acc[profileId] = {
          colorWeights: COLOR_OPTIONS.reduce((weights, color) => {
            weights[color] = Number(settings.colorWeights[color] || DEFAULT_COLOR_WEIGHTS[color] || 1);
            return weights;
          }, {}),
          keywordColorByName: keywords.reduce((map, keyword) => {
            map[keyword] = getColorGroup(keyword, profileId, settings);
            return map;
          }, {})
        };
        return acc;
      }, {})
    };

    const serialized = JSON.stringify(payload);
    let hash = 2166136261;

    for (let index = 0; index < serialized.length; index += 1) {
      hash ^= serialized.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return `settings-${(hash >>> 0).toString(16)}`;
  }

  function buildAllKeywordNamesFromGroups(keywordGroups) {
    const names = [];
    const seen = new Set();

    for (const group of keywordGroups) {
      for (const item of group.items) {
        if (seen.has(item.name)) {
          continue;
        }

        seen.add(item.name);
        names.push(item.name);
      }
    }

    return names;
  }

  function buildDefaultKeywordColorByName(profileDefinition) {
    const mapping = {};
    const keywordNames = buildAllKeywordNamesFromGroups(profileDefinition.keywordGroups);

    for (const keyword of keywordNames) {
      if (profileDefinition.defaultColorGroups.green.has(keyword)) {
        mapping[keyword] = "green";
        continue;
      }

      if (profileDefinition.defaultColorGroups.yellow.has(keyword)) {
        mapping[keyword] = "yellow";
        continue;
      }

      if (profileDefinition.defaultColorGroups.orange.has(keyword)) {
        mapping[keyword] = "orange";
        continue;
      }

      mapping[keyword] = "red";
    }

    return mapping;
  }

  function buildKeywordToGroupMap(profileId = activeProfileId) {
    const definition = getProfileDefinition(profileId);
    const map = new Map();
    for (const group of definition.keywordGroups) {
      for (const item of group.items) {
        if (!map.has(item.name)) {
          map.set(item.name, group.group);
        }
      }
    }
    return map;
  }

  function getKeywordNamesForSettings(profileId = activeProfileId) {
    const definition = getProfileDefinition(profileId);
    const allKeywordNames = getAllKeywordNamesForProfile(profileId);
    const displayOrder = new Map((definition.keywordDisplayOrder || []).map((name, index) => [name, index]));

    return [...allKeywordNames].sort((left, right) => {
      const leftOrder = displayOrder.has(left) ? displayOrder.get(left) : Number.MAX_SAFE_INTEGER;
      const rightOrder = displayOrder.has(right) ? displayOrder.get(right) : Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.localeCompare(right);
    });
  }

  function buildProfileDefinitions() {
    const backendDefinition = {
      id: "backend",
      label: PROFILE_LABELS.backend,
      keywordGroups: BACKEND_KEYWORD_GROUPS,
      keywordDisplayOrder: KEYWORD_DISPLAY_ORDER,
      defaultColorGroups: KEYWORD_COLOR_GROUPS
    };

    const emptyColorGroups = {
      green: new Set(),
      yellow: new Set(),
      orange: new Set()
    };

    return {
      backend: backendDefinition,
      agenticsys: {
        id: "agenticsys",
        label: PROFILE_LABELS.agenticsys,
        keywordGroups: AGENTICSYS_KEYWORD_GROUPS,
        keywordDisplayOrder: AGENTICSYS_KEYWORD_DISPLAY_ORDER,
        defaultColorGroups: emptyColorGroups
      },
      appsec: {
        id: "appsec",
        label: PROFILE_LABELS.appsec,
        keywordGroups: [],
        keywordDisplayOrder: [],
        defaultColorGroups: emptyColorGroups
      }
    };
  }

  function buildDefaultProfileSettingsById() {
    const mapping = {};
    for (const profileId of PROFILE_ORDER) {
      mapping[profileId] = createDefaultProfileSettings(profileId);
    }
    return mapping;
  }

  function createDefaultProfileSettings(profileId) {
    const definition = getProfileDefinition(profileId);
    return {
      keywordColorByName: buildDefaultKeywordColorByName(definition),
      colorWeights: { ...DEFAULT_COLOR_WEIGHTS }
    };
  }

  function getProfileDefinition(profileId) {
    return PROFILE_DEFINITIONS[normalizeProfileId(profileId)] || PROFILE_DEFINITIONS[DEFAULT_PROFILE_ID];
  }

  function normalizeProfileId(profileId) {
    const normalized = String(profileId || "").trim().toLowerCase();
    return PROFILE_ORDER.includes(normalized) ? normalized : null;
  }

  function getAllKeywordNamesForProfile(profileId) {
    return buildAllKeywordNamesFromGroups(getProfileDefinition(profileId).keywordGroups);
  }

  function cloneProfileSettingsById(source) {
    const cloned = {};
    for (const profileId of PROFILE_ORDER) {
      const input = source?.[profileId];
      cloned[profileId] = {
        keywordColorByName: { ...(input?.keywordColorByName || {}) },
        colorWeights: { ...(input?.colorWeights || {}) }
      };
    }
    return cloned;
  }

  function normalizeSingleProfileSettings(profileId, rawSettings) {
    const defaults = createDefaultProfileSettings(profileId);
    const normalized = {
      keywordColorByName: { ...defaults.keywordColorByName },
      colorWeights: { ...defaults.colorWeights }
    };

    const keywords = getAllKeywordNamesForProfile(profileId);
    for (const keyword of keywords) {
      const candidate = normalizeColor(rawSettings?.keywordColorByName?.[keyword]);
      if (candidate) {
        normalized.keywordColorByName[keyword] = candidate;
      }
    }

    for (const color of COLOR_OPTIONS) {
      const rawWeight = Number(rawSettings?.colorWeights?.[color]);
      if (Number.isFinite(rawWeight) && rawWeight > 0) {
        normalized.colorWeights[color] = clamp(rawWeight, 0.4, 1.6);
      }
    }

    return normalized;
  }

  function getDraftActiveProfileId() {
    const normalized = normalizeProfileId(draftActiveProfileId);
    return normalized || activeProfileId || DEFAULT_PROFILE_ID;
  }

  function ensureDraftProfileSettings(profileId) {
    if (!draftProfileSettingsById) {
      draftProfileSettingsById = cloneProfileSettingsById(profileSettingsById);
    }

    if (!draftProfileSettingsById[profileId]) {
      draftProfileSettingsById[profileId] = createDefaultProfileSettings(profileId);
    }
  }

  function getEditableProfileSettings(profileId) {
    const normalized = normalizeProfileId(profileId) || DEFAULT_PROFILE_ID;
    if (draftProfileSettingsById?.[normalized]) {
      return draftProfileSettingsById[normalized];
    }

    return getLiveProfileSettings(normalized);
  }

  function getLiveProfileSettings(profileId) {
    const normalized = normalizeProfileId(profileId) || DEFAULT_PROFILE_ID;
    if (!profileSettingsById[normalized]) {
      profileSettingsById[normalized] = createDefaultProfileSettings(normalized);
    }

    return profileSettingsById[normalized];
  }

  function formatWeight(value) {
    return Number(value || 0).toFixed(2);
  }

  async function saveCachedAnalysis(entry) {
    try {
      const stored = await chrome.storage.local.get({ analysisCacheByUrl: {} });
      const analysisCacheByUrl = stored.analysisCacheByUrl || {};
      analysisCacheByUrl[entry.url] = sanitizeCacheEntryForStorage(entry);

      await chrome.storage.local.set({
        analysisCacheByUrl,
        lastAnalysis: sanitizeCacheEntryForStorage(entry)
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

  async function pruneCachedJobTextFromStorage() {
    try {
      const stored = await chrome.storage.local.get({ analysisCacheByUrl: {}, lastAnalysis: null });
      const cacheByUrl = stored.analysisCacheByUrl || {};
      let changed = false;
      const sanitizedCacheByUrl = {};

      for (const [url, entry] of Object.entries(cacheByUrl)) {
        const sanitized = sanitizeCacheEntryForStorage(entry);
        sanitizedCacheByUrl[url] = sanitized;
        if (JSON.stringify(sanitized) !== JSON.stringify(entry)) {
          changed = true;
        }
      }

      const lastAnalysisSanitized = sanitizeCacheEntryForStorage(stored.lastAnalysis);
      if (JSON.stringify(lastAnalysisSanitized) !== JSON.stringify(stored.lastAnalysis || null)) {
        changed = true;
      }

      if (!changed) {
        return;
      }

      await chrome.storage.local.set({
        analysisCacheByUrl: sanitizedCacheByUrl,
        lastAnalysis: lastAnalysisSanitized
      });
    } catch (error) {
      if (!isExtensionContextInvalidated(error)) {
        throw error;
      }
    }
  }

  function sanitizeCacheEntryForStorage(entry) {
    if (!entry || typeof entry !== "object") {
      return entry || null;
    }

    const profileId = normalizeProfileId(entry.profileId) || DEFAULT_PROFILE_ID;
    const extraction = { ...(entry.extraction || {}) };
    const fullText = String(extraction.jobText || "");
    if (fullText) {
      extraction.jobTextSnippet = fullText.slice(0, 500);
      extraction.jobText = "";
      extraction.jobTextRemoved = true;
    }

    return {
      ...entry,
      profileId,
      extraction
    };
  }

  async function detectAnalysisHistory(currentUrl, profileId = activeProfileId) {
    const normalizedUrl = String(currentUrl || window.location.href || "").trim();
    const normalizedProfileId = normalizeProfileId(profileId) || DEFAULT_PROFILE_ID;

    try {
      const stored = await chrome.storage.local.get({
        analysisCacheByUrl: {},
        [APPLIED_STORAGE_KEY]: {},
        [JD_CORPUS_STORAGE_KEY]: {}
      });
      const analysisCacheByUrl = stored.analysisCacheByUrl || {};
      const appliedByUrl = stored[APPLIED_STORAGE_KEY] || {};
      const corpusByProfile = stored[JD_CORPUS_STORAGE_KEY] || {};
      const profileData = corpusByProfile[normalizedProfileId] || {};
      const savedItems = normalizeCorpusItems(profileData.items || []);
      const totalCachedUrls = Object.keys(analysisCacheByUrl).length;
      const totalAppliedUrls = Object.keys(appliedByUrl).length;
      const totalSavedJds = savedItems.length;

      return {
        url: normalizedUrl,
        seenBefore: Boolean(normalizedUrl && analysisCacheByUrl[normalizedUrl]),
        totalCachedUrls,
        totalAppliedUrls,
        totalSavedJds,
        applied: Boolean(normalizedUrl && appliedByUrl[normalizedUrl])
      };
    } catch (error) {
      if (isExtensionContextInvalidated(error)) {
        return {
          url: normalizedUrl,
          seenBefore: false,
          totalCachedUrls: 0,
          totalAppliedUrls: 0,
          totalSavedJds: 0,
          applied: false
        };
      }
      throw error;
    }
  }

  async function setAppliedStateForUrl(url, isApplied) {
    const normalizedUrl = String(url || "").trim();
    if (!normalizedUrl) {
      return;
    }

    try {
      const stored = await chrome.storage.local.get({ [APPLIED_STORAGE_KEY]: {} });
      const appliedByUrl = stored[APPLIED_STORAGE_KEY] || {};

      if (isApplied) {
        appliedByUrl[normalizedUrl] = true;
      } else {
        delete appliedByUrl[normalizedUrl];
      }

      await chrome.storage.local.set({ [APPLIED_STORAGE_KEY]: appliedByUrl });
    } catch (error) {
      if (!isExtensionContextInvalidated(error)) {
        throw error;
      }
    }
  }

  async function refreshSavedIndicator(extraction) {
    currentJdKey = buildCorpusEntryKey(extraction);
    const profileId = normalizeProfileId(activeProfileId) || DEFAULT_PROFILE_ID;
    const token = Date.now();
    saveButtonStateToken = token;

    if (!currentJdKey) {
      applySavedIndicator(false);
      return;
    }

    try {
      const stored = await chrome.storage.local.get({ [JD_CORPUS_STORAGE_KEY]: {} });
      if (saveButtonStateToken !== token) {
        return;
      }

      const corpusByProfile = stored[JD_CORPUS_STORAGE_KEY] || {};
      const profileData = corpusByProfile[profileId] || {};
      const items = normalizeCorpusItems(profileData.items || []);
      const alreadySaved = items.some((item) => item.KEY === currentJdKey);

      applySavedIndicator(alreadySaved);
    } catch (error) {
      if (isExtensionContextInvalidated(error)) {
        return;
      }
      applySavedIndicator(false);
    }
  }

  async function persistJdToCorpusFile(profileId, extraction) {
    const normalizedProfileId = normalizeProfileId(profileId) || DEFAULT_PROFILE_ID;
    const normalizedText = normalizeCorpusJdText(extraction?.jobText || "");
    const corpusKey = buildCorpusEntryKey(extraction);

    if (!normalizedText || !corpusKey) {
      return false;
    }

    try {
      const stored = await chrome.storage.local.get({ [JD_CORPUS_STORAGE_KEY]: {} });
      const corpusByProfile = stored[JD_CORPUS_STORAGE_KEY] || {};
      const profileData = corpusByProfile[normalizedProfileId] || {};
      const items = normalizeCorpusItems(profileData.items || []);

      const exists = items.some((item) => item.KEY === corpusKey);
      const nextItems = normalizeCorpusItems(
        exists ? items : [...items, { NO: items.length + 1, KEY: corpusKey, JD: normalizedText }]
      );

      const fileName = getCorpusFileName(normalizedProfileId);
      const fileText = buildCorpusFileText(nextItems);
      const unchanged =
        isCorpusProfileDataNormalized(profileData, nextItems, fileText, fileName) &&
        exists;

      if (unchanged) {
        return true;
      }

      corpusByProfile[normalizedProfileId] = {
        ...(profileData && typeof profileData === "object" ? profileData : {}),
        fileName,
        schemaVersion: 2,
        updatedAt: new Date().toISOString(),
        items: nextItems,
        fileText
      };

      await chrome.storage.local.set({ [JD_CORPUS_STORAGE_KEY]: corpusByProfile });
      return true;
    } catch (error) {
      if (isExtensionContextInvalidated(error)) {
        return false;
      }

      throw error;
    }
  }

  async function getProfileCorpus(profileId) {
    const normalizedProfileId = normalizeProfileId(profileId) || DEFAULT_PROFILE_ID;
    const stored = await chrome.storage.local.get({ [JD_CORPUS_STORAGE_KEY]: {} });
    const corpusByProfile = stored[JD_CORPUS_STORAGE_KEY] || {};
    const profileData = corpusByProfile[normalizedProfileId] || {};
    const items = normalizeCorpusItems(profileData.items || []);

    return {
      profileId: normalizedProfileId,
      fileName: getCorpusFileName(normalizedProfileId),
      fileText: buildCorpusFileText(items),
      items
    };
  }

  async function migrateLegacyCorpusToJsonStructure() {
    try {
      const stored = await chrome.storage.local.get({
        [JD_CORPUS_STORAGE_KEY]: {},
        analysisCacheByUrl: {}
      });
      const corpusByProfile = stored[JD_CORPUS_STORAGE_KEY] || {};
      const analysisCacheByUrl = stored.analysisCacheByUrl || {};
      const nextCorpusByProfile = { ...corpusByProfile };
      let changed = false;

      for (const [profileId, profileDataRaw] of Object.entries(corpusByProfile)) {
        const normalizedProfileId = normalizeProfileId(profileId) || profileId;
        const profileData = profileDataRaw && typeof profileDataRaw === "object" ? profileDataRaw : {};
        const normalizedItems = normalizeCorpusItems(profileData.items || [], { analysisCacheByUrl });
        const fileName = profileData.fileName || getCorpusFileName(normalizeProfileId(profileId) || DEFAULT_PROFILE_ID);
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
    } catch (error) {
      if (!isExtensionContextInvalidated(error)) {
        throw error;
      }
    }
  }

  async function wipeCurrentProfileCachesIfEnabled() {
    if (!FEATURE_FLAGS.enableProfileCacheWipeEntry) {
      return false;
    }

    const profileId = normalizeProfileId(activeProfileId) || DEFAULT_PROFILE_ID;
    await wipeProfileScopedCaches(profileId);
    return true;
  }

  async function wipeProfileScopedCaches(profileId) {
    const normalizedProfileId = normalizeProfileId(profileId) || DEFAULT_PROFILE_ID;
    const stored = await chrome.storage.local.get({ analysisCacheByUrl: {}, lastAnalysis: null });
    const cacheByUrl = stored.analysisCacheByUrl || {};
    const nextCacheByUrl = {};

    for (const [url, entry] of Object.entries(cacheByUrl)) {
      const entryProfileId = normalizeProfileId(entry?.profileId) || DEFAULT_PROFILE_ID;
      if (entryProfileId === normalizedProfileId) {
        continue;
      }
      nextCacheByUrl[url] = entry;
    }

    const lastAnalysis = stored.lastAnalysis;
    const lastAnalysisProfileId = normalizeProfileId(lastAnalysis?.profileId) || DEFAULT_PROFILE_ID;
    const nextLastAnalysis = lastAnalysisProfileId === normalizedProfileId ? null : lastAnalysis || null;

    await chrome.storage.local.set({
      analysisCacheByUrl: nextCacheByUrl,
      lastAnalysis: nextLastAnalysis
    });
  }

  function getCorpusFileName(profileId) {
    return PROFILE_FILE_BY_ID[profileId] || `${profileId}.txt`;
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
    const title = normalizeCorpusKey(extraction?.jobTitle || extraction?.pageTitle || document.title || "");
    const company = normalizeCorpusKey(extraction?.companyName || "");
    return normalizeCorpusKey([title, company].filter(Boolean).join(" "));
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

  function buildCacheEntryMeta(extraction) {
    return {
      canonicalUrlKey: canonicalizeAnalysisUrl(extraction?.url || window.location.href),
      jobTextHash: computeJobTextHash(extraction?.jobText || ""),
      jobTextLength: String(extraction?.jobText || "").length
    };
  }

  function canonicalizeAnalysisUrl(rawUrl) {
    try {
      const parsed = new URL(rawUrl || window.location.href);
      const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
      const path = parsed.pathname.replace(/\/+$/, "");
      const keyParams = new URLSearchParams();

      if (host.includes("linkedin.com")) {
        const currentJobId = parsed.searchParams.get("currentJobId") || parsed.searchParams.get("jobId");
        if (currentJobId) {
          keyParams.set("jobId", currentJobId);
        }
      } else if (host.includes("indeed.")) {
        const indeedJobKey = parsed.searchParams.get("jk") || parsed.searchParams.get("vjk");
        if (indeedJobKey) {
          keyParams.set("jk", indeedJobKey);
        }
      }

      const query = keyParams.toString();
      return query ? `${host}${path}?${query}` : `${host}${path}`;
    } catch (_error) {
      return String(rawUrl || "").trim().toLowerCase();
    }
  }

  function computeJobTextHash(jobText) {
    const normalized = normalizeText(String(jobText || ""))
      .slice(0, 16000)
      .toLowerCase();

    if (!normalized) {
      return "";
    }

    let hash = 2166136261;
    for (let index = 0; index < normalized.length; index += 1) {
      hash ^= normalized.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return `fnv1a-${(hash >>> 0).toString(16)}`;
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
      const fallbackCandidates = collectFallbackCandidates(hostname);
      jobText = fallbackCandidates[0]?.text || "";
      extractionSource = fallbackCandidates[0]?.selector || extractionSource;
    }

    if (!jobText && hostname.includes("linkedin.com")) {
      const bodyText = normalizeLinkedInJobText(cleanText(document.body?.innerText || "").slice(0, 90000));
      if (bodyText.length >= 200) {
        jobText = bodyText;
        extractionSource = "linkedin-body-about-job-fallback";
      }
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

    function collectFallbackCandidates(currentHostname) {
      const roots = [];
      const addRoot = (element) => {
        if (!element || roots.includes(element)) {
          return;
        }
        roots.push(element);
      };

      if (currentHostname.includes("linkedin.com")) {
        addRoot(document.querySelector(".jobs-search__job-details--container"));
        addRoot(document.querySelector(".jobs-search__right-rail"));
        addRoot(document.querySelector(".scaffold-layout__detail"));
      } else if (currentHostname.includes("indeed.com")) {
        addRoot(document.querySelector("#jobDescriptionText"));
        addRoot(document.querySelector(".jobsearch-JobComponent-description"));
        addRoot(document.querySelector("[data-testid='jobsearch-JobComponent-description']"));
      }

      addRoot(document.querySelector("main"));
      addRoot(document.querySelector("article"));
      addRoot(document.querySelector("section"));
      if (roots.length === 0) {
        addRoot(document.body);
      }

      const seen = new Set();
      const candidates = [];

      for (const root of roots) {
        if (!root) {
          continue;
        }

        const scopedNodes = [root, ...Array.from(root.querySelectorAll("article, section, div")).slice(0, MAX_FALLBACK_SCAN_NODES)];

        for (const node of scopedNodes) {
          if (!node || seen.has(node)) {
            continue;
          }

          seen.add(node);

          if (!isVisibleish(node)) {
            continue;
          }

          const text = cleanText(node.innerText || node.textContent || "");
          if (text.length < 280 || text.length > 52000) {
            continue;
          }

          const normalized = normalizeFallbackEntry(
            {
              text,
              selector: describeElement(node)
            },
            currentHostname
          );

          if (!normalized || normalized.text.length < 280) {
            continue;
          }

          candidates.push({
            ...normalized,
            score: scoreFallbackCandidate(normalized.text, currentHostname)
          });

          if (candidates.length >= MAX_FALLBACK_SCAN_NODES) {
            break;
          }
        }

        if (candidates.length >= MAX_FALLBACK_SCAN_NODES) {
          break;
        }
      }

      return candidates
        .sort((left, right) => right.score - left.score || left.text.length - right.text.length)
        .map((entry) => ({
          text: entry.text,
          selector: entry.selector
        }));
    }

    function scoreFallbackCandidate(text, currentHostname) {
      const lower = text.toLowerCase();
      let score = 0;

      if (currentHostname.includes("linkedin.com")) {
        if (lower.includes("about the job")) {
          score += 10;
        }
        if (lower.includes("about the role")) {
          score += 4;
        }
        if (lower.includes("responsibilities")) {
          score += 4;
        }
        if (lower.includes("qualifications") || lower.includes("requirements")) {
          score += 3;
        }
        if (lower.includes("people you can reach out to") || lower.includes("job search faster with premium")) {
          score -= 8;
        }
      }

      if (lower.includes("requirements")) {
        score += 2;
      }
      if (lower.includes("experience")) {
        score += 2;
      }
      if (lower.includes("preferred")) {
        score += 1;
      }

      score += Math.min(Math.floor(text.length / 1800), 5);
      return score;
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
        return findLinkedInJobDescriptionByContainerScan();
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

      return findLinkedInJobDescriptionByContainerScan();
    }

    function findLinkedInJobDescriptionByContainerScan() {
      const roots = [
        document.querySelector(".jobs-search__job-details--container"),
        document.querySelector(".jobs-search__right-rail"),
        document.querySelector(".scaffold-layout__detail"),
        document.querySelector("main")
      ].filter(Boolean);

      if (roots.length === 0) {
        roots.push(document.body);
      }

      const seen = new Set();
      const candidates = [];
      let scanned = 0;

      for (const root of roots) {
        const containers = [root, ...Array.from(root.querySelectorAll("section, article, div")).slice(0, MAX_LINKEDIN_CONTAINER_SCAN)];

        for (const container of containers) {
          if (!container || seen.has(container)) {
            continue;
          }
          seen.add(container);

          scanned += 1;
          if (scanned > MAX_LINKEDIN_CONTAINER_SCAN) {
            break;
          }

          if (!isVisibleish(container)) {
            continue;
          }

          const text = cleanText(container.innerText || container.textContent || "");
          if (text.length < 250 || text.length > 32000) {
            continue;
          }

          const lower = text.toLowerCase();
          if (!lower.includes("about the job")) {
            continue;
          }

          const normalized = normalizeLinkedInJobText(text);
          if (normalized.length < 200) {
            continue;
          }

          const normalizedLower = normalized.toLowerCase();
          let quality = 0;
          if (normalizedLower.startsWith("about the job")) {
            quality += 4;
          }
          if (normalizedLower.includes("about the role")) {
            quality += 2;
          }
          if (normalizedLower.includes("responsibilities")) {
            quality += 2;
          }
          if (normalizedLower.includes("qualifications") || normalizedLower.includes("requirements")) {
            quality += 2;
          }

          candidates.push({
            text: normalized,
            selector: describeElement(container),
            length: normalized.length,
            quality
          });
        }

        if (scanned > MAX_LINKEDIN_CONTAINER_SCAN) {
          break;
        }
      }

      if (!candidates.length) {
        return null;
      }

      candidates.sort((left, right) => right.quality - left.quality || left.length - right.length);
      return {
        text: candidates[0].text,
        selector: candidates[0].selector
      };
    }

    function findHeadingByText(targets) {
      return findHeadingElementsByText(targets)[0] || null;
    }

    function findHeadingElementsByText(targets) {
      const normalizedTargets = targets.map((target) => target.toLowerCase());
      const matches = [];
      const seen = new Set();

      const addMatchesFromList = (elements) => {
        for (const element of elements) {
          if (!element || seen.has(element)) {
            continue;
          }
          seen.add(element);

          const text = cleanText(element.innerText || element.textContent || "").toLowerCase();
          if (!text || text.length > 220) {
            continue;
          }

          if (!isVisibleish(element)) {
            continue;
          }

          const hit = normalizedTargets.some((target) => {
            if (text === target || text.startsWith(`${target} `)) {
              return true;
            }

            return text.includes(target) && text.length <= 140;
          });

          if (hit) {
            matches.push(element);
          }
        }
      };

      addMatchesFromList(Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading'], strong")));
      if (matches.length > 0) {
        return matches;
      }

      const scopedRoots = [
        document.querySelector(".jobs-search__job-details--container"),
        document.querySelector(".jobs-search__right-rail"),
        document.querySelector("#jobDescriptionText"),
        document.querySelector("main")
      ].filter(Boolean);

      if (scopedRoots.length === 0) {
        scopedRoots.push(document.body);
      }

      let scanned = 0;
      for (const root of scopedRoots) {
        const fallbackNodes = Array.from(root.querySelectorAll("div, p, span")).slice(0, MAX_HEADING_FALLBACK_NODES);
        addMatchesFromList(
          fallbackNodes.filter(() => {
            scanned += 1;
            return scanned <= MAX_HEADING_FALLBACK_NODES;
          })
        );

        if (scanned >= MAX_HEADING_FALLBACK_NODES) {
          break;
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
        "job search faster with premium",
        "get personalized tips to stand out to hirers",
        "interested in working with us in the future",
        "commitments",
        "reactivate premium",
        "your profile and resume match",
        "did you finish applying",
        "how promoted jobs are ranked"
      ];

      const trimmedLower = trimmed.toLowerCase();
      let stopIndex = trimmed.length;
      const roleSignals = [
        "about the role",
        "responsibilities",
        "requirements",
        "qualifications",
        "what you'll do",
        "what you will do",
        "position summary",
        "job summary"
      ];

      for (const marker of stopMarkers) {
        const indexes = findAllMarkerIndexes(trimmedLower, marker, "about the job".length);
        for (const markerIndex of indexes) {
          if (!shouldStopLinkedInText(trimmedLower, marker, markerIndex, roleSignals, stopIndex)) {
            continue;
          }

          stopIndex = Math.min(stopIndex, markerIndex);
        }
      }

      trimmed = trimmed.slice(0, stopIndex).trim();

      if (startsWithCompanySection(trimmed) && !trimmed.toLowerCase().includes("about the job")) {
        return "";
      }

      return trimmed;
    }

    function findAllMarkerIndexes(text, marker, fromIndex) {
      const indexes = [];
      let searchIndex = Math.max(0, fromIndex || 0);

      while (searchIndex < text.length) {
        const foundIndex = text.indexOf(marker, searchIndex);
        if (foundIndex === -1) {
          break;
        }

        indexes.push(foundIndex);
        searchIndex = foundIndex + marker.length;
      }

      return indexes;
    }

    function shouldStopLinkedInText(text, marker, markerIndex, roleSignals, currentStopIndex) {
      if (marker === "about the company") {
        const hasRoleSignalAfter = roleSignals.some((signal) => {
          const signalIndex = text.indexOf(signal, markerIndex + marker.length);
          return signalIndex !== -1 && signalIndex < currentStopIndex;
        });

        if (hasRoleSignalAfter) {
          return false;
        }

        if (markerIndex < 220) {
          return false;
        }

        return true;
      }

      const hasRoleSignalBefore = roleSignals.some((signal) => {
        const signalIndex = text.indexOf(signal);
        return signalIndex !== -1 && signalIndex < markerIndex;
      });

      if (markerIndex < 180 && !hasRoleSignalBefore) {
        return false;
      }

      return true;
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
    const normalizedText = normalizeText(jobText).slice(0, MAX_ANALYSIS_TEXT_LENGTH);
    const sentenceRecords = buildSentenceRecords(normalizedText);
    const results = [];
    const activeKeywordGroups = getProfileDefinition(activeProfileId).keywordGroups;

    for (const group of activeKeywordGroups) {
      for (const item of group.items) {
        const matches = collectMatches(item, sentenceRecords);

        if (matches.length === 0) {
          results.push(buildEmptyResult(group.group, item.name));
          continue;
        }

        const rawScore = calculateScore(matches);
        const score = applyColorWeight(rawScore, getColorGroup(item.name, activeProfileId));

        results.push({
          group: group.group,
          name: item.name,
          rawScore,
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
      rawScore: 0,
      score: 0,
      signal: "No signal",
      snippets: [],
      reasons: ["No direct mention found"]
    };
  }

  function collectMatches(item, sentenceRecords) {
    const matches = [];

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

  function applyColorWeight(score, colorGroup) {
    const activeWeights = getLiveProfileSettings(activeProfileId).colorWeights || DEFAULT_COLOR_WEIGHTS;
    const weight = Number(activeWeights[colorGroup] || DEFAULT_COLOR_WEIGHTS[colorGroup] || 1);
    return clamp(Math.round(score * weight), 0, 100);
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
