#!/usr/bin/env node

const DEFAULTS = {
  notionVersion: "2025-09-03",
  titleProperty: "Tarea",
  workIdProperty: "Work ID",
  statusProperty: "Estado",
  formalChannelProperty: "Canal formal",
  formalLinkProperty: "Enlace formal",
  notesProperty: "Notas",
  doneStatus: "Hecho",
  githubIssueChannel: "GitHub Issue",
  branchProperty: "Branch",
  noFormalIssuesToken: "Formal issues: none",
  implementationBranchPattern: /^(feat|fix|chore|refactor|docs|style|test|perf|revert)\//i,
  promotionPairs: {
    toStaging: { head: "development", base: "staging" },
    toMain: { head: "staging", base: "main" },
  },
};

async function main() {
  const command = process.argv[2];

  if (!command) {
    throw new Error(
      "Missing command. Use: pr-governance | validate-pr-policy | sync-main-promotion-closures"
    );
  }

  const config = getConfig();

  switch (command) {
    case "pr-governance":
      await prGovernance(config);
      return;
    case "validate-pr-policy":
      await validatePrPolicy(config);
      return;
    case "sync-main-promotion-closures":
      await syncMainPromotionClosures(config);
      return;
    default:
      throw new Error(`Unsupported command: ${command}`);
  }
}

function getConfig() {
  const repository = process.env.GITHUB_REPOSITORY;
  const [owner, repo] = repository ? repository.split("/") : [process.env.GITHUB_OWNER, process.env.GITHUB_REPO];

  return {
    githubToken: requiredEnv("GITHUB_TOKEN"),
    notionToken: requiredEnv("NOTION_TOKEN"),
    notionDataSourceId: requiredEnv("NOTION_BACKLOG_DATA_SOURCE_ID"),
    notionVersion: process.env.NOTION_VERSION || DEFAULTS.notionVersion,
    repository: {
      owner,
      repo,
      slug: repository || `${owner}/${repo}`,
    },
    properties: {
      title: process.env.NOTION_TITLE_PROPERTY || DEFAULTS.titleProperty,
      workId: process.env.NOTION_WORK_ID_PROPERTY || DEFAULTS.workIdProperty,
      status: process.env.NOTION_STATUS_PROPERTY || DEFAULTS.statusProperty,
      formalChannel: process.env.NOTION_FORMAL_CHANNEL_PROPERTY || DEFAULTS.formalChannelProperty,
      formalLink: process.env.NOTION_FORMAL_LINK_PROPERTY || DEFAULTS.formalLinkProperty,
      notes: process.env.NOTION_NOTES_PROPERTY || DEFAULTS.notesProperty,
      branch: process.env.NOTION_BRANCH_PROPERTY || DEFAULTS.branchProperty,
    },
    statuses: {
      done: process.env.NOTION_DONE_STATUS || DEFAULTS.doneStatus,
    },
    formalChannelName: process.env.NOTION_GITHUB_ISSUE_CHANNEL || DEFAULTS.githubIssueChannel,
    dryRun: parseBoolean(process.env.DRY_RUN),
    pullRequest: {
      headRef: process.env.PR_BRANCH_NAME || process.env.PR_HEAD_BRANCH || "",
      baseRef: process.env.PR_BASE_REF || process.env.PR_BASE_BRANCH || "",
      action: process.env.PR_ACTION || "opened",
      url: process.env.PR_URL || "",
      title: process.env.PR_TITLE || "",
      body: process.env.PR_BODY || "",
      merged: parseBoolean(process.env.PR_MERGED || process.env.PR_IS_MERGED),
    },
  };
}

async function prGovernance(config) {
  if (config.pullRequest.action === "closed") {
    await syncMainPromotionClosures(config);
    return;
  }

  await validatePrPolicy(config);
}

async function validatePrPolicy(config) {
  logHeader("Validate PR policy");

  const pr = classifyPr(config.pullRequest.headRef, config.pullRequest.baseRef);
  const closingRefs = extractClosingReferences(config.pullRequest.body);
  const hasNoFormalIssuesToken = containsNoFormalIssuesToken(config.pullRequest.body);

  switch (pr.type) {
    case "implementation":
      if (closingRefs.length > 0) {
        throw new Error(
          `Implementation PRs to development must reference issues without closing them. Replace closing keywords with 'Refs #N'. Found: ${closingRefs.join(", ")}`
        );
      }

      await ensureImplementationIssue(config, pr);
      return;

    case "promotion-to-staging":
      if (closingRefs.length > 0) {
        throw new Error(
          `Promotion PRs from development to staging must NOT close issues. Remove closing keywords and keep them for the staging->main promotion PR. Found: ${closingRefs.join(", ")}`
        );
      }

      console.log("Validated promotion PR to staging. Work ID enforcement is intentionally skipped.");
      return;

    case "promotion-to-main":
      if (closingRefs.length === 0 && !hasNoFormalIssuesToken) {
        throw new Error(
          `Promotion PRs from staging to main must declare formal closure intent with one or more closing references or the exact token '${DEFAULTS.noFormalIssuesToken}'.`
        );
      }

      if (closingRefs.length > 0 && hasNoFormalIssuesToken) {
        throw new Error(
          `Promotion PRs to main cannot mix closing references with the '${DEFAULTS.noFormalIssuesToken}' token. Choose exactly one path.`
        );
      }

      console.log("Validated promotion PR to main. Closure intent is explicit.");
      return;

    case "unsupported-implementation-target":
      throw new Error(
        `Implementation-like branches must target 'development'. Received '${config.pullRequest.headRef}' -> '${config.pullRequest.baseRef}'.`
      );

    default:
      console.log(
        `Skipping PR policy enforcement for '${config.pullRequest.headRef}' -> '${config.pullRequest.baseRef}' because it is outside the governed implementation/promotion flows.`
      );
  }
}

async function ensureImplementationIssue(config, pr) {
  const workId = extractWorkIdFromBranch(config.pullRequest.headRef);

  let page = null;

  if (workId) {
    page = await findNotionPageByWorkId(config, workId);

    if (!page) {
      throw new Error(`No Notion backlog item found for Work ID '${workId}'.`);
    }
  } else {
    page = await findNotionPageByBranchName(config, config.pullRequest.headRef);

    if (!page) {
      throw new Error(
        `Implementation branch '${config.pullRequest.headRef}' is missing a Work ID and does not match the Notion '${config.properties.branch}' field.`
      );
    }
  }

  const item = mapNotionItem(config, page);
  console.log(`Matched implementation PR to Notion item '${item.title}' (${item.workId}).`);

  if (item.formalChannel.value !== config.formalChannelName) {
    console.log(
      `Notion item ${item.workId} uses formal channel '${item.formalChannel.value || "<empty>"}'. GitHub issue validation is not required.`
    );
    return;
  }

  if (!item.formalLink.value) {
    throw new Error(
      `Notion item ${item.workId} requires a GitHub issue (Canal formal = ${config.formalChannelName}) but has no '${config.properties.formalLink}' URL. Formalize it manually before opening an implementation PR.`
    );
  }

  const linkedIssueNumber = extractIssueNumberFromUrl(item.formalLink.value);

  if (!linkedIssueNumber) {
    throw new Error(
      `Notion item ${item.workId} has an invalid formal link '${item.formalLink.value}'. Expected a GitHub issue URL.`
    );
  }

  const linkedIssue = await fetchGitHubIssue(config, linkedIssueNumber);
  console.log(`Validated linked GitHub issue #${linkedIssue.number} for ${item.workId}.`);
}

async function syncMainPromotionClosures(config) {
  logHeader("Sync merged main promotion closures");

  const pr = classifyPr(config.pullRequest.headRef, config.pullRequest.baseRef);

  if (pr.type !== "promotion-to-main") {
    console.log(`Skipping closure sync because '${config.pullRequest.headRef}' -> '${config.pullRequest.baseRef}' is not a staging->main promotion PR.`);
    return;
  }

  if (!config.pullRequest.merged) {
    console.log("Promotion PR was closed without merge. No closure sync is required.");
    return;
  }

  const closingRefs = extractClosingReferences(config.pullRequest.body);
  const hasNoFormalIssuesToken = containsNoFormalIssuesToken(config.pullRequest.body);

  if (closingRefs.length === 0 && hasNoFormalIssuesToken) {
    console.log(`Merged promotion PR declared '${DEFAULTS.noFormalIssuesToken}'. No Notion items will be closed.`);
    return;
  }

  if (closingRefs.length === 0) {
    throw new Error(
      `Merged promotion PR to main is missing closing references and does not include '${DEFAULTS.noFormalIssuesToken}'.`
    );
  }

  const uniqueIssueNumbers = [...new Set(closingRefs.map((entry) => entry.issueNumber))];
  console.log(`Syncing ${uniqueIssueNumbers.length} closed formal issue(s) from merged promotion PR.`);

  for (const issueNumber of uniqueIssueNumbers) {
    await syncIssueNumberToDone(config, issueNumber);
  }
}

async function syncIssueNumberToDone(config, issueNumber) {
  const issue = await fetchGitHubIssue(config, issueNumber);
  const page = await findNotionPageByIssueUrl(config, issue.html_url);

  if (!page) {
    console.warn(`No Notion backlog item found for issue ${issue.html_url}.`);
    return;
  }

  const item = mapNotionItem(config, page);
  console.log(`Marking Notion item ${item.workId || item.title} as done because issue #${issue.number} shipped to main.`);

  await updateNotionItem(config, item.pageId, {
    [config.properties.status]: notionOptionValue(item.status.type, config.statuses.done),
  });
}

function classifyPr(headRef, baseRef) {
  if (headRef === DEFAULTS.promotionPairs.toStaging.head && baseRef === DEFAULTS.promotionPairs.toStaging.base) {
    return { type: "promotion-to-staging" };
  }

  if (headRef === DEFAULTS.promotionPairs.toMain.head && baseRef === DEFAULTS.promotionPairs.toMain.base) {
    return { type: "promotion-to-main" };
  }

  if (DEFAULTS.implementationBranchPattern.test(headRef)) {
    if (baseRef === "development") {
      return { type: "implementation" };
    }

    return { type: "unsupported-implementation-target" };
  }

  return { type: "other" };
}

function extractClosingReferences(body) {
  const regex = /\b(close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)\b/gi;
  const matches = [];

  for (const match of body.matchAll(regex)) {
    matches.push({ keyword: match[1], issueNumber: Number.parseInt(match[2], 10) });
  }

  return matches;
}

function containsNoFormalIssuesToken(body) {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line === DEFAULTS.noFormalIssuesToken);
}

async function findNotionPageByWorkId(config, workId) {
  const parsed = parseWorkId(workId);

  if (parsed) {
    const pages = await queryNotionPages(config, {
      property: config.properties.workId,
      unique_id: { equals: parsed.number },
    });

    const exactPage = pages.find((page) => workIdMatches(page.properties[config.properties.workId], parsed));

    if (exactPage) {
      return exactPage;
    }
  }

  // Fallback 1: rich_text filter (may fail with unique_id property)
  let richTextPages = [];
  try {
    richTextPages = await queryNotionPages(config, {
      property: config.properties.workId,
      rich_text: { equals: workId },
    });
  } catch (error) {
    console.warn(`rich_text filter failed for Work ID '${workId}': ${error.message}`);
  }

  if (richTextPages[0]) {
    return richTextPages[0];
  }

  // Fallback 2: title filter (may also fail if property type is not title)
  let titlePages = [];
  try {
    titlePages = await queryNotionPages(config, {
      property: config.properties.workId,
      title: { equals: workId },
    });
  } catch (error) {
    console.warn(`title filter failed for Work ID '${workId}': ${error.message}`);
  }

  return titlePages[0] || null;
}

async function findNotionPageByIssueUrl(config, issueUrl) {
  const pages = await queryNotionPages(config, {
    property: config.properties.formalLink,
    url: { equals: issueUrl },
  });

  return pages[0] || null;
}

async function findNotionPageByBranchName(config, branchName) {
  let pages = [];
  try {
    pages = await queryNotionPages(config, {
      property: config.properties.branch,
      rich_text: { equals: branchName },
    });
  } catch (error) {
    console.warn(`rich_text filter failed for branch '${branchName}': ${error.message}`);
  }

  return pages[0] || null;
}

async function queryNotionPages(config, filter) {
  const pages = [];
  let startCursor;

  do {
    const body = {
      page_size: 100,
      result_type: "page",
      filter,
    };

    if (startCursor) {
      body.start_cursor = startCursor;
    }

    const response = await notionRequest(config, `/data_sources/${config.notionDataSourceId}/query`, {
      method: "POST",
      body,
    });

    pages.push(...response.results.filter((entry) => entry.object === "page"));
    startCursor = response.has_more ? response.next_cursor : null;
  } while (startCursor);

  return pages;
}

function mapNotionItem(config, page) {
  const properties = page.properties || {};
  const statusProperty = properties[config.properties.status];
  const channelProperty = properties[config.properties.formalChannel];
  const linkProperty = properties[config.properties.formalLink];
  const branchProperty = properties[config.properties.branch];

  return {
    pageId: page.id,
    pageUrl: page.url,
    title: getPlainPropertyValue(properties[config.properties.title]),
    workId: getWorkIdValue(properties[config.properties.workId]),
    status: {
      type: statusProperty?.type || "select",
      value: getOptionLikeValue(statusProperty),
    },
    formalChannel: {
      type: channelProperty?.type || "select",
      value: getOptionLikeValue(channelProperty),
    },
    formalLink: {
      type: linkProperty?.type || "url",
      value: getLinkValue(linkProperty),
    },
    notes: getPlainPropertyValue(properties[config.properties.notes]),
    branch: getPlainPropertyValue(branchProperty),
  };
}

async function fetchGitHubIssue(config, issueNumber) {
  return githubRequest(config, `/repos/${config.repository.owner}/${config.repository.repo}/issues/${issueNumber}`, {
    method: "GET",
  });
}

async function updateNotionItem(config, pageId, properties) {
  if (config.dryRun) {
    console.log(`[dry-run] Would update Notion page ${pageId} with properties: ${JSON.stringify(properties)}`);
    return;
  }

  await notionRequest(config, `/pages/${pageId}`, {
    method: "PATCH",
    body: { properties },
  });
}

async function notionRequest(config, path, options) {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    method: options.method,
    headers: {
      Authorization: `Bearer ${config.notionToken}`,
      "Notion-Version": config.notionVersion,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await safeJson(response);
    throw new Error(`Notion API ${response.status}: ${JSON.stringify(errorBody)}`);
  }

  return response.status === 204 ? null : response.json();
}

async function githubRequest(config, path, options) {
  const response = await fetch(`https://api.github.com${path}`, {
    method: options.method,
    headers: {
      Authorization: `Bearer ${config.githubToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "teleferico-backlog-governance",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await safeJson(response);
    throw new Error(`GitHub API ${response.status}: ${JSON.stringify(errorBody)}`);
  }

  return response.status === 204 ? null : response.json();
}

function extractWorkIdFromBranch(branchName) {
  const match = branchName.match(/(?:^|[-/])([a-z]{1,10}-\d{1,6})(?=-|$)/i);
  return match ? match[1].toUpperCase() : null;
}

function parseWorkId(workId) {
  const match = workId.match(/^([A-Z]{1,10})-(\d{1,6})$/i);

  if (!match) {
    return null;
  }

  return {
    prefix: match[1].toUpperCase(),
    number: Number.parseInt(match[2], 10),
    raw: workId.toUpperCase(),
  };
}

function workIdMatches(property, parsedWorkId) {
  if (!property) {
    return false;
  }

  if (property.type === "unique_id" && property.unique_id) {
    const prefix = (property.unique_id.prefix || "").toUpperCase();
    return prefix === parsedWorkId.prefix && property.unique_id.number === parsedWorkId.number;
  }

  const rawValue = getPlainPropertyValue(property)?.toUpperCase();
  return rawValue === parsedWorkId.raw;
}

function getWorkIdValue(property) {
  if (!property) {
    return "";
  }

  if (property.type === "unique_id" && property.unique_id) {
    const prefix = property.unique_id.prefix ? `${property.unique_id.prefix.toUpperCase()}-` : "";
    return `${prefix}${property.unique_id.number}`;
  }

  return getPlainPropertyValue(property);
}

function getPlainPropertyValue(property) {
  if (!property) {
    return "";
  }

  switch (property.type) {
    case "title":
      return joinPlainText(property.title);
    case "rich_text":
      return joinPlainText(property.rich_text);
    case "select":
      return property.select?.name || "";
    case "status":
      return property.status?.name || "";
    case "url":
      return property.url || "";
    case "unique_id":
      return getWorkIdValue(property);
    default:
      return "";
  }
}

function getOptionLikeValue(property) {
  if (!property) {
    return "";
  }

  if (property.type === "status") {
    return property.status?.name || "";
  }

  return property.select?.name || "";
}

function getLinkValue(property) {
  if (!property) {
    return "";
  }

  if (property.type === "url") {
    return property.url || "";
  }

  if (property.type === "rich_text") {
    return joinPlainText(property.rich_text);
  }

  return "";
}

function joinPlainText(items = []) {
  return items.map((item) => item.plain_text || item.text?.content || "").join("").trim();
}

function notionOptionValue(type, name) {
  if (type === "status") {
    return {
      status: { name },
    };
  }

  return {
    select: { name },
  };
}

function notionLinkValue(type, value) {
  if (type === "rich_text") {
    return {
      rich_text: [{ type: "text", text: { content: value } }],
    };
  }

  return {
    url: value,
  };
}

function extractIssueNumberFromUrl(url) {
  const match = url.match(/\/issues\/(\d+)(?:$|[?#])/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function parseBoolean(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return { message: response.statusText };
  }
}

function normalizeNumber(value) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function logHeader(title) {
  console.log(`\n=== ${title} ===`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
