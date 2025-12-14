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

2. Set `LINEAR_TOKEN` environment variable (see [Authentication](#authentication) below)

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

## Authentication

Set `LINEAR_TOKEN` environment variable with either:

### API Key (Simple)
Actions appear as your personal account.
1. Go to Linear Settings > API > Personal API keys
2. Create new key
3. Set as `LINEAR_TOKEN`

### OAuth Access Token (Recommended for CI)
Actions appear as your app name instead of a user.
1. Go to Linear Settings > API > Applications
2. Create new application, enable "Client credentials tokens"
3. Use client credentials to get an access token ([docs](https://linear.app/developers/oauth-2-0-authentication))
4. Set the access token as `LINEAR_TOKEN`

## License

MIT