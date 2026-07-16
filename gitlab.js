const axios = require("axios");

const GITLAB_API = "https://gitlab.com/api/v4";

// Parse a GitLab URL into project path
function parseGitLabUrl(url) {
  // Support formats:
  // https://gitlab.com/owner/repo
  // https://gitlab.com/group/subgroup/repo
  const match = url.match(/gitlab\.com\/(.+?)(?:\.git)?$/);
  if (!match) return null;
  // Encode the path for the API
  return encodeURIComponent(match[1]);
}

// Get recent commits from a GitLab repo
async function getCommits(url, count = 5) {
  const projectId = parseGitLabUrl(url);
  if (!projectId) throw new Error("Invalid GitLab URL");

  const headers = {};
  if (process.env.GITLAB_TOKEN) {
    headers["PRIVATE-TOKEN"] = process.env.GITLAB_TOKEN;
  }

  const response = await axios.get(
    `${GITLAB_API}/projects/${projectId}/repository/commits`,
    {
      headers,
      params: { per_page: count },
      timeout: 10000,
    }
  );

  return response.data.map((commit) => ({
    sha: commit.short_id,
    message: commit.message.split("\n")[0],
    author: commit.author_name,
    date: new Date(commit.authored_date).toLocaleDateString("en-NZ"),
    url: commit.web_url,
  }));
}

// Get the file tree of a GitLab repo
async function getStructure(url, path = "", ref = "main") {
  const projectId = parseGitLabUrl(url);
  if (!projectId) throw new Error("Invalid GitLab URL");

  const headers = {};
  if (process.env.GITLAB_TOKEN) {
    headers["PRIVATE-TOKEN"] = process.env.GITLAB_TOKEN;
  }

  const response = await axios.get(
    `${GITLAB_API}/projects/${projectId}/repository/tree`,
    {
      headers,
      params: { path, ref, per_page: 100 },
      timeout: 10000,
    }
  );

  // Sort: directories first, then files
  const items = response.data
    .sort((a, b) => {
      if (a.type === "tree" && b.type !== "tree") return -1;
      if (a.type !== "tree" && b.type === "tree") return 1;
      return a.name.localeCompare(b.name);
    })
    .map((item) => ({
      name: item.name,
      type: item.type === "tree" ? "dir" : "file",
      path: item.path,
    }));

  return items;
}

module.exports = { parseGitLabUrl, getCommits, getStructure };
