const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const governance = require("./github-notion-sync.js");

const originalFetch = global.fetch;
const repository = { owner: "acme", repo: "teleferico", slug: "acme/teleferico" };
const branch = "fix/root-tb-103-governance";
const workflowPath = path.join(__dirname, "..", "workflows", "backlog-governance.yml");
const docsPath = path.join(__dirname, "..", "..", "docs", "CI-AUTOMATION.md");
const issueContractPath = path.join(__dirname, "..", "..", "docs", "issue-context-contract.md");
const scriptPath = path.join(__dirname, "github-notion-sync.js");

test.afterEach(() => { global.fetch = originalFetch; });

const response = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => typeof body === "string" ? body : JSON.stringify(body),
});

function config(overrides = {}) {
  const defaults = {
    githubToken: "github",
    notionToken: "notion",
    notionDataSourceId: "source",
    notionVersion: "2025-09-03",
    repository,
    eventName: "pull_request_target",
    properties: { workId: "Work ID", status: "Estado", formalChannel: "Canal formal", formalLink: "Enlace formal", branch: "Branch" },
    statuses: { done: "Hecho" },
    formalChannelName: "GitHub Issue",
    pullRequest: { number: 42, headRef: branch, baseRef: "development", action: "opened", body: "## Related Issues\nRefs #191", merged: false, headRepository: repository.slug },
    renderMarkdown: async () => "<h2>Related Issues</h2>\n<p>Refs #191</p>",
  };
  return { ...defaults, ...overrides, pullRequest: { ...defaults.pullRequest, ...overrides.pullRequest } };
}

function item({ channel = "GitHub Issue", link = "https://github.com/acme/teleferico/issues/191", itemBranch = branch } = {}) {
  return {
    object: "page",
    id: "page-1",
    properties: {
      "Work ID": { type: "unique_id", unique_id: { prefix: "TB", number: 103 } },
      Estado: { type: "select", select: { name: "Listo" } },
      "Canal formal": { type: "select", select: { name: channel } },
      "Enlace formal": { type: "url", url: link },
      Branch: { type: "rich_text", rich_text: itemBranch ? [{ plain_text: itemBranch }] : [] },
    },
  };
}

function renderedRelated(content = "Refs #191") { return `<h2>Related Issues</h2>\n<p>${content}</p>`; }
function mockFetch(handler) { global.fetch = async (url, options = {}) => handler(String(url), options); }

test("renders PR Markdown through GitHub GFM with repository context", async () => {
  let request;
  mockFetch((url, options) => {
    request = { url, options };
    return response(200, "<h2>Related Issues</h2><p>Refs #191</p>");
  });
  const rendered = await governance.renderPrBody(config({ renderMarkdown: undefined }), "## Related Issues\nRefs #191");
  assert.equal(request.url, "https://api.github.com/markdown");
  assert.equal(request.options.method, "POST");
  assert.deepEqual(JSON.parse(request.options.body), { text: "## Related Issues\nRefs #191", mode: "gfm", context: "acme/teleferico" });
  assert.deepEqual(governance.extractRefsNumbers(rendered), [191]);
});

test("uses GitHub-rendered visible semantics for adversarial GFM cases", () => {
  const cases = [
    ["lazy blockquote", "<h2>Related Issues</h2><blockquote>\n<p>Refs #191</p>\n</blockquote>", []],
    ["nested list fence", "<h2>Related Issues</h2><ul><li><pre><code>Refs #192</code></pre></li></ul>", []],
    ["multiline code span", "<h2>Related Issues</h2><p><code>Refs #193\nRefs #194</code></p>", []],
    ["raw HTML attributes", "<h2>Related Issues</h2><p><span data-reference=\"Refs #195\">metadata only</span></p>", []],
    ["reference definition", "<h2>Related Issues</h2><p>Reference definition output has no source destination.</p>", []],
    ["visible inline HTML label", "<h2>Related Issues</h2><p><span>Refs #196</span></p>", [196]],
    ["visible link label", "<h2>Related Issues</h2><p><a href=\"https://example.test/hidden\">Refs #197</a></p>", [197]],
    ["hidden container", "<h2>Related Issues</h2><div hidden><p>Refs #198</p></div>", []],
  ];
  for (const [name, html, expected] of cases) {
    assert.deepEqual(governance.extractRefsNumbers(governance.parseGitHubRenderedDocument(html)), expected, name);
  }

  const atx = governance.parseGitHubRenderedDocument("<h2>Related Issues</h2><p>Refs #199</p>");
  const setext = governance.parseGitHubRenderedDocument("<h2>Related Issues</h2>\n<p>Refs #200</p>");
  assert.deepEqual(governance.extractRefsNumbers(atx), [199]);
  assert.deepEqual(governance.extractRefsNumbers(setext), [200]);
  assert.deepEqual(governance.extractClosingReferences(governance.parseGitHubRenderedDocument("<p>`unmatched Closes #201</p>")), [{ keyword: "Closes", issueNumber: 201 }]);
  assert.deepEqual(governance.extractClosingReferences(governance.parseGitHubRenderedDocument("<pre><code>Closes #202</code></pre><p>Closes #203</p>")), [{ keyword: "Closes", issueNumber: 203 }]);
});

test("requires visible Tracking and final visible Related Issues sections", () => {
  const tracking = governance.parseGitHubRenderedDocument("<h2>Tracking</h2><p>Backlog item: none\nReason: Repository-only maintenance.</p>");
  governance.validateExplicitlyUntrackedBody(tracking);
  assert.throws(() => governance.validateExplicitlyUntrackedBody(governance.parseGitHubRenderedDocument("<details><h2>Tracking</h2><p>Backlog item: none\nReason: hidden</p></details>")), /visible/);
  assert.deepEqual(governance.extractRefsNumbers(governance.parseGitHubRenderedDocument("<h2>Related Issues</h2><p>Refs #191</p><h2>Later</h2><p>Text</p>")), []);
  assert.deepEqual(governance.extractRefsNumbers(governance.parseGitHubRenderedDocument("<h2>Related Issues</h2><p>Refs #191</p><h1>Later</h1>")), []);
});

test("does not retain the handwritten Markdown parser", () => {
  const source = fs.readFileSync(scriptPath, "utf8");
  assert.doesNotMatch(source, /function visibleMarkdown|function stripInlineCode|function getOpeningFence|function parseAtxHeading/);
});

test("validation fails closed when GitHub rendering fails", async () => {
  mockFetch(() => response(503, {}));
  await assert.rejects(governance.validatePrPolicy(config({ renderMarkdown: undefined })), /GitHub POST \/markdown failed with status 503/);
});

test("tracked work requires the exact rendered related issue reference", async () => {
  mockFetch((url) => {
    if (url.includes("api.notion.com")) return response(200, { results: [item()], has_more: false });
    return response(200, { number: 191, html_url: "https://github.com/acme/teleferico/issues/191" });
  });
  await governance.validatePrPolicy(config());
  await assert.rejects(governance.validatePrPolicy(config({ renderMarkdown: async () => renderedRelated("Refs #192") })), /Refs #191/);
});

test("Unicode word boundaries do not detect tb inside words and reject punctuation-bound malformed markers", () => {
  for (const branchName of ["fix/ñtb-103", "fix/漢tb-103", "fix/é-tb-103ñ"]) {
    const markers = governance.extractWorkIdMarkers(branchName);
    assert.equal(markers.canonical.length, 0, branchName);
    if (branchName.endsWith("ñ")) assert.ok(markers.malformed.length, branchName);
  }
  for (const marker of ["tb@103", "tb=103", "tb%103", "tb--103"]) {
    assert.ok(governance.extractWorkIdMarkers(`fix/root-${marker}`).malformed.length, marker);
  }
  assert.deepEqual(governance.extractWorkIdMarkers("fix/root-tb-103-governance").canonical, ["TB-103"]);
});

test("preflight failures perform no comment or Notion mutation", async () => {
  const requests = [];
  mockFetch((url, options) => {
    requests.push([url, options.method]);
    if (url.endsWith("/191")) return response(200, { number: 191, html_url: "https://github.com/acme/teleferico/issues/191" });
    if (url.endsWith("/192")) return response(404, {});
    throw new Error(`Unexpected request ${url}`);
  });
  await assert.rejects(governance.syncIssuePrReference(config({ renderMarkdown: async () => renderedRelated("Refs #191\nRefs #192") })), /status 404/);
  assert.equal(requests.some(([, method]) => method === "POST" || method === "PATCH"), false);
});

test("reference caps fail before external requests", async () => {
  let calls = 0;
  const references = Array.from({ length: 101 }, (_, index) => `Refs #${index + 1}`).join("\n");
  mockFetch(() => { calls += 1; return response(200, {}); });
  await assert.rejects(
    governance.syncIssuePrReference(config({ renderMarkdown: async () => renderedRelated(references) })),
    /maximum of 100/,
  );
  assert.equal(calls, 0);
});

test("untrusted metadata cannot start GitHub or Notion mutations", async () => {
  let calls = 0;
  mockFetch(() => { calls += 1; return response(200, {}); });
  await governance.syncPrMutations(config({ eventName: "workflow_dispatch" }));
  assert.equal(calls, 0);
});

test("managed comments are idempotent and never PATCH issue bodies", async () => {
  const marker = governance.managedIssueCommentMarker(191, 42, "Related PR");
  const requests = [];
  mockFetch((url, options) => {
    requests.push([url, options.method]);
    if (url.endsWith("/191")) return response(200, { number: 191, html_url: "https://github.com/acme/teleferico/issues/191" });
    if (url.includes("/191/comments?")) return response(200, [{ body: marker }]);
    throw new Error(`Unexpected request ${url}`);
  });
  await governance.syncIssuePrReference(config());
  assert.equal(requests.some(([, method]) => method === "POST" || method === "PATCH"), false);
  assert.doesNotMatch(fs.readFileSync(scriptPath, "utf8"), /method: "PATCH"[\s\S]*repos\$\{config\.repository\.owner\}/);
});

test("different PRs append independent comments to one issue", async () => {
  const comments = [];
  const requests = [];
  mockFetch((url, options) => {
    requests.push([url, options.method, options.body]);
    if (url.endsWith("/191")) return response(200, { number: 191, html_url: "https://github.com/acme/teleferico/issues/191" });
    if (url.includes("/191/comments?")) return response(200, comments);
    if (url.endsWith("/191/comments") && options.method === "POST") { comments.push({ body: JSON.parse(options.body).body }); return response(201, {}); }
    throw new Error(`Unexpected request ${url}`);
  });
  await governance.syncIssuePrReference(config());
  await governance.syncIssuePrReference(config({ pullRequest: { number: 43 } }));
  assert.equal(requests.filter(([, method]) => method === "POST").length, 2);
  assert.ok(comments.some((comment) => comment.body.includes("pr=42:role=Related PR")));
  assert.ok(comments.some((comment) => comment.body.includes("pr=43:role=Related PR")));
});

test("comment markers distinguish promotion and shipped relations", async () => {
  const comments = [];
  mockFetch((url, options) => {
    if (url.endsWith("/191")) return response(200, { number: 191, html_url: "https://github.com/acme/teleferico/issues/191" });
    if (url.includes("/191/comments?")) return response(200, comments);
    if (url.endsWith("/191/comments") && options.method === "POST") { comments.push({ body: JSON.parse(options.body).body }); return response(201, {}); }
    if (url.includes("api.notion.com")) return response(200, { results: [], has_more: false });
    throw new Error(`Unexpected request ${url}`);
  });
  await governance.syncIssuePrReference(config({ pullRequest: { number: 43, headRef: "development", baseRef: "staging" } }));
  await governance.syncPrMutations(config({ pullRequest: { number: 44, headRef: "staging", baseRef: "main", action: "closed", merged: true } }));
  assert.ok(comments.some((comment) => comment.body.includes("Promotion PR: #43") && comment.body.includes("role=Promotion PR")));
  assert.ok(comments.some((comment) => comment.body.includes("Shipped by: #44") && comment.body.includes("role=Shipped by")));
});

test("comment lookup follows pagination before deciding to no-op", async () => {
  const marker = governance.managedIssueCommentMarker(191, 42, "Related PR");
  const pages = [];
  mockFetch((url, options) => {
    if (url.endsWith("/191")) return response(200, { number: 191, html_url: "https://github.com/acme/teleferico/issues/191" });
    if (url.includes("&page=1")) { pages.push(1); return response(200, Array.from({ length: 100 }, () => ({ body: "other" }))); }
    if (url.includes("&page=2")) { pages.push(2); return response(200, [{ body: marker }]); }
    if (options.method === "POST") throw new Error("A duplicate comment must not be created.");
    throw new Error(`Unexpected request ${url}`);
  });
  await governance.syncIssuePrReference(config());
  assert.deepEqual(pages, [1, 2]);
});

test("main promotion preflights Notion before comments or closure writes", async () => {
  const requests = [];
  mockFetch((url, options) => {
    requests.push([url, options.method]);
    if (url.endsWith("/191")) return response(200, { number: 191, html_url: "https://github.com/acme/teleferico/issues/191" });
    if (url.includes("api.notion.com") && options.method === "POST") return response(200, { results: [item(), { ...item(), id: "page-2" }], has_more: false });
    throw new Error(`Unexpected request ${url}`);
  });
  const promotion = config({
    pullRequest: { headRef: "staging", baseRef: "main", action: "closed", merged: true },
    renderMarkdown: async () => "<p>Closes #191</p>",
  });
  await assert.rejects(governance.syncPrMutations(promotion), /Multiple Notion backlog items/);
  assert.equal(requests.some(([, method]) => method === "PATCH" || method === "POST"), true, "Notion lookup is a preflight read POST");
  assert.equal(requests.some(([url, method]) => url.includes("api.github.com") && method === "POST"), false);
  assert.equal(requests.some(([url, method]) => url.includes("api.notion.com/v1/pages/") && method === "PATCH"), false);
});

test("merged main promotions preserve Notion closure after complete preflight", async () => {
  const requests = [];
  mockFetch((url, options) => {
    requests.push([url, options.method]);
    if (url.endsWith("/191")) return response(200, { number: 191, html_url: "https://github.com/acme/teleferico/issues/191" });
    if (url.includes("api.notion.com") && options.method === "POST") return response(200, { results: [item()], has_more: false });
    if (url.includes("/191/comments?")) return response(200, []);
    if (url.includes("api.notion.com/v1/pages/page-1") && options.method === "PATCH") return response(200, {});
    if (url.endsWith("/191/comments") && options.method === "POST") return response(201, {});
    throw new Error(`Unexpected request ${url}`);
  });
  await governance.syncPrMutations(config({
    pullRequest: { number: 44, headRef: "staging", baseRef: "main", action: "closed", merged: true },
    renderMarkdown: async () => "<p>Closes #191</p>",
  }));
  const commentLookup = requests.findIndex(([url, method]) => url.includes("/191/comments?") && method === "GET");
  const notionWrite = requests.findIndex(([url, method]) => url.includes("api.notion.com/v1/pages/page-1") && method === "PATCH");
  const commentWrite = requests.findIndex(([url, method]) => url.endsWith("/191/comments") && method === "POST");
  assert.ok(commentLookup >= 0 && notionWrite > commentLookup && commentWrite > notionWrite);
});

test("workflow serializes only trusted sync runs for the same PR", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const validateJob = workflow.match(/validate-pr-policy:[\s\S]*?(?=\n\S|$)/)?.[0] || "";
  const syncJob = workflow.match(/trusted-pr-sync:[\s\S]*?(?=\n\S|$)/)?.[0] || "";
  assert.match(syncJob, /concurrency:\n\s+group: backlog-governance-pr-\$\{\{ github\.event\.pull_request\.number \}\}/);
  assert.doesNotMatch(workflow, /^concurrency:/m);
  assert.match(validateJob, /ref: \$\{\{ github\.event\.repository\.default_branch \}\}/);
  assert.match(syncJob, /if: github\.event_name == 'pull_request_target' && github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
  assert.match(syncJob, /ref: \$\{\{ github\.event\.repository\.default_branch \}\}/);
  assert.match(syncJob, /needs: \[governance-tests, validate-pr-policy\]/);
  assert.match(workflow, /name: Governance tests/);
});

test("documentation identifies append-only issue comments as authoritative", () => {
  const docs = fs.readFileSync(docsPath, "utf8");
  const contract = fs.readFileSync(issueContractPath, "utf8");
  assert.match(docs, /append-only issue comments/i);
  assert.match(contract, /authoritative mechanism for new synchronization/i);
  assert.doesNotMatch(contract, /managed:related-prs:start/);
});
