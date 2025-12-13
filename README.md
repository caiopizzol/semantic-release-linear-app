# semantic-release-linear-app

A [semantic-release](https://github.com/semantic-release/semantic-release) plugin that adds version labels to Linear issues based on branch names.

## Install

```bash
npm install --save-dev semantic-release-linear-app
```

## Setup

1. Add to your `.releaserc.json`:

```json
{
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["semantic-release-linear-app", {
      "teamKeys": ["ENG", "FEAT"]
    }],
    "@semantic-release/github"
  ]
}
```

2. Set `LINEAR_API_KEY` environment variable (create at Linear Settings > API)

3. Use branch names with Linear issue IDs:

```
feature/ENG-123-add-auth
bugfix/FEAT-456-fix-bug
ENG-789
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `teamKeys` | `[]` | Team keys to filter (e.g., `["ENG"]`) |
| `labelPrefix` | `"v"` | Prefix for version labels |
| `removeOldLabels` | `true` | Remove previous version labels |
| `addComment` | `false` | Add release comment to issues |
| `dryRun` | `false` | Preview without making changes |

## Labels

Labels are created based on version and channel:

- Default channel: `v1.2.3`
- Beta/next channels: `v1.2.3-beta`, `v1.2.3-next`

Colors indicate release type: red (major), orange (minor), green (patch), purple (prerelease).

## License

MIT

<!-- SD-1135 e2e test v2 -->
