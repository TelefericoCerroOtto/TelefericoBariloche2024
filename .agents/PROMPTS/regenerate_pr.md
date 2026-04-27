$create-pull-request
Mode: regenerate
PR: <PR_NUMBER>
Remote: <REMOTE_NAME or origin by default when appropriate>
Diff path: ./tmp/pr-diff.txt
Regenerate the PR title/description from scratch using only the current net diff between the PR head and base branches. Ignore the prior PR title/body and branch-internal history as factual sources. Show the draft first and ask for approval before any state-changing command. If the chosen remote branch is stale relative to the committed local PR head state, ask for explicit push approval before PR update.
