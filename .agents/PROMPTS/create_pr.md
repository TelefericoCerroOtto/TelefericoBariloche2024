$create-pull-request
Mode: create
Base branch: <BASE_BRANCH>
Remote: <REMOTE_NAME or origin by default>
Diff path: ./tmp/pr-diff.txt
Generate the PR title/description from committed-only diffs, use the current local branch as the default head branch, and ask for approval before any state-changing command. If the remote branch is stale relative to local committed state, ask for explicit push approval before PR creation.
