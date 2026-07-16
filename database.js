const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "repos.json");

// Load or initialize the database
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error loading database:", err);
  }
  return { repos: [] };
}

// Save the database
function saveDB(db) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving database:", err);
  }
}

// Add a repository
function addRepo({ name, url, platform, channel }) {
  const db = loadDB();

  // Check if repo already exists
  const existing = db.repos.find(
    (r) => r.url.toLowerCase() === url.toLowerCase()
  );
  if (existing) {
    return { success: false, message: "This repository is already being tracked." };
  }

  const repo = {
    id: Date.now().toString(),
    name,
    url,
    platform, // "github" or "gitlab"
    channel,
    addedAt: new Date().toISOString(),
  };

  db.repos.push(repo);
  saveDB(db);
  return { success: true, repo };
}

// Remove a repository by URL or name
function removeRepo(identifier) {
  const db = loadDB();
  const index = db.repos.findIndex(
    (r) =>
      r.url.toLowerCase() === identifier.toLowerCase() ||
      r.name.toLowerCase() === identifier.toLowerCase()
  );

  if (index === -1) {
    return { success: false, message: "Repository not found." };
  }

  const removed = db.repos.splice(index, 1)[0];
  saveDB(db);
  return { success: true, repo: removed };
}

// List all repos (optionally filtered by channel)
function listRepos(channel) {
  const db = loadDB();
  if (channel) {
    return db.repos.filter((r) => r.channel === channel);
  }
  return db.repos;
}

// Get a repo by name or URL
function getRepo(identifier) {
  const db = loadDB();
  return db.repos.find(
    (r) =>
      r.url.toLowerCase() === identifier.toLowerCase() ||
      r.name.toLowerCase() === identifier.toLowerCase()
  );
}

module.exports = { addRepo, removeRepo, listRepos, getRepo };
