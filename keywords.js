export const KEYWORD_GROUPS = [
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

export const BACKEND_KEYWORD_GROUPS = KEYWORD_GROUPS.filter((group) => group.group !== "AI & LLM")
  .map((group) => ({
    ...group,
    items: group.items.filter((item) => item.name !== "Vector DB")
  }))
  .filter((group) => group.items.length > 0);

export const AGENTICSYS_KEYWORD_GROUPS = [
  {
    group: "AI Core",
    items: [
      { name: "LLM", aliases: ["llm", "llms", "large language model", "large language models"] },
      { name: "GenAI", aliases: ["generative ai", "genai", "gen ai", "ai-native", "ai native"] },
      { name: "Prompt Engineering", aliases: ["prompt engineering", "prompt design", "prompt tuning", "prompt optimization", "prompt writing"] },
      { name: "RAG", aliases: ["rag", "retrieval augmented generation", "retrieval-augmented generation", "rag pipeline", "rag pipelines"] },
      { name: "AI Agents", aliases: ["agentic", "ai agent", "ai agents", "agent workflows", "agent systems", "agentic systems", "agentic workflows", "autonomous agents"] },
      { name: "Multi-Agent", aliases: ["multi-agent", "multi agent", "sub-agent", "sub agent", "supervisor/sub-agent", "agent orchestration"] },
      { name: "MCP", aliases: ["mcp", "mcp server", "mcp servers", "model context protocol"] },
      { name: "LLM APIs", aliases: ["llm api", "llm apis", "model api", "model apis", "foundation model api", "foundation model apis"] },
      { name: "Embeddings", aliases: ["embedding", "embeddings"] },
      { name: "Fine-Tuning", aliases: ["fine tune", "fine-tune", "fine tuning", "fine-tuning"] },
      { name: "Evals", aliases: ["eval", "evals", "model eval", "model evals", "llm eval", "llm evals", "agent eval", "agent evals", "evaluation pipeline", "benchmark datasets", "regression testing for agents"] }
    ]
  },
  {
    group: "Frameworks",
    items: [
      { name: "LangChain", aliases: ["langchain"] },
      { name: "LangGraph", aliases: ["langgraph"] },
      { name: "LangSmith", aliases: ["langsmith"] },
      { name: "LlamaIndex", aliases: ["llamaindex"] },
      { name: "ADK", aliases: ["adk", "google adk", "agent development kit", "agent development kits"] }
    ]
  },
  {
    group: "Model Platforms",
    items: [
      { name: "OpenAI", aliases: ["openai", "gpt-4", "gpt 4", "gpt-5", "gpt 5"] },
      { name: "Claude", aliases: ["claude", "anthropic"] },
      { name: "Gemini", aliases: ["gemini"] },
      { name: "Bedrock", aliases: ["bedrock", "aws bedrock", "amazon bedrock"] },
      { name: "Vertex AI", aliases: ["vertex ai"] },
      { name: "Azure OpenAI", aliases: ["azure openai"] }
    ]
  },
  {
    group: "Runtime & Infra",
    items: [
      { name: "Python", aliases: ["python"] },
      { name: "TypeScript", aliases: ["typescript"] },
      { name: "JavaScript", aliases: ["javascript"] },
      { name: "Node.js", aliases: ["node.js", "nodejs", "node js"] },
      { name: "Java", aliases: ["java"] },
      { name: "Go", aliases: ["golang", "go language"] },
      { name: "PyTorch", aliases: ["pytorch"] },
      { name: "TensorFlow", aliases: ["tensorflow"] },
      { name: "MLflow", aliases: ["mlflow"] },
      { name: "Weights & Biases", aliases: ["weights & biases", "wandb", "w&b"] },
      { name: "Arize", aliases: ["arize"] },
      { name: "Observability", aliases: ["observability", "agent observability", "model monitoring", "llm observability", "tracing"] },
      { name: "Docker", aliases: ["docker"] },
      { name: "Kubernetes", aliases: ["kubernetes", "k8s"] },
      { name: "Terraform", aliases: ["terraform"] },
      { name: "AWS", aliases: ["aws", "amazon web services"] },
      { name: "Azure", aliases: ["azure", "microsoft azure"] },
      { name: "GCP", aliases: ["gcp", "google cloud", "google cloud platform"] },
      { name: "OpenShift", aliases: ["openshift"] }
    ]
  },
  {
    group: "Data & Integration",
    items: [
      { name: "Vector DB", aliases: ["vector db", "vector database", "vector databases", "vectordb", "vector store", "vector stores"] },
      { name: "Pinecone", aliases: ["pinecone"] },
      { name: "Weaviate", aliases: ["weaviate"] },
      { name: "Milvus", aliases: ["milvus"] },
      { name: "FAISS", aliases: ["faiss"] },
      { name: "pgvector", aliases: ["pgvector"] },
      { name: "Qdrant", aliases: ["qdrant"] },
      { name: "Chroma", aliases: ["chroma", "chromadb"] },
      { name: "Neo4j", aliases: ["neo4j"] },
      { name: "PostgreSQL", aliases: ["postgresql", "postgres", "postgre sql"] },
      { name: "MongoDB", aliases: ["mongodb", "mongo db"] },
      { name: "Redis", aliases: ["redis"] },
      { name: "Elasticsearch", aliases: ["elasticsearch", "elastic search"] },
      { name: "Kafka", aliases: ["kafka", "apache kafka"] },
      { name: "SQS", aliases: ["sqs", "amazon sqs"] },
      { name: "REST APIs", aliases: ["rest api", "restful api", "rest apis", "restful apis", "rest over http", "rest services", "rest endpoints"] },
      { name: "gRPC", aliases: ["grpc"] },
      { name: "GraphQL", aliases: ["graphql"] }
    ]
  }
];

export const AGENTICSYS_KEYWORD_COLOR_GROUPS = {
  green: new Set(["Java", "Docker", "REST APIs", "PostgreSQL", "Redis"]),
  yellow: new Set(["Python", "AWS", "Kafka", "MongoDB"]),
  orange: new Set(["TypeScript"])
};

export const PROFILE_KEYWORD_GROUPS = {
  backend: BACKEND_KEYWORD_GROUPS,
  agenticsys: AGENTICSYS_KEYWORD_GROUPS,
  appsec: []
};
