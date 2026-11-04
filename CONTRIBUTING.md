# Team workflow

## Branches

| Branch | Purpose | Who merges |
| --- | --- | --- |
| `main` | Always working, deployed (Vercel + Render auto-deploy) | Team lead only, from `develop` |
| `develop` | Integration branch; all features merge here | Team lead after review |
| `feature/F<id>-<short-name>` | One feature, e.g. `feature/F1-auth` | Author opens PR to `develop` |
| `fix/<short-name>` | Bug fix | Author opens PR to `develop` |

Nobody pushes directly to `main` or `develop`.

## Daily flow for each member

```bash
# 1. Start from the latest develop
git checkout develop
git pull origin develop

# 2. Create your branch
git checkout -b feature/F4-manual-cards

# 3. Work and commit in small steps
git add .
git commit -m "feat(cards): add create card route"

# 4. Before opening a PR, bring in teammates' changes
git pull origin develop      # fix any conflicts, then run tests

# 5. Push and open a Pull Request into develop on GitHub
git push -u origin feature/F4-manual-cards
```

After the PR is merged, delete the branch and start the next one from `develop` again.

## Commit messages

Format: `type(scope): what changed`

| Type | Use for |
| --- | --- |
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | README, comments |
| `style` | Formatting, CSS only |
| `refactor` | Code change without behaviour change |
| `test` | Adding tests |
| `chore` | Dependencies, config |

Examples: `feat(auth): add JWT login`, `fix(sm2): round interval correctly`, `test(sm2): add Good x3 case`.

## Pull requests

- One PR per feature; keep it small enough to review in 15 minutes.
- Title like the commit format: `feat(F4): manual flashcards`.
- Fill in the PR template, link the issue (`Closes #12`).
- At least 1 approval and green CI before merge.
- Use **Squash and merge** so `develop` has one commit per feature.

## Database changes

Models live in `server/src/models/`. Change a model only in your feature branch and mention it in the PR, because other routes may depend on the field names. Everyone uses their own database name in `MONGODB_URI` (e.g. `ai-study-planner-rahul`), so test data never mixes. The production database is used only by Render.

## Secrets

Never commit `.env`. Add new variables to `.env.example` with a placeholder value.
