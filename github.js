const axios = require("axios");

const GITHUB_API = "https://api.github.com";

// Parse a GitHub URL into owner/repo
function parseGitHubUrl(url) {
  // Support formats:
  // https://github.com/owner/repo
  // https://github.com/owner/repo.git
  const match = url.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

// Get recent commits from a GitHub repo
async function getCommits(url, count = 5) {
  const parsed = parseGitHubUrl(url);
  if (!parsed) throw new Error("Invalid GitHub URL");

  const headers = {};
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }

  const response = await axios.get(
    `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}/commits`,
    {
      headers,
      params: { per_page: count },
      timeout: 10000,
    }
  );

  return response.data.map((commit) => ({
    sha: commit.sha.substring(0, 7),
    message: commit.commit.message.split("\n")[0],
    author: commit.commit.author.name,
    date: new Date(commit.commit.author.date).toLocaleDateString("en-NZ"),
    url: commit.html_url,
  }));
}

// Get the file tree of a GitHub repo
async function getStructure(url, path = "") {
  const parsed = parseGitHubUrl(url);
  if (!parsed) throw new Error("Invalid GitHub URL");

  const headers = {};
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }

  const response = await axios.get(
    `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}/contents/${path}`,
    {
      headers,
      timeout: 10000,
    }
  );

  // Sort: directories first, then files
  const items = response.data
    .sort((a, b) => {
      if (a.type === "dir" && b.type !== "dir") return -1;
      if (a.type !== "dir" && b.type === "dir") return 1;
      return a.name.localeCompare(b.name);
    })
    .map((item) => ({
      name: item.name,
      type: item.type, // "file" or "dir"
      path: item.path,
    }));

  return items;
}

module.exports = { parseGitHubUrl, getCommits, getStructure };
