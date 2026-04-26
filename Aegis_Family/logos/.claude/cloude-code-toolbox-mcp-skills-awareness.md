# Cloude Code ToolBox — MCP & Skills awareness

_Generated: 2026-04-12T20:06:59.182Z_

## How to use this report

- **Saved copy:** This file is **`.claude/cloude-code-toolbox-mcp-skills-awareness.md`** — refreshed whenever the toolbox runs an MCP & Skills scan (including on workspace open when auto-scan is enabled). It is meant for **Claude Code workspace context** together with `CLAUDE.md` (which gets a shorter replaceable summary when auto-merge is on).
- **MCP:** Lists **configured** servers from VS Code `mcp.json`. **Claude Code** uses `~/.claude/settings.json` and `/mcp` in the panel for its own MCP list — align or port configs as needed.
- **Skills:** **On-disk** folders with `SKILL.md`. Claude Code does not auto-load them; attach `SKILL.md` or paths in chat when useful.
- **Task routing:** When the user’s request matches a server’s purpose (e.g. Confluence → Confluence/Atlassian MCP), prefer that **server id** from the tables below.

---

## MCP — workspace

Workspace `mcp.json` _(folder: logos)_

- **c:\Users\natha\logos\.vscode\mcp.json** — _File missing_

_No active workspace servers in mcp.json._

## MCP — user profile

- **C:\Users\natha\AppData\Roaming\Code\User\mcp.json** — _File exists — servers defined_

| Server id | Kind | Detail |
|-----------|------|--------|
| microsoft/markitdown | stdio | uvx markitdown-mcp@0.0.1a4 |
| MCPBrowser | stdio | npx -y mcpbrowser@latest |

## Skills (local `SKILL.md` folders)

### Project-scoped

_None found (or no workspace open)._

### User-scoped

- **skill-creator** — `C:\Users\natha\.claude\skills\skill-creator`
  - Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, update or optimize an existing skill, run evals to test a skill, benchmark skill p

- **appinsights-instrumentation** — `C:\Users\natha\.agents\skills\appinsights-instrumentation`
  - Guidance for instrumenting webapps with Azure Application Insights. Provides telemetry patterns, SDK setup, and configuration references. WHEN: how to instrument app, App Insights SDK, telemetry patterns, what is App Ins

- **azure-ai** — `C:\Users\natha\.agents\skills\azure-ai`
  - Use for Azure AI: Search, Speech, OpenAI, Document Intelligence. Helps with search, vector/hybrid search, speech-to-text, text-to-speech, transcription, OCR. WHEN: AI Search, query search, vector search, hybrid search, s

- **azure-aigateway** — `C:\Users\natha\.agents\skills\azure-aigateway`
  - Configure Azure API Management as an AI Gateway for AI models, MCP tools, and agents. WHEN: semantic caching, token limit, content safety, load balancing, AI model governance, MCP rate limiting, jailbreak detection, add 

- **azure-cloud-migrate** — `C:\Users\natha\.agents\skills\azure-cloud-migrate`
  - Assess and migrate cross-cloud workloads to Azure with migration reports and code conversion. Supports AWS Lambda→Functions and GCP Cloud Run→Container Apps. WHEN: migrate Lambda to Azure Functions, migrate AWS to Azure,

- **azure-compliance** — `C:\Users\natha\.agents\skills\azure-compliance`
  - Run Azure compliance and security audits with azqr plus Key Vault expiration checks. Covers best-practice assessment, resource review, policy/compliance validation, and security posture checks. WHEN: compliance scan, sec

- **azure-compute** — `C:\Users\natha\.agents\skills\azure-compute`
  - Azure VM and VMSS router for recommendations, pricing, autoscale, orchestration, and connectivity troubleshooting. WHEN: Azure VM, VMSS, scale set, recommend, compare, server, website, burstable, lightweight, VM family, 

- **azure-cost** — `C:\Users\natha\.agents\skills\azure-cost`
  - Unified Azure cost management: query historical costs, forecast future spending, and optimize to reduce waste. WHEN: \"Azure costs\", \"Azure spending\", \"Azure bill\", \"cost breakdown\", \"cost by service\", \"cost by

- **azure-deploy** — `C:\Users\natha\.agents\skills\azure-deploy`
  - Execute Azure deployments for ALREADY-PREPARED applications that have existing .azure/deployment-plan.md and infrastructure files. DO NOT use this skill when the user asks to CREATE a new application — use azure-prepare 

- **azure-diagnostics** — `C:\Users\natha\.agents\skills\azure-diagnostics`
  - Debug Azure production issues on Azure using AppLens, Azure Monitor, resource health, and safe triage. WHEN: debug production issues, troubleshoot container apps, troubleshoot functions, troubleshoot AKS, kubectl cannot 

- **azure-enterprise-infra-planner** — `C:\Users\natha\.agents\skills\azure-enterprise-infra-planner`
  - Architect and provision enterprise Azure infrastructure from workload descriptions. For cloud architects and platform engineers planning networking, identity, security, compliance, and multi-resource topologies with WAF 

- **azure-hosted-copilot-sdk** — `C:\Users\natha\.agents\skills\azure-hosted-copilot-sdk`
  - Build, deploy, modify GitHub Copilot SDK apps on Azure. MANDATORY when codebase contains @github/copilot-sdk or CopilotClient — use this skill instead of azure-prepare. PREFER OVER azure-prepare when codebase contains co

- **azure-kubernetes** — `C:\Users\natha\.agents\skills\azure-kubernetes`
  - Plan, create, and configure production-ready Azure Kubernetes Service (AKS) clusters. Covers Day-0 checklist, SKU selection (Automatic vs Standard), networking options (private API server, Azure CNI Overlay, egress confi

- **azure-kusto** — `C:\Users\natha\.agents\skills\azure-kusto`
  - Query and analyze data in Azure Data Explorer (Kusto/ADX) using KQL for log analytics, telemetry, and time series analysis. WHEN: KQL queries, Kusto database queries, Azure Data Explorer, ADX clusters, log analytics, tim

- **azure-messaging** — `C:\Users\natha\.agents\skills\azure-messaging`
  - Troubleshoot and resolve issues with Azure Messaging SDKs for Event Hubs and Service Bus. Covers connection failures, authentication errors, message processing issues, and SDK configuration problems. WHEN: event hub SDK 

- **azure-prepare** — `C:\Users\natha\.agents\skills\azure-prepare`
  - Prepare Azure apps for deployment (infra Bicep/Terraform, azure.yaml, Dockerfiles). Use for create/modernize or create+deploy; not cross-cloud migration (use azure-cloud-migrate). WHEN: \"create app\", \"build web app\",

- **azure-quotas** — `C:\Users\natha\.agents\skills\azure-quotas`
  - Check/manage Azure quotas and usage across providers. For deployment planning, capacity validation, region selection. WHEN: \"check quotas\", \"service limits\", \"current usage\", \"request quota increase\", \"quota exc

- **azure-rbac** — `C:\Users\natha\.agents\skills\azure-rbac`
  - Helps users find the right Azure RBAC role for an identity with least privilege access, then generate CLI commands and Bicep code to assign it. Also provides guidance on permissions required to grant roles. WHEN: bicep f

- **azure-resource-lookup** — `C:\Users\natha\.agents\skills\azure-resource-lookup`
  - List, find, and show Azure resources across subscriptions or resource groups. Handles prompts like \"list websites\", \"list virtual machines\", \"list my VMs\", \"show storage accounts\", \"find container apps\", and \"

- **azure-resource-visualizer** — `C:\Users\natha\.agents\skills\azure-resource-visualizer`
  - Analyze Azure resource groups and generate detailed Mermaid architecture diagrams showing the relationships between individual resources. WHEN: create architecture diagram, visualize Azure resources, show resource relati

- **azure-storage** — `C:\Users\natha\.agents\skills\azure-storage`
  - Azure Storage Services including Blob Storage, File Shares, Queue Storage, Table Storage, and Data Lake. Provides object storage, SMB file shares, async messaging, NoSQL key-value, and big data analytics capabilities. In

- **azure-upgrade** — `C:\Users\natha\.agents\skills\azure-upgrade`
  - Assess and upgrade Azure workloads between plans, tiers, or SKUs within Azure. Generates assessment reports and automates upgrade steps. WHEN: upgrade Consumption to Flex Consumption, upgrade Azure Functions plan, migrat

- **azure-validate** — `C:\Users\natha\.agents\skills\azure-validate`
  - Pre-deployment validation for Azure readiness. Run deep checks on configuration, infrastructure (Bicep or Terraform), RBAC role assignments, managed identity permissions, and prerequisites before deploying. WHEN: validat

- **entra-app-registration** — `C:\Users\natha\.agents\skills\entra-app-registration`
  - Guides Microsoft Entra ID app registration, OAuth 2.0 authentication, and MSAL integration. USE FOR: create app registration, register Azure AD app, configure OAuth, set up authentication, add API permissions, generate s

- **microsoft-foundry** — `C:\Users\natha\.agents\skills\microsoft-foundry`
  - Deploy, evaluate, and manage Foundry agents end-to-end: Docker build, ACR push, hosted/prompt agent create, container start, batch eval, prompt optimization, prompt optimizer workflows, agent.yaml, dataset curation from 

---

## Suggested next steps

- **MCP:** Command Palette → `MCP: List Servers` (or this extension’s hub **MCP** tab). In Claude Code, use `/mcp` to connect servers for the Claude session.
- **Edit config:** `MCP: Open Workspace Folder MCP Configuration` / `MCP: Open User Configuration`.
- **Refresh this report:** run **Intelligence — scan MCP & Skills awareness** again after changing `mcp.json` or adding skills.

_Report from Cloude Code ToolBox extension._
