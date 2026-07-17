# 🤖 Bobby Bot — Command Reference

All commands are Slack slash commands. Type them in any channel where the bot is present.

---

## 🎮 Fun Commands

| Command | Description |
|---------|-------------|
| `/bobby-ping` | Check if the bot is alive. Responds with "Pong! 🏓" |
| `/bobby-catfact` | Fetches and displays a random cat fact from the Cat Facts API |

---

## 📦 Repository Tracking

| Command | Description |
|---------|-------------|
| `/bobby-add <url>` | Track a GitHub or GitLab repository for daily commit summaries |
| `/bobby-remove <name>` | Stop tracking a repository by name or URL |
| `/bobby-repos` | List all repositories currently being tracked in this channel |
| `/bobby-commits <repo> [count]` | View recent commits from a tracked repo (default: 5 commits) |
| `/bobby-structure <repo> [path]` | View the file tree of a tracked repo (optional subfolder path) |

### Examples

```
/bobby-add https://github.com/facebook/react
/bobby-add https://gitlab.com/gitlab-org/gitlab
/bobby-remove react
/bobby-commits react 10
/bobby-structure react src
/bobby-structure react src/components
```

---

## ℹ️ Info Commands

| Command | Description |
|---------|-------------|
| `/bobby-help` | Show the help message with all available commands |

---

## ⏰ Scheduled Features

| Feature | Description |
|---------|-------------|
| **Daily Commit Summary** | Automatically posts recent commits from all tracked repos every day at **8:00 AM NZST** |

---

## 📝 Notes

- Repositories are tracked **per channel** — each channel has its own list
- Supported platforms: **GitHub** and **GitLab** only
- The bot uses Socket Mode (no public URL required)
- Daily summaries show the last 5 commits from each tracked repo
