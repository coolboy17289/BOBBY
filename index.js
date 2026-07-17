require("dotenv").config();
const axios = require("axios");
const cron = require("node-cron");
const { App } = require("@slack/bolt");
const { addRepo, removeRepo, listRepos, getRepo } = require("./database");
const github = require("./github");
const gitlab = require("./gitlab");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

// Helper: detect platform from URL
function detectPlatform(url) {
  if (url.includes("github.com")) return "github";
  if (url.includes("gitlab.com")) return "gitlab";
  return null;
}

// Helper: get commits from any platform
async function getCommits(url, count = 5) {
  const platform = detectPlatform(url);
  if (platform === "github") return github.getCommits(url, count);
  if (platform === "gitlab") return gitlab.getCommits(url, count);
  throw new Error("Unsupported platform. Use GitHub or GitLab URLs.");
}

// Helper: get structure from any platform
async function getStructure(url, path = "") {
  const platform = detectPlatform(url);
  if (platform === "github") return github.getStructure(url, path);
  if (platform === "gitlab") return gitlab.getStructure(url, path);
  throw new Error("Unsupported platform. Use GitHub or GitLab URLs.");
}

// ═══════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════

// /bobby-ping — respond with Pong
app.command("/bobby-ping", async ({ ack, respond }) => {
  try {
    await ack();
    await respond({ text: "Pong! 🏓" });
  } catch (err) {
    console.error("Error in /bobby-ping:", err);
    try {
      await respond({ text: "⚠️ Something went wrong with the ping command." });
    } catch (respondErr) {
      console.error("Failed to send error response:", respondErr);
    }
  }
});

// /bobby-catfact — fetch a random cat fact
app.command("/bobby-catfact", async ({ ack, respond }) => {
  try {
    await ack();
    const response = await axios.get("https://catfact.ninja/fact");
    await respond({ text: `🐱 Cat Fact:\n${response.data.fact}` });
  } catch (err) {
    console.error("Error in /bobby-catfact:", err);
    try {
      await respond({ text: "⚠️ Failed to fetch a cat fact. Please try again later." });
    } catch (respondErr) {
      console.error("Failed to send error response:", respondErr);
    }
  }
});

// /bobby-add — add a repository to track
app.command("/bobby-add", async ({ command, ack, respond }) => {
  try {
    await ack();

    const url = command.text.trim();
    if (!url) {
      await respond({ text: "⚠️ Usage: `/bobby-add <github-or-gitlab-url>`" });
      return;
    }

    const platform = detectPlatform(url);
    if (!platform) {
      await respond({
        text: "Unsupported platform. Please provide a GitHub or GitLab repository URL.",
      });
      return;
    }

    // Extract repo name from URL
    const nameMatch = url.match(/\/([^/]+?)(?:\.git)?$/);
    const name = nameMatch ? nameMatch[1] : url;

    const result = addRepo({
      name,
      url,
      platform,
      channel: command.channel_id,
    });

    if (result.success) {
      await respond({
        text: `✅ Now tracking *${result.repo.name}* (${platform})\n${url}`,
      });
    } else {
      await respond({ text: ` ${result.message}` });
    }
  } catch (err) {
    console.error("Error in /bobby-add:", err);
    try {
      await respond({ text: " Failed to add repository." });
    } catch (respondErr) {
      console.error("Failed to send error response:", respondErr);
    }
  }
});

// /bobby-remove — remove a tracked repository
app.command("/bobby-remove", async ({ command, ack, respond }) => {
  try {
    await ack();

    const identifier = command.text.trim();
    if (!identifier) {
      await respond({ text: "Usage: `/bobby-remove <repo-name-or-url>`" });
      return;
    }

    const result = removeRepo(identifier);
    if (result.success) {
      await respond({
        text: `Stopped tracking *${result.repo.name}*`,
      });
    } else {
      await respond({ text: ` ${result.message}` });
    }
  } catch (err) {
    console.error("Error in /bobby-remove:", err);
    try {
      await respond({ text: "Failed to remove repository." });
    } catch (respondErr) {
      console.error("Failed to send error response:", respondErr);
    }
  }
});

// /bobby-repos — list all tracked repositories
app.command("/bobby-repos", async ({ ack, respond }) => {
  try {
    await ack();

    const repos = listRepos();
    if (repos.length === 0) {
      await respond({
        text: "No repositories being tracked yet.\nUse `/bobby-add <url>` to add one!",
      });
      return;
    }

    const lines = repos.map((r, i) => {
      const icon = r.platform === "github" ? "" : "";
      return `${i + 1}. ${icon} *${r.name}* — ${r.url}`;
    });

    await respond({
      text: ` *Tracked Repositories* (${repos.length})\n\n${lines.join("\n")}`,
    });
  } catch (err) {
    console.error("Error in /bobby-repos:", err);
    try {
      await respond({ text: " Failed to list repositories." });
    } catch (respondErr) {
      console.error("Failed to send error response:", respondErr);
    }
  }
});

// /bobby-commits — show recent commits from a repo
app.command("/bobby-commits", async ({ command, ack, respond }) => {
  try {
    await ack();

    const input = command.text.trim();
    if (!input) {
      await respond({
        text: " Usage: `/bobby-commits <repo-name-or-url> [count]`",
      });
      return;
    }

    // Parse input: could be "repo-name 10" or just "repo-name"
    const parts = input.split(/\s+/);
    const identifier = parts[0];
    const count = parseInt(parts[1]) || 5;

    const repo = getRepo(identifier);
    if (!repo) {
      await respond({
        text: " Repository not found. Use `/bobby-repos` to see tracked repos.",
      });
      return;
    }

    const commits = await getCommits(repo.url, count);
    if (commits.length === 0) {
      await respond({ text: "No commits found for this repository." });
      return;
    }

    const lines = commits.map(
      (c) => `• \`${c.sha}\` ${c.message}\n  _${c.author} — ${c.date}_`
    );

    await respond({
      text: `*Recent Commits — ${repo.name}* (${commits.length})\n\n${lines.join("\n\n")}`,
    });
  } catch (err) {
    console.error("Error in /bobby-commits:", err);
    try {
      await respond({ text: "Failed to fetch commits." });
    } catch (respondErr) {
      console.error("Failed to send error response:", respondErr);
    }
  }
});

// /bobby-structure — show the file tree of a repo
app.command("/bobby-structure", async ({ command, ack, respond }) => {
  try {
    await ack();

    const input = command.text.trim();
    if (!input) {
      await respond({
        text: " Usage: `/bobby-structure <repo-name-or-url> [path]`",
      });
      return;
    }

    const parts = input.split(/\s+/);
    const identifier = parts[0];
    const subPath = parts.slice(1).join("/") || "";

    const repo = getRepo(identifier);
    if (!repo) {
      await respond({
        text: "Repository not found. Use `/bobby-repos` to see tracked repos.",
      });
      return;
    }

    const items = await getStructure(repo.url, subPath);
    if (items.length === 0) {
      await respond({ text: "No files found at this path." });
      return;
    }

    const lines = items.map((item) => {
      const icon = item.type === "dir" ? "📁" : "📄";
      return `${icon} ${item.name}`;
    });

    const pathDisplay = subPath ? `/${subPath}` : "/";
    await respond({
      text: `📂 *${repo.name}* — \`${pathDisplay}\`\n\n${lines.join("\n")}`,
    });
  } catch (err) {
    console.error("Error in /bobby-structure:", err);
    try {
      await respond({ text: "Failed to fetch repository structure." });
    } catch (respondErr) {
      console.error("Failed to send error response:", respondErr);
    }
  }
});

// /bobby-help — list available commands
app.command("/bobby-help", async ({ ack, respond }) => {
  try {
    await ack();
    const helpText = [
      "*Bobby Bot — Available Commands*",
      "",
      "*Fun*",
      "• `/bobby-ping` — Check if the bot is alive",
      "• `/bobby-catfact` — Get a random cat fact",
      "",
      "*Repository Tracking*",
      "• `/bobby-add <url>` — Track a GitHub/GitLab repo",
      "• `/bobby-remove <name>` — Stop tracking a repo",
      "• `/bobby-repos` — List all tracked repos",
      "• `/bobby-commits <repo> [count]` — View recent commits",
      "• `/bobby-structure <repo> [path]` — View file tree",
      "",
      "*Info*",
      "• `/bobby-help` — Show this help message",
      "",
      "_Tip: Repos are auto-posted daily at 8am NZST!_",
    ].join("\n");
    await respond({ text: helpText });
  } catch (err) {
    console.error("Error in /bobby-help:", err);
  }
});

// ═══════════════════════════════════════════
// SCHEDULED: Daily commits at 8am NZST
// ═══════════════════════════════════════════

async function postDailyCommits() {
  const repos = listRepos();
  if (repos.length === 0) return;

  // Group repos by channel
  const byChannel = {};
  for (const repo of repos) {
    if (!byChannel[repo.channel]) byChannel[repo.channel] = [];
    byChannel[repo.channel].push(repo);
  }

  for (const [channelId, channelRepos] of Object.entries(byChannel)) {
    const sections = [];

    for (const repo of channelRepos) {
      try {
        const commits = await getCommits(repo.url, 5);
        if (commits.length === 0) {
          sections.push(`*${repo.name}*\n_No recent commits_`);
          continue;
        }

        const lines = commits.map(
          (c) => `• \`${c.sha}\` ${c.message}\n  _${c.author} — ${c.date}_`
        );
        sections.push(`*${repo.name}*\n${lines.join("\n")}`);
      } catch (err) {
        console.error(`Failed to fetch commits for ${repo.name}:`, err);
        sections.push(`*${repo.name}*\n_Failed to fetch commits_`);
      }
    }

    const message = ` *Daily Commit Summary — ${new Date().toLocaleDateString("en-NZ")}*\n\n${sections.join("\n\n")}`;

    try {
      await app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: channelId,
        text: message,
      });
    } catch (err) {
      console.error(`Failed to post daily summary to ${channelId}:`, err);
    }
  }
}

// Schedule: 8am NZST (UTC+12 = 20:00 UTC previous day, or UTC+13 during daylight saving)
// Using "0 8 * * *" with timezone set to Pacific/Auckland
cron.schedule("0 8 * * *", postDailyCommits, {
  timezone: "Pacific/Auckland",
});

console.log(" Scheduled daily commit summary at 8am NZST");

// ═══════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════

process.on("SIGINT", async () => {
  console.log("\nShutting down gracefully...");
  await app.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nReceived SIGTERM, shutting down...");
  await app.stop();
  process.exit(0);
});

// ═══════════════════════════════════════════
// START THE APP
// ═══════════════════════════════════════════

(async () => {
  try {
    await app.start();
    console.log("Bot is running!");
  } catch (err) {
    console.error("Failed to start bot:", err);
    process.exit(1);
  }
})();
