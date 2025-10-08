# semantic-release-linear-app

> A [semantic-release](https://github.com/semantic-release/semantic-release) plugin to automatically update Linear issues with version labels when they're included in releases.

## Features

- 🏷️ Automatically adds version labels to Linear issues mentioned in commits
- 🎨 Color-coded labels based on release type (major/minor/patch)
- 🧹 Optionally removes old version labels to keep issues clean
- 💬 Can add release comments to issues (optional)
- 🔍 Configurable team key filtering
- ⚡ Batch operations for efficiency
- 📝 Full TypeScript support with type definitions

## Install

```bash
npm install --save-dev semantic-release-linear-app
```

## Usage

Add the plugin to your semantic-release configuration:

```json
{
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["semantic-release-linear-app", {
      "apiKey": "lin_api_xxx"
    }],
    "@semantic-release/github"
  ]
}
```

### TypeScript Configuration

If you're using TypeScript for your configuration, the plugin exports types:

```typescript
import type { PluginConfig } from 'semantic-release-linear-app';

const config: PluginConfig = {
  apiKey: process.env.LINEAR_API_KEY,
  teamKeys: ['ENG', 'FEAT'],
  labelPrefix: 'v',
  removeOldLabels: true,
  addComment: false
};
```

## Configuration

### Authentication

Set your Linear API key via environment variable:

```bash
export LINEAR_API_KEY=lin_api_xxx
```

Or pass it in the plugin configuration:

```json
{
  "apiKey": "lin_api_xxx"
}
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `apiKey` | - | Linear API key (or use `LINEAR_API_KEY` env var) |
| `teamKeys` | `[]` | Array of team keys to filter issues (e.g., `["ENG", "FEAT"]`) |
| `labelPrefix` | `"v"` | Prefix for version labels |
| `removeOldLabels` | `true` | Remove previous version labels from issues |
| `addComment` | `false` | Add a comment to issues with release info |
| `dryRun` | `false` | Preview changes without updating Linear |

### Example Configuration

```javascript
// .releaserc.js
module.exports = {
  branches: ['main', 'next'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    ['semantic-release-linear-app', {
      teamKeys: ['ENG', 'FEAT', 'BUG'],
      labelPrefix: 'version:',
      removeOldLabels: true,
      addComment: true
    }],
    '@semantic-release/npm',
    '@semantic-release/github'
  ]
};
```

## How It Works

1. **Issue Detection**: The plugin scans commit messages for Linear issue IDs (e.g., `ENG-123`)
2. **Label Creation**: Creates a version label if it doesn't exist (color-coded by release type)
3. **Issue Updates**: Applies the label to all detected issues
4. **Cleanup**: Optionally removes old version labels to avoid clutter

### Commit Message Examples

The plugin will detect Linear issues in various formats:

```bash
# In commit message
git commit -m "feat: add new feature ENG-123"

# In commit body
git commit -m "feat: add new feature" -m "Closes ENG-123"

# Multiple issues
git commit -m "fix: resolve bugs ENG-123, FEAT-456"

# In PR title (when squash merging)
"feat: add feature (#123) ENG-456"
```

### Label Colors

Labels are automatically color-coded based on the release type:

- 🔴 **Major** releases (breaking changes) - Red
- 🟠 **Minor** releases (new features) - Orange  
- 🟢 **Patch** releases (bug fixes) - Green
- 🟣 **Prerelease** versions - Purple

## Advanced Usage

### Channel-Specific Configuration

For different behavior on different release channels:

```javascript
// Coming in v2.0
{
  channelConfig: {
    next: {
      labelPrefix: 'next:',
      addComment: false
    },
    latest: {
      labelPrefix: 'stable:',
      addComment: true
    }
  }
}
```

### Dry Run

Test what issues would be updated without making changes:

```javascript
{
  dryRun: true
}
```

## Linear API Setup

1. Go to Linear Settings → API → Personal API keys
2. Create a new key with "write" access
3. Add to your CI environment as `LINEAR_API_KEY`

## CI Configuration

### GitHub Actions

```yaml
- name: Release
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
    LINEAR_API_KEY: ${{ secrets.LINEAR_API_KEY }}
  run: npx semantic-release
```

## Troubleshooting

### Issues not being detected

- Ensure issue IDs follow the format `TEAM-NUMBER` (e.g., `ENG-123`)
- Check that team keys match if using the `teamKeys` filter
- Verify the issues exist in Linear

### API errors

- Confirm your API key has write access
- Check that the Linear workspace is accessible
- Ensure network connectivity from CI environment

## License

MIT