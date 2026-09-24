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
  stackedPreviewStrategy: "stacked-to-main",
  maxExplicitReferences: 100,
  maxIncludedPullRequests: 100,
  maxPullRequestFiles: 3000,
  issueFetchConcurrency: 5,
  commentPageSize: 100,
  commitFilePageSize: 100,
  maxCommitFiles: 3000,
  maxPullRequestCommits: 250,
  maxPullRequestCommitFilePages: 300,
};

const PROMOTION_BODY_CONTRACT = {
  shared: {
    includedPullRequests: { heading: "Included Implementation PRs", label: "PR" },
    releaseTarget: { heading: "Release Target", label: "Environment" },
    rollback: { heading: "Rollback", label: "Strategy" },
  },
  "promotion-to-staging": { environment: "staging", validation: { heading: "Validation", label: "Plan" } },
  "promotion-to-main": {
    environment: "production",
    validation: {
      heading: "Validation",
      label: "Prior staging validation evidence",
      releaseCandidateShaLabel: "Release candidate SHA",
    },
    advancementFinalization: {
      heading: "Advancement Finalization",
      issueLabel: "Issue",
      remainingLabel: "Remaining work or condition",
      ownerLabel: "Finalization owner",
      eventLabel: "Finalization event or action",
    },
  },
};

const CHAIN_CONTEXT_CONTRACT = Object.freeze({
  heading: "Chain Context",
  fields: Object.freeze({
    strategy: "Strategy",
    parentPullRequest: "Parent PR",
    parentBranch: "Parent branch",
    parentHeadSha: "Parent head SHA",
  }),
});

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
      headSha: process.env.PR_HEAD_SHA || "",
      baseSha: process.env.PR_BASE_SHA || "",
      draft: parseBoolean(process.env.PR_DRAFT),
      merged: parseBoolean(process.env.PR_MERGED),
      headRepository: process.env.PR_HEAD_REPOSITORY || "",
      baseRepository: process.env.PR_BASE_REPOSITORY || "",
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
  if (pr.type === "implementation") {
    await validatePullRequestCommitMessages(config);
    validateImplementationBody(document, closingRefs);
    return ensureImplementationTracking(config, branch, extractRefsNumbers(document), document);
  }
  if (pr.type === "stacked-child-preview") {
    const chainContext = parseChainContext(document);
    validateStackedPreviewRuntime(config, chainContext);
    validateImplementationBody(document, closingRefs);
    await validateStackedPreviewParent(config, chainContext);
    await validateFocusedPullRequestDiff(config);
    await validatePullRequestCommitMessages(config);
    return;
  }
  if (pr.type === "promotion-to-staging" || pr.type === "promotion-to-main") {
    await validatePullRequestCommitMessages(config);
    const promotion = evaluatePromotionBody(document, pr.type);
    if (pr.type === "promotion-to-staging" && closingRefs.length) {
      throw new Error("Promotion PRs from development to staging must NOT close issues.");
    }
    if (pr.type === "promotion-to-main") {
      validatePromotionCandidateSha(config, promotion.releaseCandidateSha);
      const hasNoFormalIssues = containsNoFormalIssuesToken(document);
      if (!closingRefs.length && !advancingRefs.length && !hasNoFormalIssues) throw new Error(`Promotion PRs from staging to main must declare closing references, advancing references, or '${DEFAULTS.noFormalIssuesToken}'.`);
      if (closingRefs.length && hasNoFormalIssues) throw new Error("Promotion PRs to main cannot mix closing references with Formal issues: none.");
      if (advancingRefs.length && hasNoFormalIssues) throw new Error("Promotion PRs to main cannot mix advancing references with Formal issues: none.");
      const closingNumbers = new Set(closingRefs.map((entry) => entry.issueNumber));
      const overlap = advancingRefs.find((entry) => closingNumbers.has(entry.issueNumber));
      if (overlap) throw new Error(`Promotion PRs to main cannot both advance and close issue #${overlap.issueNumber}.`);
      if (advancingRefs.length) validateAdvancingFinalization(document, advancingRefs);
    }
    await validateIncludedPullRequests(config, promotion.includedPullRequestNumbers);
    return;
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
  if (pr.type === "stacked-child-preview") {
    console.warn("Skipping privileged synchronization for a stacked child preview.");
    return;
  }
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

function parseChainContext(document) {
  const sections = document.sections.filter((section) => section.heading === CHAIN_CONTEXT_CONTRACT.heading);
  if (!sections.length) throw new Error("Stacked child previews require one visible '## Chain Context' section.");
  if (sections.length > 1) throw new Error("Stacked child previews must not duplicate the visible '## Chain Context' section.");
  const values = {};
  for (const [key, label] of Object.entries(CHAIN_CONTEXT_CONTRACT.fields)) {
    const lines = sections[0].content.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith(`${label}:`));
    if (!lines.length) throw new Error(`Stacked child previews require '${label}: ...' in visible '## Chain Context'.`);
    if (lines.length > 1) throw new Error(`Stacked child previews must not duplicate '${label}:' in visible '## Chain Context'.`);
    const value = lines[0].slice(label.length + 1).trim();
    if (!value) throw new Error(`Stacked child previews require a non-empty '${label}: ...' in visible '## Chain Context'.`);
    values[key] = value;
  }
  if (values.strategy !== DEFAULTS.stackedPreviewStrategy) {
    throw new Error(`Stacked child previews require 'Strategy: ${DEFAULTS.stackedPreviewStrategy}' in visible '## Chain Context'.`);
  }
  const parentMatch = values.parentPullRequest.match(/^#([1-9]\d*)$/);
  if (!parentMatch) throw new Error("Stacked child previews require 'Parent PR: #<number>' in visible '## Chain Context'.");
  const parentPullRequestNumber = Number(parentMatch[1]);
  if (!Number.isSafeInteger(parentPullRequestNumber)) {
    throw new Error("Stacked child previews require a safe positive integer in visible 'Parent PR: #<number>'.");
  }
  if (!isFullSha(values.parentHeadSha)) throw new Error("Stacked child previews require a full 40-character 'Parent head SHA: <sha>' in visible '## Chain Context'.");
  repositoryPolicy.validateImplementationBranchName(values.parentBranch);
  return { ...values, parentPullRequestNumber };
}

function validateStackedPreviewRuntime(config, chainContext) {
  const pullRequest = config.pullRequest;
  if (!pullRequest.draft) throw new Error("Stacked child previews must remain draft pull requests.");
  if (!Number.isSafeInteger(pullRequest.number) || pullRequest.number <= 0) {
    throw new Error("Stacked child previews require a safe positive pull request number from runtime metadata.");
  }
  if (pullRequest.number === chainContext.parentPullRequestNumber) throw new Error("A stacked child preview cannot name itself as its parent PR.");
  if (!isFullSha(pullRequest.headSha) || !isFullSha(pullRequest.baseSha)) {
    throw new Error("Stacked child previews require full head and base SHAs from runtime metadata.");
  }
  if (pullRequest.headRepository !== config.repository.slug || pullRequest.baseRepository !== config.repository.slug) {
    throw new Error(`Stacked child previews require same-repository head and base metadata for '${config.repository.slug}'.`);
  }
  if (pullRequest.baseRef !== chainContext.parentBranch) {
    throw new Error(`Stacked child preview base '${pullRequest.baseRef}' must match declared parent branch '${chainContext.parentBranch}'.`);
  }
  if (pullRequest.baseSha.toLowerCase() !== chainContext.parentHeadSha.toLowerCase()) {
    throw new Error(`Stacked child preview base SHA '${pullRequest.baseSha}' must match declared parent head SHA '${chainContext.parentHeadSha}'.`);
  }
}

async function validateStackedPreviewParent(config, chainContext) {
  const visitedPullRequestNumbers = new Set([config.pullRequest.number]);
  let expectedParent = chainContext;

  while (true) {
    const parentNumber = expectedParent.parentPullRequestNumber;
    if (visitedPullRequestNumbers.has(parentNumber)) {
      throw new Error(`Stacked child preview ancestry contains a cycle at PR #${parentNumber}.`);
    }
    visitedPullRequestNumbers.add(parentNumber);

    const parent = await fetchGitHubPullRequest(config, parentNumber);
    const parentHeadRepository = parent.head?.repo?.full_name || "";
    const parentBaseRepository = parent.base?.repo?.full_name || "";
    if (parent.state !== "open") throw new Error(`Stacked child preview parent PR #${parent.number} must be open.`);
    if (parentHeadRepository !== config.repository.slug || parentBaseRepository !== config.repository.slug) {
      throw new Error(`Stacked child preview parent PR #${parent.number} must use same-repository head and base.`);
    }
    if (parent.head?.ref !== expectedParent.parentBranch || parent.head?.sha?.toLowerCase() !== expectedParent.parentHeadSha.toLowerCase()) {
      throw new Error(`Stacked child preview parent PR #${parent.number} does not match the declared parent branch and head SHA.`);
    }

    const parentType = repositoryPolicy.classifyPullRequest(parent.head.ref, parent.base?.ref).type;
    if (parentType === "implementation") {
      repositoryPolicy.validateImplementationBranchName(parent.head.ref);
      return;
    }
    if (parentType !== "stacked-child-preview") {
      throw new Error(`Stacked child preview parent PR #${parent.number} must be an implementation PR targeting development or a draft stacked-child preview.`);
    }
    if (parent.draft !== true) {
      throw new Error(`Stacked child preview parent PR #${parent.number} must remain a draft stacked-child preview.`);
    }

    repositoryPolicy.validateImplementationBranchName(parent.head.ref);
    const parentDocument = await renderPrBody(config, typeof parent.body === "string" ? parent.body : "");
    const nextParent = parseChainContext(parentDocument);
    if (nextParent.parentPullRequestNumber === parent.number) {
      throw new Error(`Stacked child preview parent PR #${parent.number} cannot name itself as its parent.`);
    }
    if (parent.base?.ref !== nextParent.parentBranch) {
      throw new Error(`Stacked child preview parent PR #${parent.number} base branch must match its declared parent branch.`);
    }
    if (!isFullSha(parent.base?.sha) || parent.base.sha.toLowerCase() !== nextParent.parentHeadSha.toLowerCase()) {
      throw new Error(`Stacked child preview parent PR #${parent.number} base SHA must match its declared parent head SHA.`);
    }

    expectedParent = nextParent;
  }
}

async function validateFocusedPullRequestDiff(config) {
  const files = await listPullRequestFiles(config, config.pullRequest.number);
  if (!files.length) throw new Error("Stacked child previews require a non-empty diff against the immediate parent branch.");
  return files;
}

async function listPullRequestFiles(config, pullRequestNumber) {
  const files = [];
  for (let page = 1; ; page += 1) {
    const currentPage = await githubRequest(config, `/repos/${config.repository.owner}/${config.repository.repo}/pulls/${pullRequestNumber}/files?per_page=100&page=${page}`, { method: "GET" });
    if (!Array.isArray(currentPage)) throw new Error(`GitHub files response for pull request #${pullRequestNumber} must be an array.`);
    for (const file of currentPage) {
      if (!file || typeof file.filename !== "string" || !file.filename) throw new Error(`GitHub files response for pull request #${pullRequestNumber} contains malformed file metadata.`);
    }
    files.push(...currentPage);
    if (files.length >= DEFAULTS.maxPullRequestFiles) {
      throw new Error(`GitHub files response for pull request #${pullRequestNumber} reaches the ${DEFAULTS.maxPullRequestFiles}-file API cap and cannot prove a focused, non-truncated parent diff.`);
    }
    if (currentPage.length < 100) return files;
  }
}

function evaluatePromotionBody(document, promotionType) {
  const route = PROMOTION_BODY_CONTRACT[promotionType];
  if (!route) throw new Error(`Unsupported promotion route '${promotionType}'.`);
  const includedPullRequests = getRequiredPromotionSection(document, route, PROMOTION_BODY_CONTRACT.shared.includedPullRequests.heading);
  const releaseTarget = getRequiredPromotionSection(document, route, PROMOTION_BODY_CONTRACT.shared.releaseTarget.heading);
  const validation = getRequiredPromotionSection(document, route, route.validation.heading);
  const rollback = getRequiredPromotionSection(document, route, PROMOTION_BODY_CONTRACT.shared.rollback.heading);
  const promotion = {
    includedPullRequestNumbers: parseIncludedPullRequestNumbers(includedPullRequests, route),
    environment: getRequiredPromotionField(releaseTarget, route, PROMOTION_BODY_CONTRACT.shared.releaseTarget.label, route.environment),
    validation: getRequiredPromotionField(validation, route, route.validation.label),
    rollback: getRequiredPromotionField(rollback, route, PROMOTION_BODY_CONTRACT.shared.rollback.label),
  };
  if (route.validation.releaseCandidateShaLabel) {
    promotion.releaseCandidateSha = getRequiredPromotionShaField(validation, route, route.validation.releaseCandidateShaLabel);
  }
  return promotion;
}

function getRequiredPromotionSection(document, route, heading) {
  const sections = document.sections.filter((section) => section.heading === heading);
  const routeName = promotionRouteName(route);
  if (!sections.length) throw new Error(`Promotion PRs from ${routeName} require a visible '## ${heading}' section.`);
  if (sections.length > 1) throw new Error(`Promotion PRs from ${routeName} must not duplicate the visible '## ${heading}' section.`);
  return sections[0];
}

function getRequiredPromotionField(section, route, label, expectedValue = undefined) {
  const matchingLines = section.content.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith(`${label}:`));
  const routeName = promotionRouteName(route);
  if (!matchingLines.length) throw new Error(`Promotion PRs from ${routeName} require a '${label}: ...' field in visible '## ${section.heading}'.`);
  if (matchingLines.length > 1) throw new Error(`Promotion PRs from ${routeName} must not duplicate the '${label}:' field in visible '## ${section.heading}'.`);
  const value = matchingLines[0].slice(label.length + 1).trim();
  if (!value) throw new Error(`Promotion PRs from ${routeName} require a non-empty '${label}: ...' field in visible '## ${section.heading}'.`);
  if (expectedValue && value !== expectedValue) throw new Error(`Promotion PRs from ${routeName} require '${label}: ${expectedValue}' in visible '## ${section.heading}'.`);
  return value;
}

function getRequiredPromotionShaField(section, route, label) {
  const value = getRequiredPromotionField(section, route, label);
  if (!isFullSha(value)) throw new Error(`Promotion PRs from ${promotionRouteName(route)} require a full 40-character hexadecimal '${label}: <sha>' field in visible '## ${section.heading}'.`);
  return value;
}

function validatePromotionCandidateSha(config, candidateSha) {
  const headSha = config.pullRequest.headSha;
  if (!isFullSha(headSha)) throw new Error("Promotion PRs from staging to main require a full 40-character PR head SHA from runtime metadata.");
  if (candidateSha.toLowerCase() !== headSha.toLowerCase()) {
    throw new Error(`Promotion PRs from staging to main require 'Release candidate SHA' to match the PR head SHA '${headSha}'.`);
  }
}

function isFullSha(value) { return typeof value === "string" && /^[a-f\d]{40}$/i.test(value); }

function parseIncludedPullRequestNumbers(section, route) {
  const routeName = promotionRouteName(route);
  const entries = section.content.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith(`${PROMOTION_BODY_CONTRACT.shared.includedPullRequests.label}:`));
  if (!entries.length) throw new Error(`Promotion PRs from ${routeName} require at least one '${PROMOTION_BODY_CONTRACT.shared.includedPullRequests.label}: #<number>' entry in visible '## ${section.heading}'.`);
  const numbers = entries.map((entry) => {
    const match = entry.match(/^PR:\s*#(\d+)\s*$/);
    if (!match) throw new Error(`Promotion PRs from ${routeName} require included implementation PR entries to use 'PR: #<number>'.`);
    return Number(match[1]);
  });
  if (unique(numbers).length !== numbers.length) throw new Error(`Promotion PRs from ${routeName} must not duplicate included implementation PR references.`);
  return numbers;
}

function promotionRouteName(route) { return route.environment === "staging" ? "development to staging" : "staging to main"; }

function validateAdvancingFinalization(document, advancingRefs) {
  const route = PROMOTION_BODY_CONTRACT["promotion-to-main"];
  const finalization = route.advancementFinalization;
  const advancingNumbers = advancingRefs.map((entry) => entry.issueNumber);
  if (unique(advancingNumbers).length !== advancingNumbers.length) throw new Error("Promotion PRs to main must not declare the same Advances #<number> reference more than once.");
  const section = getRequiredPromotionSection(document, route, finalization.heading);
  const records = [];
  let current;
  for (const line of section.content.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean)) {
    if (line.startsWith(`${finalization.issueLabel}:`)) {
      const match = line.match(/^Issue:\s*#(\d+)\s*$/);
      if (!match) throw new Error(`Promotion PRs to main require '${finalization.issueLabel}: #<number>' entries in visible '## ${finalization.heading}'.`);
      current = { issueNumber: Number(match[1]), fields: new Map() };
      records.push(current);
      continue;
    }
    const label = [finalization.remainingLabel, finalization.ownerLabel, finalization.eventLabel].find((entry) => line.startsWith(`${entry}:`));
    if (!label) continue;
    if (!current) throw new Error(`Promotion PRs to main require '${finalization.issueLabel}: #<number>' before '${label}: ...' in visible '## ${finalization.heading}'.`);
    if (current.fields.has(label)) throw new Error(`Promotion PRs to main must not duplicate '${label}:' for issue #${current.issueNumber} in visible '## ${finalization.heading}'.`);
    const value = line.slice(label.length + 1).trim();
    if (!value) throw new Error(`Promotion PRs to main require a non-empty '${label}: ...' for issue #${current.issueNumber} in visible '## ${finalization.heading}'.`);
    current.fields.set(label, value);
  }
  const recordNumbers = records.map((record) => record.issueNumber);
  if (unique(recordNumbers).length !== recordNumbers.length) throw new Error(`Promotion PRs to main must not duplicate '${finalization.issueLabel}: #<number>' entries in visible '## ${finalization.heading}'.`);
  for (const record of records) {
    if (!advancingNumbers.includes(record.issueNumber)) throw new Error(`Promotion PRs to main finalization entry for issue #${record.issueNumber} has no matching Advances declaration.`);
    for (const label of [finalization.remainingLabel, finalization.ownerLabel, finalization.eventLabel]) {
      if (!record.fields.has(label)) throw new Error(`Promotion PRs to main require '${label}: ...' for Advances #${record.issueNumber} in visible '## ${finalization.heading}'.`);
    }
  }
  for (const issueNumber of advancingNumbers) {
    if (!recordNumbers.includes(issueNumber)) throw new Error(`Promotion PRs to main require a finalization entry for Advances #${issueNumber} in visible '## ${finalization.heading}'.`);
  }
}

async function validateIncludedPullRequests(config, pullRequestNumbers) {
  if (pullRequestNumbers.length > DEFAULTS.maxIncludedPullRequests) throw new Error(`Promotion PR included implementation PRs exceed the maximum of ${DEFAULTS.maxIncludedPullRequests} references.`);
  await mapWithConcurrency(pullRequestNumbers, DEFAULTS.issueFetchConcurrency, (number) => fetchGitHubPullRequest(config, number));
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

async function fetchGitHubPullRequest(config, number) {
  const pullRequest = await githubRequest(config, `/repos/${config.repository.owner}/${config.repository.repo}/pulls/${number}`, { method: "GET" });
  if (!pullRequest || pullRequest.number !== number) throw new Error(`GitHub pull request response for #${number} is invalid.`);
  return pullRequest;
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
  const commitFilePageBudget = { remaining: DEFAULTS.maxPullRequestCommitFilePages };
  for (const listedCommit of commits) {
    const requestedSha = listedCommit?.sha;
    const sha = typeof requestedSha === "string" ? requestedSha.slice(0, 12) : "<unknown>";
    try {
      const commit = await fetchGitHubCommitWithFiles(config, requestedSha, commitFilePageBudget);
      repositoryPolicy.validateCommitMessageAgainstPaths(commit.message, commit.paths);
    } catch (error) {
      throw new Error(`Pull request commit ${sha} violates repository commit policy: ${error.message}`);
    }
  }
}

async function fetchGitHubCommitWithFiles(config, sha, pageBudget = { remaining: DEFAULTS.maxPullRequestCommitFilePages }) {
  if (!isFullSha(sha)) throw new Error("Pull request commit metadata must include a full commit SHA.");
  const files = [];
  let message;
  for (let page = 1; ; page += 1) {
    if (pageBudget.remaining < 1) {
      throw new Error(`Pull request commit validation exceeds its ${DEFAULTS.maxPullRequestCommitFilePages}-page commit-detail request budget.`);
    }
    pageBudget.remaining -= 1;
    const path = `/repos/${config.repository.owner}/${config.repository.repo}/commits/${sha}?per_page=${DEFAULTS.commitFilePageSize}&page=${page}`;
    const commit = await githubRequest(config, path, { method: "GET" });
    if (!commit || typeof commit !== "object" || !isFullSha(commit.sha) || commit.sha.toLowerCase() !== sha.toLowerCase()) {
      throw new Error(`GitHub commit metadata for '${sha}' is unresolved or does not match the requested SHA.`);
    }
    if (page === 1) {
      message = commit.commit?.message;
      if (typeof message !== "string") throw new Error(`GitHub commit metadata for '${sha}' has no commit message.`);
    }
    if (!Array.isArray(commit.files)) throw new Error(`GitHub commit metadata for '${sha}' has malformed file metadata.`);
    if (commit.files.length > DEFAULTS.commitFilePageSize) {
      throw new Error(`GitHub commit metadata for '${sha}' has malformed file pagination.`);
    }
    files.push(...commit.files);
    if (files.length >= DEFAULTS.maxCommitFiles) {
      throw new Error(`GitHub commit metadata for '${sha}' is demonstrably truncated at the GitHub API's ${DEFAULTS.maxCommitFiles}-file limit.`);
    }
    if (commit.files.length < DEFAULTS.commitFilePageSize) break;
  }
  return { message, paths: pathsFromCommitFiles(files, sha) };
}

function pathsFromCommitFiles(files, sha) {
  const paths = [];
  for (const file of files) {
    if (!file || typeof file.filename !== "string" || !file.filename) {
      throw new Error(`GitHub commit metadata for '${sha}' has malformed file metadata.`);
    }
    paths.push(file.filename);
    if (file.previous_filename !== undefined) {
      if (typeof file.previous_filename !== "string" || !file.previous_filename) {
        throw new Error(`GitHub commit metadata for '${sha}' has malformed previous file metadata.`);
      }
      paths.push(file.previous_filename);
    }
  }
  return paths;
}

async function listPullRequestCommits(config, pullRequestNumber) {
  const commits = [];
  for (let page = 1; ; page += 1) {
    const currentPage = await githubRequest(config, `/repos/${config.repository.owner}/${config.repository.repo}/pulls/${pullRequestNumber}/commits?per_page=100&page=${page}`, { method: "GET" });
    if (!Array.isArray(currentPage)) throw new Error(`GitHub commits response for pull request #${pullRequestNumber} must be an array.`);
    commits.push(...currentPage);
    if (commits.length >= DEFAULTS.maxPullRequestCommits) {
      throw new Error(`GitHub commit listing for pull request #${pullRequestNumber} reaches the ${DEFAULTS.maxPullRequestCommits}-commit API cap and cannot prove all commits were validated.`);
    }
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
  evaluatePromotionBody,
  parseChainContext,
  parseGitHubRenderedDocument,
  renderPrBody,
  validateExplicitlyUntrackedBody,
  validateImplementationBody,
  validateIncludedPullRequests,
  parseFormalIssueUrl,
  findNotionPageByIssueUrl,
  listPullRequestCommits,
  fetchGitHubCommitWithFiles,
  listPullRequestFiles,
  pathsFromCommitFiles,
  validatePrPolicy,
  validateStackedPreviewRuntime,
  validateStackedPreviewParent,
  validateFocusedPullRequestDiff,
  validatePullRequestCommitMessages,
  syncPrMutations,
  syncIssuePrReference,
  isTrustedMutation,
  selectSingleNotionPage,
  listIssueComments,
  managedIssueCommentMarker,
  managedIssueCommentBody,
};
