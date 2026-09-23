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
const conventionsPath = path.join(__dirname, "..", "..", "docs", "CONVENTIONS.md");
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
    pullRequest: { number: 42, headRef: branch, baseRef: "development", action: "opened", body: "## Related Issues\nRefs #191", headSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", merged: false, headRepository: repository.slug },
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
function renderedChainContext({
  strategy = "stacked-to-main",
  parentPullRequest = "#41",
  parentBranch = "feat/root-tb-102-parent",
  parentHeadSha = "b".repeat(40),
} = {}) {
  return `<h2>Chain Context</h2><p>Strategy: ${strategy}\nParent PR: ${parentPullRequest}\nParent branch: ${parentBranch}\nParent head SHA: <a href="https://github.com/${repository.slug}/commit/${parentHeadSha}">${parentHeadSha}</a></p>`;
}
function stackedPreviewConfig(overrides = {}) {
  return config({
    ...overrides,
    pullRequest: {
      number: 42,
      headRef: branch,
      baseRef: "feat/root-tb-102-parent",
      headSha: "a".repeat(40),
      baseSha: "b".repeat(40),
      draft: true,
      headRepository: repository.slug,
      baseRepository: repository.slug,
      ...overrides.pullRequest,
    },
    renderMarkdown: overrides.renderMarkdown || (async () => renderedChainContext()),
  });
}
function mockFetch(handler) { global.fetch = async (url, options = {}) => handler(String(url), options); }
function renderedPromotion({
  environment = "staging",
  validationLabel = "Plan",
  validation = "Run the booking and administration checks.",
  included = ["#191"],
  rollback = "Revert this promotion PR.",
  releaseCandidateSha = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  releaseIntent = "",
  advancementFinalization = "",
} = {}) {
  return [
    "<h2>Included Implementation PRs</h2>",
    ...included.map((reference) => `<p>PR: ${reference}</p>`),
    "<h2>Release Target</h2>",
    `<p>Environment: ${environment}</p>`,
    "<h2>Validation</h2>",
    `<p>${validationLabel}: ${validation}</p>`,
    releaseCandidateSha ? `<p>Release candidate SHA: ${releaseCandidateSha}</p>` : "",
    "<h2>Rollback</h2>",
    `<p>Strategy: ${rollback}</p>`,
    releaseIntent,
    advancementFinalization,
  ].join("");
}

function renderedAdvancementFinalization(issueNumber = 191) {
  return `<h2>Advancement Finalization</h2><p>Issue: #${issueNumber}</p><p>Remaining work or condition: Verify the production smoke result.</p><p>Finalization owner: Release manager.</p><p>Finalization event or action: Close the issue after the smoke workflow passes.</p>`;
}

function mockIncludedPullRequests() {
  mockFetch((url) => {
    const match = url.match(/\/pulls\/(\d+)$/);
    if (!match) throw new Error(`Unexpected request ${url}`);
    return response(200, { number: Number(match[1]), html_url: `https://github.com/acme/teleferico/pull/${match[1]}` });
  });
}

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
  assert.deepEqual(governance.extractAdvancingReferences(governance.parseGitHubRenderedDocument("<pre><code>Advances #204</code></pre><p>Advances #205</p>")), [{ keyword: "Advances", issueNumber: 205 }]);
});

test("main promotion validation supports phased delivery declarations", async () => {
  mockIncludedPullRequests();
  const cases = [
    ["advances only", renderedPromotion({ environment: "production", validationLabel: "Prior staging validation evidence", releaseIntent: "<p>Advances #191</p>", advancementFinalization: renderedAdvancementFinalization() }), null],
    ["advances and closes different issues", renderedPromotion({ environment: "production", validationLabel: "Prior staging validation evidence", releaseIntent: "<p>Advances #191</p><p>Closes #192</p>", advancementFinalization: renderedAdvancementFinalization() }), null],
    ["advances and closes the same issue", renderedPromotion({ environment: "production", validationLabel: "Prior staging validation evidence", releaseIntent: "<p>Advances #191</p><p>Closes #191</p>" }), /cannot both advance and close issue #191/],
    ["advances and no formal issues", renderedPromotion({ environment: "production", validationLabel: "Prior staging validation evidence", releaseIntent: "<p>Advances #191</p><p>Formal issues: none</p>" }), /cannot mix advancing references with Formal issues: none/],
    ["closes and no formal issues", renderedPromotion({ environment: "production", validationLabel: "Prior staging validation evidence", releaseIntent: "<p>Closes #191</p><p>Formal issues: none</p>" }), /cannot mix closing references with Formal issues: none/],
    ["no declaration", renderedPromotion({ environment: "production", validationLabel: "Prior staging validation evidence" }), /closing references, advancing references, or 'Formal issues: none'/],
  ];
  for (const [name, html, expectedError] of cases) {
    const promotion = config({
      pullRequest: { headRef: "staging", baseRef: "main" },
      renderMarkdown: async () => html,
    });
    if (expectedError) await assert.rejects(governance.validatePrPolicy(promotion), expectedError, name);
    else await governance.validatePrPolicy(promotion);
  }
});

test("main promotions require deterministic finalization paths for Advances declarations", async () => {
  const cases = [
    ["missing finalization", renderedPromotion({ environment: "production", validationLabel: "Prior staging validation evidence", releaseIntent: "<p>Advances #191</p>" }), /Advancement Finalization/],
    ["empty owner", renderedPromotion({ environment: "production", validationLabel: "Prior staging validation evidence", releaseIntent: "<p>Advances #191</p>", advancementFinalization: renderedAdvancementFinalization().replace("Finalization owner: Release manager.", "Finalization owner: ") }), /non-empty 'Finalization owner: ...'/],
    ["unmatched issue", renderedPromotion({ environment: "production", validationLabel: "Prior staging validation evidence", releaseIntent: "<p>Advances #191</p>", advancementFinalization: renderedAdvancementFinalization(192) }), /issue #192 has no matching Advances declaration/],
    ["duplicate declaration", renderedPromotion({ environment: "production", validationLabel: "Prior staging validation evidence", releaseIntent: "<p>Advances #191</p><p>Advances #191</p>", advancementFinalization: renderedAdvancementFinalization() }), /same Advances #<number> reference more than once/],
  ];
  for (const [name, html, expectedError] of cases) {
    await assert.rejects(governance.validatePrPolicy(config({
      pullRequest: { headRef: "staging", baseRef: "main" },
      renderMarkdown: async () => html,
    })), expectedError, name);
  }
});

test("main promotions bind prior staging evidence to the current release candidate SHA", async () => {
  mockIncludedPullRequests();
  await governance.validatePrPolicy(config({
    pullRequest: { headRef: "staging", baseRef: "main" },
    renderMarkdown: async () => renderedPromotion({ environment: "production", validationLabel: "Prior staging validation evidence", releaseIntent: "<p>Formal issues: none</p>" }),
  }));

  const candidateCases = [
    ["missing candidate", renderedPromotion({ environment: "production", validationLabel: "Prior staging validation evidence", releaseCandidateSha: "", releaseIntent: "<p>Formal issues: none</p>" }), {}, /Release candidate SHA: .../],
    ["malformed candidate", renderedPromotion({ environment: "production", validationLabel: "Prior staging validation evidence", releaseCandidateSha: "candidate", releaseIntent: "<p>Formal issues: none</p>" }), {}, /full 40-character hexadecimal/],
    ["candidate mismatch", renderedPromotion({ environment: "production", validationLabel: "Prior staging validation evidence", releaseCandidateSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", releaseIntent: "<p>Formal issues: none</p>" }), {}, /match the PR head SHA/],
    ["missing runtime SHA", renderedPromotion({ environment: "production", validationLabel: "Prior staging validation evidence", releaseIntent: "<p>Formal issues: none</p>" }), { headSha: "" }, /PR head SHA from runtime metadata/],
    ["malformed runtime SHA", renderedPromotion({ environment: "production", validationLabel: "Prior staging validation evidence", releaseIntent: "<p>Formal issues: none</p>" }), { headSha: "not-a-sha" }, /PR head SHA from runtime metadata/],
    ["blockquote-only candidate", renderedPromotion({ environment: "production", validationLabel: "Prior staging validation evidence", releaseCandidateSha: "", releaseIntent: "<p>Formal issues: none</p>" }) + "<blockquote><p>Release candidate SHA: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</p></blockquote>", {}, /Release candidate SHA: .../],
  ];
  for (const [name, html, pullRequest, expectedError] of candidateCases) {
    await assert.rejects(governance.validatePrPolicy(config({
      pullRequest: { headRef: "staging", baseRef: "main", ...pullRequest },
      renderMarkdown: async () => html,
    })), expectedError, name);
  }
});

test("promotion body contract requires visible route-specific release metadata", async () => {
  const requestedPullRequests = [];
  mockFetch((url) => {
    const match = url.match(/\/pulls\/(\d+)$/);
    if (!match) throw new Error(`Unexpected request ${url}`);
    requestedPullRequests.push(Number(match[1]));
    return response(200, { number: Number(match[1]) });
  });

  await governance.validatePrPolicy(config({
    pullRequest: { headRef: "development", baseRef: "staging" },
    renderMarkdown: async () => renderedPromotion(),
  }));
  await governance.validatePrPolicy(config({
    pullRequest: { headRef: "staging", baseRef: "main" },
    renderMarkdown: async () => renderedPromotion({ environment: "production", validationLabel: "Prior staging validation evidence", releaseIntent: "<p>Formal issues: none</p>" }),
  }));
  assert.deepEqual(requestedPullRequests, [191, 191]);

  const cases = [
    ["missing section", "<h2>Included Implementation PRs</h2><p>PR: #191</p>", /Release Target/],
    ["empty field", renderedPromotion({ validation: "" }), /non-empty 'Plan: ...'/],
    ["duplicate section", `${renderedPromotion()}<h2>Rollback</h2><p>Strategy: Duplicate.</p>`, /must not duplicate.*Rollback/],
    ["malformed reference", renderedPromotion({ included: ["not-a-number"] }), /PR: #<number>/],
    ["duplicate reference", renderedPromotion({ included: ["#191", "#191"] }), /must not duplicate included implementation PR references/],
    ["route contradiction", renderedPromotion({ environment: "production" }), /Environment: staging/],
    ["blockquote-only metadata", "<h2>Included Implementation PRs</h2><p>PR: #191</p><h2>Release Target</h2><p>Environment: staging</p><h2>Validation</h2><p>Plan: Check staging.</p><blockquote><h2>Rollback</h2><p>Strategy: Revert.</p></blockquote>", /Rollback/],
    ["hidden-only reference", "<details><h2>Included Implementation PRs</h2><p>PR: #191</p></details><h2>Release Target</h2><p>Environment: staging</p><h2>Validation</h2><p>Plan: Check staging.</p><h2>Rollback</h2><p>Strategy: Revert.</p>", /Included Implementation PRs/],
    ["code-block-only reference", "<pre><code><h2>Included Implementation PRs</h2><p>PR: #191</p></code></pre><h2>Release Target</h2><p>Environment: staging</p><h2>Validation</h2><p>Plan: Check staging.</p><h2>Rollback</h2><p>Strategy: Revert.</p>", /Included Implementation PRs/],
  ];
  for (const [name, html, expectedError] of cases) {
    await assert.rejects(governance.validatePrPolicy(config({
      pullRequest: { headRef: "development", baseRef: "staging" },
      renderMarkdown: async () => html,
    })), expectedError, name);
  }
});

test("staging promotions reject closing references after satisfying the release metadata contract", async () => {
  await assert.rejects(governance.validatePrPolicy(config({
    pullRequest: { headRef: "development", baseRef: "staging" },
    renderMarkdown: async () => renderedPromotion({ releaseIntent: "<p>Closes #191</p>" }),
  })), /development to staging must NOT close issues/);
});

test("promotion validation rejects an included reference that is not a pull request", async () => {
  mockFetch(() => response(404, {}));
  await assert.rejects(governance.validatePrPolicy(config({
    pullRequest: { headRef: "development", baseRef: "staging" },
    renderMarkdown: async () => renderedPromotion(),
  })), /GitHub GET .*\/pulls\/191 failed with status 404/);
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

test("canonical Work ID remains tracked when Notion Branch names another fresh follow-up branch", async () => {
  mockFetch((url) => {
    if (url.includes("api.notion.com")) return response(200, { results: [item({ itemBranch: "fix/root-tb-103-initial-slice" })], has_more: false });
    return response(200, { number: 191, html_url: "https://github.com/acme/teleferico/issues/191" });
  });
  await governance.validatePrPolicy(config({ pullRequest: { headRef: "fix/root-tb-103-follow-up-slice" } }));
});

test("canonical Work ID remains tracked when Notion Branch is empty", async () => {
  mockFetch((url) => {
    if (url.includes("api.notion.com")) return response(200, { results: [item({ itemBranch: "" })], has_more: false });
    return response(200, { number: 191, html_url: "https://github.com/acme/teleferico/issues/191" });
  });
  await governance.validatePrPolicy(config());
});

test("no-backlog branches require the visible tracking declaration without querying Notion", async () => {
  let calls = 0;
  mockFetch(() => { calls += 1; return response(200, {}); });
  await governance.validatePrPolicy(config({
    pullRequest: { headRef: "chore/root-no-backlog-policy-maintenance", body: "## Tracking\nBacklog item: none\nReason: Repository-only maintenance." },
    renderMarkdown: async () => "<h2>Tracking</h2><p>Backlog item: none\nReason: Repository-only maintenance.</p>",
  }));
  assert.equal(calls, 0);
  await assert.rejects(governance.validatePrPolicy(config({
    pullRequest: { headRef: "chore/root-no-backlog-policy-maintenance" },
    renderMarkdown: async () => "<p>Missing tracking declaration.</p>",
  })), /visible ## Tracking/);
});

test("stacked child previews require the exact visible Chain Context contract", () => {
  assert.deepEqual(governance.parseChainContext(governance.parseGitHubRenderedDocument(renderedChainContext())), {
    strategy: "stacked-to-main",
    parentPullRequest: "#41",
    parentBranch: "feat/root-tb-102-parent",
    parentHeadSha: "b".repeat(40),
    parentPullRequestNumber: 41,
  });
  for (const [name, html, expected] of [
    ["missing", "<p>No chain metadata.</p>", /require one visible/],
    ["duplicate section", `${renderedChainContext()}${renderedChainContext()}`, /must not duplicate the visible/],
    ["duplicate field", renderedChainContext().replace("Strategy: stacked-to-main", "Strategy: stacked-to-main\nStrategy: stacked-to-main"), /must not duplicate 'Strategy:'/],
    ["wrong strategy", renderedChainContext({ strategy: "feature-branch-chain" }), /Strategy: stacked-to-main/],
    ["malformed parent", renderedChainContext({ parentPullRequest: "41" }), /Parent PR: #<number>/],
  ]) {
    assert.throws(() => governance.parseChainContext(governance.parseGitHubRenderedDocument(html)), expected, name);
  }
});

test("stacked child preview validation binds draft, repository, parent, base SHA, and focused diff", async () => {
  const requests = [];
  mockFetch((url) => {
    requests.push(url);
    if (url.endsWith("/pulls/41")) return response(200, {
      number: 41,
      state: "open",
      head: { ref: "feat/root-tb-102-parent", sha: "b".repeat(40), repo: { full_name: repository.slug } },
      base: { ref: "development", sha: "c".repeat(40), repo: { full_name: repository.slug } },
    });
    if (url.includes("/pulls/42/files?")) return response(200, [{ filename: ".github/scripts/repository-policy.js" }]);
    throw new Error(`Unexpected request ${url}`);
  });
  await governance.validatePrPolicy(stackedPreviewConfig());
  assert.equal(requests.some((url) => url.includes("api.notion.com")), false);
  assert.equal(requests.some((url) => url.endsWith("/pulls/41")), true);
  assert.equal(requests.some((url) => url.includes("/pulls/42/files?")), true);
});

test("stacked child preview runtime rejects stale or privileged topology before parent reads", async () => {
  const chainContext = governance.parseChainContext(governance.parseGitHubRenderedDocument(renderedChainContext()));
  const cases = [
    ["ready", { draft: false }, /must remain draft/],
    ["fork head", { headRepository: "fork/teleferico" }, /same-repository/],
    ["wrong base", { baseRef: "feat/root-tb-999-other" }, /must match declared parent branch/],
    ["stale base SHA", { baseSha: "d".repeat(40) }, /must match declared parent head SHA/],
  ];
  for (const [name, pullRequest, expected] of cases) {
    assert.throws(() => governance.validateStackedPreviewRuntime(stackedPreviewConfig({ pullRequest }), chainContext), expected, name);
  }
});

test("stacked child preview rejects stale parent state and truncated parent-relative diffs", async () => {
  mockFetch((url) => {
    if (url.endsWith("/pulls/41")) return response(200, {
      number: 41,
      state: "closed",
      head: { ref: "feat/root-tb-102-parent", sha: "b".repeat(40), repo: { full_name: repository.slug } },
      base: { ref: "development", repo: { full_name: repository.slug } },
    });
    throw new Error(`Unexpected request ${url}`);
  });
  await assert.rejects(governance.validatePrPolicy(stackedPreviewConfig()), /parent PR #41 must be open/);

  mockFetch((url) => {
    if (url.includes("/pulls/42/files?")) return response(200, Array.from({ length: 100 }, (_, index) => ({ filename: `file-${index}.js` })));
    throw new Error(`Unexpected request ${url}`);
  });
  await assert.rejects(governance.listPullRequestFiles(stackedPreviewConfig(), 42), /3000-file API cap/);
});

test("missing no-backlog markers, malformed markers, and unknown prefixes fail before external requests", async () => {
  const cases = [
    ["missing marker", "fix/root-legacy-governance"],
    ["malformed", "fix/root-tb103-governance"],
    ["repeated", "fix/root-tb-103-tb-103-governance"],
    ["multiple", "fix/root-tb-103-tb-104-governance"],
    ["unknown prefix", "feature/root-tb-103-governance"],
  ];
  for (const [name, headRef] of cases) {
    let calls = 0;
    mockFetch(() => { calls += 1; return response(200, { results: [item({ itemBranch: headRef })], has_more: false }); });
    await assert.rejects(governance.validatePrPolicy(config({ pullRequest: { headRef } })), /must use|unsupported type|exactly one complete Work ID/, name);
    assert.equal(calls, 0, name);
  }
});

test("unknown and ambiguous Work IDs fail without querying the Branch fallback", async () => {
  const cases = [
    ["unknown", "fix/root-tb-999-governance", [], /No Notion backlog item found/],
    ["ambiguous", branch, [item(), { ...item(), id: "page-2" }], /Multiple Notion backlog items match Work ID/],
  ];
  for (const [name, headRef, results, expected] of cases) {
    const filters = [];
    mockFetch((url, options) => {
      if (!url.includes("api.notion.com")) throw new Error(`Unexpected request ${url}`);
      const filter = JSON.parse(options.body).filter;
      filters.push(filter);
      return response(200, { results, has_more: false });
    });
    await assert.rejects(governance.validatePrPolicy(config({ pullRequest: { headRef } })), expected, name);
    assert.equal(filters.length, 1, name);
    assert.ok(filters[0].unique_id, name);
    assert.equal(filters[0].rich_text, undefined, name);
  }
});

test("PR commit validation reads trusted GitHub commit metadata and fails malformed messages", async () => {
  const commitConfig = config({ validateCommitMessages: true });
  const validSha = "a".repeat(40);
  const invalidSha = "b".repeat(40);
  mockFetch((url) => {
    if (url.includes("/pulls/42/commits?")) return response(200, [{ sha: validSha }]);
    if (url.includes(`/commits/${validSha}?`)) return response(200, { sha: validSha, commit: { message: "chore(root/policy): Enforce branch grammar" }, files: [{ filename: ".github/scripts/repository-policy.js" }] });
    if (url.includes("api.notion.com")) return response(200, { results: [item()], has_more: false });
    return response(200, { number: 191, html_url: "https://github.com/acme/teleferico/issues/191" });
  });
  await governance.validatePrPolicy(commitConfig);

  mockFetch((url) => {
    if (url.includes("/pulls/42/commits?")) return response(200, [{ sha: invalidSha }]);
    if (url.includes(`/commits/${invalidSha}?`)) return response(200, { sha: invalidSha, commit: { message: "unstructured commit" }, files: [{ filename: ".github/scripts/repository-policy.js" }] });
    throw new Error(`Unexpected request ${url}`);
  });
  await assert.rejects(governance.validatePrPolicy(commitConfig), /commit bbbbbbbbbbbb violates repository commit policy/);
});

test("PR commit validation isolates paths per SHA, paginates files, includes rename paths, and routes through the base repository", async () => {
  const appSha = "c".repeat(40);
  const renameSha = "d".repeat(40);
  const requests = [];
  mockFetch((url) => {
    requests.push(url);
    if (url.includes("/pulls/42/commits?")) return response(200, [{ sha: appSha }, { sha: renameSha }]);
    if (url.includes(`/commits/${appSha}?`) && url.endsWith("page=1")) {
      return response(200, { sha: appSha, commit: { message: "feat(app/login): Add login" }, files: Array.from({ length: 100 }, (_, index) => ({ filename: `teleferico-app/src/${index}.tsx` })) });
    }
    if (url.includes(`/commits/${appSha}?`) && url.endsWith("page=2")) {
      return response(200, { sha: appSha, commit: { message: "feat(app/login): Add login" }, files: [] });
    }
    if (url.includes(`/commits/${renameSha}?`)) {
      return response(200, {
        sha: renameSha,
        commit: { message: "refactor(app-cms/contact): Move contact" },
        files: [
          { filename: "teleferico-cms/src/contact.js", previous_filename: "teleferico-app/src/contact.tsx", status: "renamed" },
          { filename: "teleferico-app/src/contact-copy.tsx", previous_filename: "teleferico-app/src/contact.tsx", status: "copied" },
        ],
      });
    }
    if (url.includes("api.notion.com")) return response(200, { results: [item()], has_more: false });
    return response(200, { number: 191, html_url: "https://github.com/acme/teleferico/issues/191" });
  });
  await governance.validatePrPolicy(config({ validateCommitMessages: true, pullRequest: { headRepository: "fork/acme" } }));
  assert.ok(requests.some((url) => url.includes(`/repos/acme/teleferico/commits/${appSha}?`)));
  assert.equal(requests.some((url) => url.includes("/repos/fork/acme/")), false);
  assert.equal(requests.some((url) => url.endsWith("page=2")), true);
});

test("PR commit validation shares one commit-detail page budget across commits and fails before an excess request", async () => {
  const shas = Array.from({ length: 151 }, (_, index) => index.toString(16).padStart(40, "0"));
  const requests = [];
  mockFetch((url) => {
    if (url.includes("/pulls/42/commits?") && url.endsWith("page=1")) return response(200, shas.map((sha) => ({ sha })));
    if (url.includes("/pulls/42/commits?") && url.endsWith("page=2")) return response(200, []);
    if (url.includes("/commits/")) {
      requests.push(url);
      return response(200, {
        sha: url.match(/commits\/([0-9a-f]{40})\?/)?.[1],
        commit: { message: "chore(root/policy): Enforce branch grammar" },
        files: url.endsWith("page=1") ? Array.from({ length: 100 }, () => ({ filename: ".github/scripts/repository-policy.js" })) : [],
      });
    }
    throw new Error(`Unexpected request ${url}`);
  });
  await assert.rejects(
    governance.validatePullRequestCommitMessages(config({ validateCommitMessages: true })),
    /exceeds its 300-page commit-detail request budget/,
  );
  assert.equal(requests.length, governance.DEFAULTS.maxPullRequestCommitFilePages);
  assert.equal(requests.some((url) => url.includes(shas.at(-1))), false);
});

test("commit-file metadata fails closed when it is malformed, unresolved, or demonstrably truncated", async () => {
  const sha = "e".repeat(40);
  const cases = [
    ["malformed files", { sha, commit: { message: "feat(app/login): Add login" }, files: null }, /malformed file metadata/],
    ["unresolved SHA", { sha: "f".repeat(40), commit: { message: "feat(app/login): Add login" }, files: [] }, /unresolved or does not match/],
    ["malformed pagination", { sha, commit: { message: "feat(app/login): Add login" }, files: Array.from({ length: 101 }, () => ({ filename: "teleferico-app/src/login.tsx" })) }, /malformed file pagination/],
  ];
  for (const [name, body, expected] of cases) {
    mockFetch(() => response(200, body));
    await assert.rejects(governance.fetchGitHubCommitWithFiles(config(), sha), expected, name);
  }

  mockFetch((url) => response(200, {
    sha,
    commit: { message: "feat(app/login): Add login" },
    files: Array.from({ length: 100 }, (_, index) => ({ filename: `teleferico-app/src/${url.includes("page=30") ? 2900 + index : index}.tsx` })),
  }));
  await assert.rejects(governance.fetchGitHubCommitWithFiles(config(), sha), /demonstrably truncated/);
});

test("pull request commit listing paginates at 100 entries and propagates invalid responses", async () => {
  const requests = [];
  mockFetch((url) => {
    requests.push(url);
    if (url.includes("&page=1")) return response(200, Array.from({ length: 100 }, (_, index) => ({ sha: `${index}` })));
    if (url.includes("&page=2")) return response(200, [{ sha: "last" }]);
    throw new Error(`Unexpected request ${url}`);
  });
  const commits = await governance.listPullRequestCommits(config(), 42);
  assert.equal(commits.length, 101);
  assert.equal(requests.length, 2);

  mockFetch(() => response(503, {}));
  await assert.rejects(governance.listPullRequestCommits(config(), 42), /GitHub GET .*\/pulls\/42\/commits.*status 503/);

  mockFetch(() => response(200, {}));
  await assert.rejects(governance.listPullRequestCommits(config(), 42), /commits response for pull request #42 must be an array/);
});

test("pull request commit listing fails closed at GitHub's 250-commit cap", async () => {
  const requests = [];
  mockFetch((url) => {
    requests.push(url);
    if (url.includes("&page=1") || url.includes("&page=2")) return response(200, Array.from({ length: 100 }, (_, index) => ({ sha: `${url.at(-1)}-${index}` })));
    if (url.includes("&page=3")) return response(200, Array.from({ length: 50 }, (_, index) => ({ sha: `3-${index}` })));
    throw new Error(`Unexpected request ${url}`);
  });
  await assert.rejects(governance.listPullRequestCommits(config(), 42), /250-commit API cap/);
  assert.equal(requests.length, 3);
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

test("trusted stacked child previews explicitly no-op before any mutation read", async () => {
  let calls = 0;
  mockFetch(() => { calls += 1; return response(200, {}); });
  await governance.syncPrMutations(stackedPreviewConfig());
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

test("merged main promotions keep advanced issues open and record the phased delivery", async () => {
  const comments = [];
  const requests = [];
  mockFetch((url, options) => {
    requests.push([url, options.method]);
    if (url.endsWith("/191")) return response(200, { number: 191, html_url: "https://github.com/acme/teleferico/issues/191" });
    if (url.includes("api.notion.com") && options.method === "POST") return response(200, { results: [item()], has_more: false });
    if (url.includes("/191/comments?")) return response(200, comments);
    if (url.endsWith("/191/comments") && options.method === "POST") { comments.push({ body: JSON.parse(options.body).body }); return response(201, {}); }
    throw new Error(`Unexpected request ${url}`);
  });
  await governance.syncPrMutations(config({
    pullRequest: { number: 44, headRef: "staging", baseRef: "main", action: "closed", merged: true },
    renderMarkdown: async () => "<p>Advances #191</p><h2>Related Issues</h2><p>Refs #191</p>",
  }));
  assert.equal(requests.some(([url, method]) => url.includes("api.notion.com/v1/pages/") && method === "PATCH"), false);
  assert.ok(comments.some((comment) => comment.body.includes("Advanced by: #44") && comment.body.includes("role=Advanced by")));
  assert.equal(comments.some((comment) => comment.body.includes("Shipped by")), false);
});

test("workflow serializes only trusted sync runs for the same PR", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const validateJob = workflow.match(/validate-pr-policy:[\s\S]*?(?=\n\S|$)/)?.[0] || "";
  const syncJob = workflow.match(/trusted-pr-sync:[\s\S]*?(?=\n\S|$)/)?.[0] || "";
  assert.match(syncJob, /concurrency:\n\s+group: backlog-governance-pr-\$\{\{ github\.event\.pull_request\.number \}\}/);
  assert.doesNotMatch(workflow, /^concurrency:/m);
  assert.match(validateJob, /ref: \$\{\{ github\.event\.repository\.default_branch \}\}/);
  assert.match(validateJob, /PR_HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \|\| inputs\.pr_head_sha \}\}/);
  assert.match(validateJob, /PR_BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \|\| inputs\.pr_base_sha \}\}/);
  assert.match(validateJob, /PR_DRAFT: \$\{\{ github\.event\.pull_request\.draft \|\| inputs\.pr_draft \}\}/);
  assert.match(validateJob, /PR_BASE_REPOSITORY: \$\{\{ github\.event\.pull_request\.base\.repo\.full_name \|\| inputs\.pr_base_repository \}\}/);
  assert.match(syncJob, /if: github\.event_name == 'pull_request_target' && github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
  assert.match(syncJob, /ref: \$\{\{ github\.event\.repository\.default_branch \}\}/);
  assert.match(syncJob, /needs: \[governance-tests, validate-pr-policy\]/);
  assert.match(workflow, /name: Governance tests/);
  assert.match(workflow, /types: \[opened, reopened, edited, synchronize, converted_to_draft, ready_for_review, closed\]/);
});

test("documentation identifies append-only issue comments as authoritative", () => {
  const docs = fs.readFileSync(docsPath, "utf8");
  const conventions = fs.readFileSync(conventionsPath, "utf8");
  const contract = fs.readFileSync(issueContractPath, "utf8");
  assert.match(docs, /append-only issue comments/i);
  assert.match(docs, /Included Implementation PRs/);
  assert.match(conventions, /Prior staging validation evidence/);
  assert.match(conventions, /Release candidate SHA/);
  assert.match(conventions, /Advancement Finalization/);
  assert.match(contract, /authoritative mechanism for new synchronization/i);
  assert.doesNotMatch(contract, /managed:related-prs:start/);
});
