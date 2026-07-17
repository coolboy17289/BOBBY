# Bobby Bot

## Overview

Bobby is a Slack bot that keeps teams informed about GitHub and GitLab activity. It sends daily summaries of commits and allows users to check repository details directly from Slack.

## Features

- Daily commit summaries at 8:00 AM NZST
- Support for GitHub and GitLab
- Repository tracking for each channel
- View commits and file structures
- Works with Slack Socket Mode, no public URL needed

## Commands

| Command | Description |
|---|---|
| `/bobby-add <url>` | Add a repository |
| `/bobby-remove <name>` | Remove a repository |
| `/bobby-repos` | List tracked repositories |
| `/bobby-commits <repo> [count]` | View recent commits |
| `/bobby-structure <repo> [path]` | Browse file structure |
| `/bobby-ping` | Check bot status |
| `/bobby-catfact` | Get a random cat fact |
| `/bobby-help` | Show commands |