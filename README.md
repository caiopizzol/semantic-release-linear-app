# semantic-release-linear

> A [semantic-release](https://github.com/semantic-release/semantic-release) plugin that updates Linear issues with version labels based on branch names.

## Features

- 🌿 Extracts Linear issue IDs from branch names
- 🏷️ Automatically adds version labels to Linear issues
- 🎨 Color-coded labels based on release type
- 🧹 Removes old version labels (configurable)
- 💬 Adds release comments to issues (optional)
- ⚡ Batch operations for efficiency
- 📝 Full TypeScript support

## Install

```bash
npm install --save-dev semantic-release-linear
```

## Quick Start

1. **Configure semantic-release** (`.releaserc.json`):

```json
{
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["semantic-release-linear", {
      "teamKeys": ["ENG", "FEAT", "BUG"]
    }],
    "@semantic-release/github"
  ]
}
```

2. **Set your Linear API key**:

```bash
export LINEAR_API_KEY=lin_api_xxx
```

3. **Use proper branch names**:

```bash
git checkout -b feature/ENG-123-add-authentication
git checkout -b bugfix/FEAT-456-fix-validation
git checkout -b ENG-789-quick-fix
```

That's it! When semantic-release creates a release from these branches, the corresponding Linear issues will be labeled with the version number.

## Configuration

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `apiKey` | - | Linear API key (or use `LINEAR_API_KEY` env var) |
| `teamKeys` | `[]` | Team keys to filter (e.g., `["ENG", "FEAT"]`) |
| `labelPrefix` | `"v"` | Prefix for version labels |
| `removeOldLabels` | `true` | Remove previous version labels |
| `addComment` | `false` | Add a release comment to issues |
| `skipBranches` | `["main", "master", "develop", "staging", "production"]` | Branches to skip unless they contain issues |
| `requireIssueInBranch` | `true` | Only process branches with Linear issues |
| `dryRun` | `false` | Preview without making changes |

### TypeScript Configuration

```typescript
// .releaserc.ts
import type { PluginConfig } from 'semantic-release-linear';

const config: PluginConfig = {
  teamKeys: ['ENG', 'FEAT'],
  labelPrefix: 'release-',
  addComment: true,
  skipBranches: ['main', 'develop']
};

export default {
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    ['semantic-release-linear', config],
    '@semantic-release/github'
  ]
};
```

## Branch Naming Convention

### Recommended Patterns

```bash
# Feature branches
feature/ENG-123-user-authentication
feature/FEAT-456-payment-integration

# Bug fixes
bugfix/BUG-789-login-error
fix/ENG-101-memory-leak

# Hotfixes
hotfix/ENG-102-critical-security-patch

# Simple format (still works)
ENG-103-quick-update
FEAT-104
```

### Multiple Issues in One Branch

If you need to update multiple issues, include them all in the branch name:

```bash
feature/ENG-123-FEAT-456-combined-update
```

### Enforce Branch Naming

Use Git hooks or CI checks to enforce the naming convention:

```bash
#!/bin/bash
# .git/hooks/pre-push or CI script

branch=$(git rev-parse --abbrev-ref HEAD)
pattern="^(feature|bugfix|fix|hotfix)/[A-Z]+-[0-9]+|^[A-Z]+-[0-9]+"

if ! [[ "$branch" =~ $pattern ]]; then
  echo "❌ Branch name must include a Linear issue ID"
  echo "   Example: feature/ENG-123-description"
  exit 1
fi
```

## How It Works

1. **Branch Detection**: When semantic-release runs, it reads the current branch name
2. **Issue Extraction**: Extracts Linear issue IDs (e.g., `ENG-123`) from the branch
3. **Label Creation**: Creates a version label if needed (e.g., `v1.2.3`)
4. **Issue Update**: Applies the label to the Linear issue(s)
5. **Cleanup**: Optionally removes old version labels

### Label Colors

Labels are color-coded by release type:

- 🔴 **Major** (breaking changes) - Red
- 🟠 **Minor** (new features) - Orange  
- 🟢 **Patch** (bug fixes) - Green
- 🟣 **Prerelease** - Purple

## Dry Run Mode

Test what will happen without making changes:

```javascript
{
  "plugins": [
    ["semantic-release-linear", {
      "dryRun": true
    }]
  ]
}
```

Output:
```
[semantic-release] [semantic-release-linear] Found 1 Linear issue(s) in branch "feature/ENG-123-auth": ENG-123
[semantic-release] [semantic-release-linear] [Dry run] Would update issues: ["ENG-123"]
[semantic-release] [semantic-release-linear] [Dry run] Would apply label: v1.2.3
```

## Linear API Setup

1. Go to **Linear Settings** → **API** → **Personal API keys**
2. Create a new key with **write** access
3. Add to your CI environment as `LINEAR_API_KEY`

## CI Examples

### GitHub Actions

```yaml
name: Release

on:
  push:
    branches: [main, next]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          
      - name: Install dependencies
        run: npm ci
        
      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          LINEAR_API_KEY: ${{ secrets.LINEAR_API_KEY }}
        run: npx semantic-release
```

## FAQ

### Why only branch names?

Extracting from commits is unreliable - developers forget, commits get squashed, and there's no enforcement. Branch names are:
- Required for every PR
- Easily enforced via Git hooks
- Visible in PR lists
- A single source of truth

### What about releases from main/master?

You have three options:

1. **Skip them** (default): Set `requireIssueInBranch: true`
2. **Tag main with an issue**: `git checkout main-ENG-123`  
3. **Allow all branches**: Set `requireIssueInBranch: false`

### Can I update multiple issues?

Yes, include multiple issue IDs in your branch name:
```bash
feature/ENG-123-FEAT-456-big-feature
```

### What if my branch doesn't have an issue?

The plugin will skip it (unless `requireIssueInBranch: false`). This is intentional - not every release needs to update Linear.

## Troubleshooting

### Issues not being detected

1. Check branch name: `git rev-parse --abbrev-ref HEAD`
2. Verify format matches: `TEAM-NUMBER`
3. Check team keys filter if configured
4. Run with `dryRun: true` to debug

### API errors

- Verify API key has write access
- Check Linear workspace permissions
- Ensure network connectivity in CI

## License

MIT