#!/usr/bin/env node

const repositoryPolicy = require("./repository-policy.js");

const DEFAULTS = {
  notionVersion: "2025-09-03",
  workIdProperty: "Work ID",
  statusProperty: "Estado",
  formalChannelProperty: "Canal formal",
  formalLinkProperty: "Enlace formal",
  branchProperty: "Branch",
  doneStatus: "Hecho",
  githubIssueChannel: "GitHub Issue",
  noFormalIssuesToken: "Formal issues: none",
  noBacklogItemDeclaration: "Backlog item: none",
  maxExplicitReferences: 100,
  issueFetchConcurrency: 5,
  commentPageSize: 100,
};

async function main() {
  const command = process.argv[2];
  const config = getConfig();
  if (command === "validate-pr-policy") return validatePrPolicy(config);
  if (command === "sync-pr-mutations") return syncPrMutations(config);
  throw new Error("Missing or unsupported command. Use: validate-pr-policy | sync-pr-mutations");
}

function getConfig() {
  const [owner, repo] = (process.env.GITHUB_REPOSITORY || `${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}`).split("/");
  const slug = `${owner}/${repo}`;
  return {
    githubToken: requiredEnv("GITHUB_TOKEN"),
    notionToken: requiredEnv("NOTION_TOKEN"),
    notionDataSourceId: requiredEnv("NOTION_BACKLOG_DATA_SOURCE_ID"),
    notionVersion: process.env.NOTION_VERSION || DEFAULTS.notionVersion,
    eventName: process.env.GITHUB_EVENT_NAME || "",
    repository: { owner, repo, slug },
    properties: {
      workId: process.env.NOTION_WORK_ID_PROPERTY || DEFAULTS.workIdProperty,
      status: process.env.NOTION_STATUS_PROPERTY || DEFAULTS.statusProperty,
      formalChannel: process.env.NOTION_FORMAL_CHANNEL_PROPERTY || DEFAULTS.formalChannelProperty,
      formalLink: process.env.NOTION_FORMAL_LINK_PROPERTY || DEFAULTS.formalLinkProperty,
      branch: process.env.NOTION_BRANCH_PROPERTY || DEFAULTS.branchProperty,
    },
    statuses: { done: process.env.NOTION_DONE_STATUS || DEFAULTS.doneStatus },
    formalChannelName: process.env.NOTION_GITHUB_ISSUE_CHANNEL || DEFAULTS.githubIssueChannel,
    pullRequest: {
      number: normalizeNumber(process.env.PR_NUMBER) || 0,
      headRef: process.env.PR_BRANCH_NAME || "",
      baseRef: process.env.PR_BASE_REF || "",
      action: process.env.PR_ACTION || "opened",
      body: process.env.PR_BODY || "",
      merged: parseBoolean(process.env.PR_MERGED),
      headRepository: process.env.PR_HEAD_REPOSITORY || "",
    },
    validateCommitMessages: (process.env.GITHUB_EVENT_NAME || "") === "pull_request_target" && Boolean(normalizeNumber(process.env.PR_NUMBER)),
  };
}

async function validatePrPolicy(config) {
  const pr = repositoryPolicy.classifyPullRequest(config.pullRequest.headRef, config.pullRequest.baseRef);
  const branch = pr.type === "implementation" ? repositoryPolicy.validateImplementationBranchName(config.pullRequest.headRef) : null;
  const document = await renderPrBody(config, config.pullRequest.body);
  const closingRefs = extractClosingReferences(document);
  const advancingRefs = extractAdvancingReferences(document);
  await validatePullRequestCommitMessages(config);
  if (pr.type === "implementation") {
    validateImplementationBody(document, closingRefs);
    return ensureImplementationTracking(config, branch, extractRefsNumbers(document), document);
  }
  if (pr.type === "promotion-to-staging" && closingRefs.length) {
    throw new Error("Promotion PRs from development to staging must NOT close issues.");
  }
  if (pr.type === "promotion-to-main") {
    const hasNoFormalIssues = containsNoFormalIssuesToken(document);
    if (!closingRefs.length && !advancingRefs.length && !hasNoFormalIssues) throw new Error(`Promotion PRs from staging to main must declare closing references, advancing references, or '${DEFAULTS.noFormalIssuesToken}'.`);
    if (closingRefs.length && hasNoFormalIssues) throw new Error("Promotion PRs to main cannot mix closing references with Formal issues: none.");
    if (advancingRefs.length && hasNoFormalIssues) throw new Error("Promotion PRs to main cannot mix advancing references with Formal issues: none.");
    const closingNumbers = new Set(closingRefs.map((entry) => entry.issueNumber));
    const overlap = advancingRefs.find((entry) => closingNumbers.has(entry.issueNumber));
    if (overlap) throw new Error(`Promotion PRs to main cannot both advance and close issue #${overlap.issueNumber}.`);
  }
  if (pr.type === "unsupported-implementation-target") {
    throw new Error(`Implementation-like branches must target development. Received '${config.pullRequest.headRef}' -> '${config.pullRequest.baseRef}'.`);
  }
}

async function ensureImplementationTracking(config, branch, refsNumbers, document) {
  if (branch.mode === "explicitly-untracked") {
    validateExplicitlyUntrackedBody(document);
    return validateIssueNumbers(config, refsNumbers);
  }
  const page = await findNotionPageByWorkId(config, branch.workId);
  if (!page) throw new Error(`No Notion backlog item found for Work ID '${branch.workId}'.`);
  const item = mapNotionItem(config, page);
  return validateTrackedItem(config, item, refsNumbers);
}

async function validateTrackedItem(config, item, refsNumbers) {
  if (!item.formalChannel.value) throw new Error(`Notion item ${item.workId} must define a non-empty '${config.properties.formalChannel}'.`);
  if (item.formalChannel.value !== config.formalChannelName) return validateIssueNumbers(config, refsNumbers);
  const issueNumber = parseFormalIssueUrl(item.formalLink.value, config.repository);
  if (!issueNumber) throw new Error(`Notion item ${item.workId} has invalid formal link '${item.formalLink.value || "<empty>"}'. Expected https://github.com/${config.repository.slug}/issues/<number>.`);
  if (!refsNumbers.includes(issueNumber)) throw new Error(`Notion item ${item.workId} requires 'Refs #${issueNumber}' in visible '## Related Issues'.`);
  await validateIssueNumbers(config, refsNumbers);
}

async function syncPrMutations(config) {
  if (!isTrustedMutation(config)) { console.warn("Skipping privileged synchronization for an untrusted PR head."); return; }
  const pr = repositoryPolicy.classifyPullRequest(config.pullRequest.headRef, config.pullRequest.baseRef);
  if (config.pullRequest.action === "closed" && pr.type === "promotion-to-main") {
    await syncMergedMainPromotion(config);
    return;
  }
  await syncIssuePrReference(config);
}

function isTrustedMutation(config) {
  return config.eventName === "pull_request_target"
    && Boolean(config.pullRequest.headRepository)
    && config.pullRequest.headRepository === config.repository.slug;
}

async function syncMergedMainPromotion(config) {
  if (!config.pullRequest.merged) return;
  const document = await renderPrBody(config, config.pullRequest.body);
  if (containsNoFormalIssuesToken(document)) return;
  const closingNumbers = unique(extractClosingReferences(document).map((entry) => entry.issueNumber));
  const advancingNumbers = unique(extractAdvancingReferences(document).map((entry) => entry.issueNumber));
  const referenceNumbers = extractRefsNumbers(document);
  const issueNumbers = unique([...closingNumbers, ...advancingNumbers, ...referenceNumbers]);
  const resolved = await preflightIssues(config, issueNumbers, { strict: true });
  const pagesByIssue = new Map();
  for (const issue of resolved) pagesByIssue.set(issue.number, await findNotionPageByIssueUrl(config, issue.html_url));
  const advancedIssues = resolved.filter((issue) => advancingNumbers.includes(issue.number));
  const shippedIssues = resolved.filter((issue) => !advancingNumbers.includes(issue.number));
  const comments = [
    ...await prepareIssueComments(config, shippedIssues, "Shipped by"),
    ...await prepareIssueComments(config, advancedIssues, "Advanced by"),
  ];

  for (const issue of resolved.filter((entry) => closingNumbers.includes(entry.number) && !advancingNumbers.includes(entry.number))) {
    await syncIssueNumberToDone(config, issue, pagesByIssue.get(issue.number));
  }
  await createPreparedIssueComments(config, comments);
}

async function syncIssuePrReference(config) {
  if (!isTrustedMutation(config) || !config.pullRequest.number) return;
  const pr = repositoryPolicy.classifyPullRequest(config.pullRequest.headRef, config.pullRequest.baseRef);
  const role = relationRole(pr, config.pullRequest);
  if (!role) return;
  const document = await renderPrBody(config, config.pullRequest.body);
  const refs = extractRefsNumbers(document);
  const closing = extractClosingReferences(document).map((entry) => entry.issueNumber);
  const advancing = extractAdvancingReferences(document).map((entry) => entry.issueNumber);
  const issueNumbers = unique([...refs, ...closing, ...advancing]);
  if (!issueNumbers.length) return;
  const resolved = await preflightIssues(config, issueNumbers, { strict: pr.type === "implementation" });
  if (!resolved) { console.warn("Skipping promotion comment synchronization because an optional issue reference could not be resolved."); return; }
  await createPreparedIssueComments(config, await prepareIssueComments(config, resolved, role));
}

function relationRole(pr, pullRequest) {
  if (pr.type === "implementation") return "Related PR";
  if (pr.type === "promotion-to-staging") return "Promotion PR";
  if (pr.type === "promotion-to-main") {
    return pullRequest.action === "closed" && pullRequest.merged ? "Shipped by" : "Promotion PR";
  }
  return null;
}

async function preflightIssues(config, issueNumbers, { strict }) {
  if (issueNumbers.length > DEFAULTS.maxExplicitReferences) throw new Error(`PR body exceeds the maximum of ${DEFAULTS.maxExplicitReferences} explicit issue references.`);
  try {
    return await mapWithConcurrency(issueNumbers, DEFAULTS.issueFetchConcurrency, (number) => fetchGitHubIssue(config, number));
  } catch (error) {
    if (strict || !isMissingIssueError(error)) throw error;
    return null;
  }
}

function isMissingIssueError(error) { return error instanceof Error && error.message.includes("status 404"); }

async function mapWithConcurrency(values, concurrency, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await mapper(values[index]);
    }
  }));
  return results;
}

async function prepareIssueComments(config, issues, role) {
  return mapWithConcurrency(issues, DEFAULTS.issueFetchConcurrency, async (issue) => ({
    issue,
    role,
    exists: await hasManagedIssueComment(config, issue.number, config.pullRequest.number, role),
  }));
}

async function createPreparedIssueComments(config, comments) {
  for (const comment of comments) {
    if (!comment.exists) await createManagedIssueComment(config, comment.issue.number, config.pullRequest.number, comment.role);
  }
}

async function hasManagedIssueComment(config, issueNumber, prNumber, role) {
  const marker = managedIssueCommentMarker(issueNumber, prNumber, role);
  const comments = await listIssueComments(config, issueNumber);
  return comments.some((comment) => typeof comment.body === "string" && comment.body.includes(marker));
}

async function listIssueComments(config, issueNumber) {
  const comments = [];
  for (let page = 1; ; page += 1) {
    const path = `/repos/${config.repository.owner}/${config.repository.repo}/issues/${issueNumber}/comments?per_page=${DEFAULTS.commentPageSize}&page=${page}`;
    const currentPage = await githubRequest(config, path, { method: "GET" });
    if (!Array.isArray(currentPage)) throw new Error(`GitHub comments response for issue #${issueNumber} must be an array.`);
    comments.push(...currentPage);
    if (currentPage.length < DEFAULTS.commentPageSize) return comments;
  }
}

async function createManagedIssueComment(config, issueNumber, prNumber, role) {
  const path = `/repos/${config.repository.owner}/${config.repository.repo}/issues/${issueNumber}/comments`;
  await githubRequest(config, path, { method: "POST", body: { body: managedIssueCommentBody(issueNumber, prNumber, role) } });
}

function managedIssueCommentMarker(issueNumber, prNumber, role) {
  return `<!-- backlog-governance:issue=${issueNumber}:pr=${prNumber}:role=${role} -->`;
}

function managedIssueCommentBody(issueNumber, prNumber, role) {
  return `${role}: #${prNumber}\n\n${managedIssueCommentMarker(issueNumber, prNumber, role)}`;
}

async function validateIssueNumbers(config, issueNumbers) { await preflightIssues(config, issueNumbers, { strict: true }); }

async function syncIssueNumberToDone(config, issue, page = undefined) {
  const matchedPage = page === undefined ? await findNotionPageByIssueUrl(config, issue.html_url) : page;
  if (!matchedPage) return;
  const item = mapNotionItem(config, matchedPage);
  await updateNotionItem(config, item.pageId, { [config.properties.status]: notionOptionValue(item.status.type, config.statuses.done) });
}

async function renderPrBody(config, body) {
  const html = typeof config.renderMarkdown === "function"
    ? await config.renderMarkdown(body)
    : await githubRequest(config, "/markdown", {
      method: "POST",
      body: { text: body, mode: "gfm", context: config.repository.slug },
      responseType: "text",
    });
  if (typeof html !== "string") throw new Error("GitHub Markdown renderer returned a non-text response.");
  return parseGitHubRenderedDocument(html);
}

function parseGitHubRenderedDocument(html) {
  const document = { headings: [], sections: [], visibleText: "" };
  const stack = [];
  let ignoredDepth = 0;
  let activeHeading = null;
  let activeSection = null;
  let cursor = 0;

  const appendText = (value) => {
    if (ignoredDepth || !value) return;
    const text = decodeHtmlEntities(value);
    document.visibleText += text;
    if (activeHeading) activeHeading.text += text;
    if (activeSection && !activeHeading) activeSection.content += text;
  };
  const appendBoundary = () => {
    if (ignoredDepth || document.visibleText.endsWith("\n")) return;
    document.visibleText += "\n";
    if (activeSection && !activeHeading && !activeSection.content.endsWith("\n")) activeSection.content += "\n";
  };
  const startHeading = (name) => { if (!ignoredDepth) activeHeading = { level: Number(name[1]), text: "" }; };
  const finishHeading = () => {
    if (!activeHeading) return;
    const heading = { level: activeHeading.level, text: normalizeVisibleText(activeHeading.text) };
    document.headings.push(heading);
    if (heading.level <= 2) {
      if (activeSection) document.sections.push(activeSection);
      activeSection = heading.level === 2 ? { heading: heading.text, content: "" } : null;
    } else if (activeSection) {
      activeSection.content += `${heading.text}\n`;
    }
    activeHeading = null;
    appendBoundary();
  };

  while (cursor < html.length) {
    const tagStart = html.indexOf("<", cursor);
    if (tagStart === -1) { appendText(html.slice(cursor)); break; }
    appendText(html.slice(cursor, tagStart));
    const token = readHtmlToken(html, tagStart);
    if (!token) { appendText("<"); cursor = tagStart + 1; continue; }
    cursor = token.end;
    if (token.kind !== "tag") continue;

    const { name, closing, selfClosing, raw } = token;
    if (closing) {
      const matchingIndex = stack.map((entry) => entry.name).lastIndexOf(name);
      if (matchingIndex === -1) continue;
      for (let index = stack.length - 1; index >= matchingIndex; index -= 1) {
        const entry = stack.pop();
        if (entry.name === name && /^h[1-6]$/.test(name)) finishHeading();
        if (entry.ignored) ignoredDepth -= 1;
        if (isBlockElement(entry.name)) appendBoundary();
      }
      continue;
    }

    if (name === "br") { appendBoundary(); continue; }
    const ignored = ignoredDepth > 0 || isIgnoredElement(name) || isHiddenContainer(raw);
    if (isBlockElement(name)) appendBoundary();
    if (!ignored && /^h[1-6]$/.test(name)) startHeading(name);
    const isContainer = !selfClosing && !isVoidElement(name);
    if (isContainer) stack.push({ name, ignored });
    if (ignored && isContainer) ignoredDepth += 1;
  }
  if (activeSection) document.sections.push(activeSection);
  return document;
}

function readHtmlToken(html, start) {
  if (html.startsWith("<!--", start)) {
    const end = html.indexOf("-->", start + 4);
    return { kind: "comment", end: end === -1 ? html.length : end + 3 };
  }
  let quote = null;
  for (let index = start + 1; index < html.length; index += 1) {
    const character = html[index];
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") { quote = character; continue; }
    if (character !== ">") continue;
    const raw = html.slice(start, index + 1);
    const match = raw.match(/^<\s*(\/)?\s*([A-Za-z][A-Za-z0-9-]*)\b/);
    if (!match) return { kind: "other", end: index + 1 };
    return { kind: "tag", end: index + 1, raw, closing: Boolean(match[1]), name: match[2].toLowerCase(), selfClosing: /\/\s*>$/.test(raw) };
  }
  return null;
}

function isIgnoredElement(name) { return new Set(["pre", "code", "blockquote", "details", "script", "style", "template"]).has(name); }
function isVoidElement(name) { return new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]).has(name); }
function isBlockElement(name) { return new Set(["address", "article", "aside", "div", "dl", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "li", "main", "nav", "ol", "p", "section", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "ul"]).has(name); }
function isHiddenContainer(raw) {
  return /\shidden(?:\s|=|\/?>)/i.test(raw)
    || /\saria-hidden\s*=\s*(?:(["'])true\1|true)(?:\s|\/?>)/i.test(raw)
    || /\sstyle\s*=\s*(["'])[^"']*display\s*:\s*none[^"']*\1/i.test(raw);
}

function decodeHtmlEntities(value) {
  return value.replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z][a-z\d]+));/gi, (_match, decimal, hexadecimal, named) => {
    if (decimal) return String.fromCodePoint(Number(decimal));
    if (hexadecimal) return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
    return ({ amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' })[named.toLowerCase()] || _match;
  });
}

function normalizeVisibleText(value) { return value.replace(/\s+/g, " ").trim(); }

function extractRefsNumbers(document) {
  const relatedIssues = getFinalRelatedIssuesSection(document);
  if (!relatedIssues) return [];
  return unique([...relatedIssues.content.matchAll(/\b(?:refs?|references?)\s+#(\d+)\b/gi)].map((match) => Number(match[1])));
}

function extractClosingReferences(document) {
  return [...document.visibleText.matchAll(/\b(close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)\b/gi)]
    .map((match) => ({ keyword: match[1], issueNumber: Number(match[2]) }));
}

function extractAdvancingReferences(document) {
  return [...document.visibleText.matchAll(/\b(advances)\s+#(\d+)\b/gi)]
    .map((match) => ({ keyword: match[1], issueNumber: Number(match[2]) }));
}

function containsNoFormalIssuesToken(document) {
  return document.visibleText.split(/\r?\n/).some((line) => line.trim() === DEFAULTS.noFormalIssuesToken);
}

function validateImplementationBody(document, closingRefs = extractClosingReferences(document)) {
  if (closingRefs.length) throw new Error("Implementation PRs to development must reference issues without closing them.");
  return extractRefsNumbers(document);
}

function validateExplicitlyUntrackedBody(document) {
  const section = getH2Section(document, "Tracking");
  if (!section) throw new Error("Explicitly untracked implementation PRs require a visible ## Tracking section.");
  const lines = section.content.split(/\r?\n/).map((line) => line.trim());
  if (!lines.includes(DEFAULTS.noBacklogItemDeclaration) || !lines.some((line) => /^Reason:\s+\S.*$/.test(line))) {
    throw new Error("Explicitly untracked implementation PRs require 'Backlog item: none' and a non-empty 'Reason: ...' line.");
  }
}

function getH2Section(document, heading) { return document.sections.find((section) => section.heading === heading) || null; }
function getFinalRelatedIssuesSection(document) {
  const structuralHeadings = document.headings.filter((heading) => heading.level <= 2);
  const finalHeading = structuralHeadings.at(-1);
  if (!finalHeading || finalHeading.level !== 2 || finalHeading.text !== "Related Issues") return null;
  return document.sections.filter((section) => section.heading === "Related Issues").at(-1) || null;
}

async function findNotionPageByWorkId(config, workId) {
  const pages = await queryNotionPages(config, { property: config.properties.workId, unique_id: { equals: Number(workId.split("-")[1]) } });
  const matchingPages = pages.filter((page) => workIdMatches(page.properties?.[config.properties.workId], workId));
  return selectSingleNotionPage(matchingPages, `Work ID '${workId}'`);
}

async function findNotionPageByIssueUrl(config, url) {
  const pages = await queryNotionPages(config, { property: config.properties.formalLink, url: { equals: url } });
  return selectSingleNotionPage(pages, `formal link '${url}'`);
}

function selectSingleNotionPage(pages, description) {
  const uniquePages = [...new Map(pages.map((page) => [page.id, page])).values()];
  if (uniquePages.length > 1) throw new Error(`Multiple Notion backlog items match ${description}.`);
  return uniquePages[0] || null;
}

async function queryNotionPages(config, filter) {
  const pages = [];
  let startCursor;
  do {
    const body = { page_size: 100, result_type: "page", filter, ...(startCursor ? { start_cursor: startCursor } : {}) };
    const response = await notionRequest(config, `/data_sources/${config.notionDataSourceId}/query`, { method: "POST", body });
    pages.push(...response.results.filter((entry) => entry.object === "page"));
    startCursor = response.has_more ? response.next_cursor : null;
  } while (startCursor);
  return pages;
}

function mapNotionItem(config, page) {
  const properties = page.properties || {};
  return {
    pageId: page.id,
    workId: getWorkIdValue(properties[config.properties.workId]),
    status: { type: properties[config.properties.status]?.type || "select" },
    formalChannel: { value: getOptionLikeValue(properties[config.properties.formalChannel]) },
    formalLink: { value: getLinkValue(properties[config.properties.formalLink]) },
    branch: getPlainPropertyValue(properties[config.properties.branch]),
  };
}

function getWorkIdValue(property) {
  if (property?.type === "unique_id") return `${property.unique_id.prefix || ""}-${property.unique_id.number}`.replace(/^-/, "");
  return getPlainPropertyValue(property);
}
function workIdMatches(property, workId) { return getWorkIdValue(property).toUpperCase() === workId.toUpperCase(); }
function getPlainPropertyValue(property) {
  if (!property) return "";
  if (property.type === "rich_text" || property.type === "title") return (property[property.type] || []).map((entry) => entry.plain_text || "").join("").trim();
  if (property.type === "url") return property.url || "";
  return property.select?.name || property.status?.name || "";
}
function getOptionLikeValue(property) { return property?.select?.name || property?.status?.name || ""; }
function getLinkValue(property) { return getPlainPropertyValue(property); }

function parseFormalIssueUrl(value, repository) {
  try {
    const url = new URL(value);
    const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/issues\/(\d+)\/?$/);
    if (url.hostname !== "github.com" || !match) return null;
    return `${match[1]}/${match[2]}`.toLowerCase() === repository.slug.toLowerCase() ? Number(match[3]) : null;
  } catch { return null; }
}

async function fetchGitHubIssue(config, number) {
  const issue = await githubRequest(config, `/repos/${config.repository.owner}/${config.repository.repo}/issues/${number}`, { method: "GET" });
  if (issue.pull_request) throw new Error(`#${number} is a pull request, not a GitHub issue.`);
  return issue;
}

async function updateNotionItem(config, pageId, properties) { await notionRequest(config, `/pages/${pageId}`, { method: "PATCH", body: { properties } }); }

async function notionRequest(config, path, options) {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    method: options.method,
    headers: { Authorization: `Bearer ${config.notionToken}`, "Notion-Version": config.notionVersion, "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) throw await requestError("Notion", options.method, path, response);
  return response.status === 204 ? null : response.json();
}

async function githubRequest(config, path, options) {
  const response = await fetch(`https://api.github.com${path}`, {
    method: options.method,
    headers: { Authorization: `Bearer ${config.githubToken}`, Accept: "application/vnd.github+json", ...(options.body ? { "Content-Type": "application/json" } : {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) throw await requestError("GitHub", options.method, path, response);
  return options.responseType === "text" ? response.text() : response.status === 204 ? null : response.json();
}

async function validatePullRequestCommitMessages(config) {
  if (!config.validateCommitMessages || !config.pullRequest.number) return;
  const commits = await listPullRequestCommits(config, config.pullRequest.number);
  for (const commit of commits) {
    const sha = typeof commit?.sha === "string" ? commit.sha.slice(0, 12) : "<unknown>";
    const message = commit?.commit?.message;
    try {
      repositoryPolicy.validateCommitMessage(message);
    } catch (error) {
      throw new Error(`Pull request commit ${sha} violates repository commit policy: ${error.message}`);
    }
  }
}

async function listPullRequestCommits(config, pullRequestNumber) {
  const commits = [];
  for (let page = 1; ; page += 1) {
    const currentPage = await githubRequest(config, `/repos/${config.repository.owner}/${config.repository.repo}/pulls/${pullRequestNumber}/commits?per_page=100&page=${page}`, { method: "GET" });
    if (!Array.isArray(currentPage)) throw new Error(`GitHub commits response for pull request #${pullRequestNumber} must be an array.`);
    commits.push(...currentPage);
    if (currentPage.length < 100) return commits;
  }
}

async function requestError(service, method, path, response) {
  let details = "";
  try { const body = await response.json(); details = body?.message ? `: ${String(body.message).slice(0, 200)}` : ""; } catch { /* Error response JSON is optional. */ }
  return new Error(`${service} ${method} ${path} failed with status ${response.status}${details}`);
}

function notionOptionValue(type, name) { return type === "status" ? { status: { name } } : { select: { name } }; }
function unique(values) { return [...new Set(values)]; }
function parseBoolean(value) { return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase()); }
function normalizeNumber(value) { const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : null; }
function requiredEnv(name) { if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`); return process.env[name]; }

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULTS,
  extractRefsNumbers,
  extractClosingReferences,
  extractAdvancingReferences,
  parseGitHubRenderedDocument,
  renderPrBody,
  validateExplicitlyUntrackedBody,
  validateImplementationBody,
  parseFormalIssueUrl,
  findNotionPageByIssueUrl,
  listPullRequestCommits,
  validatePrPolicy,
  validatePullRequestCommitMessages,
  syncPrMutations,
  syncIssuePrReference,
  isTrustedMutation,
  selectSingleNotionPage,
  listIssueComments,
  managedIssueCommentMarker,
  managedIssueCommentBody,
};
