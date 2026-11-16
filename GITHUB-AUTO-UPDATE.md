# Automatic updates

Code updates and public record publication are separate.

## One-time Windows setup
Install Git (https://git-scm.com/download/win) and GitHub CLI (https://cli.github.com).
In Command Prompt run:
```
gh auth login
git clone https://github.com/Bekono27/fbst.git
```
Choose GitHub.com and browser authentication. Use an account with Contents write access to Bekono27/fbst. Never put tokens in the repository.

If you already use a ZIP download, close the running app, back up its User-Workspace/data directory, clone into a NEW directory, then copy that data directory into the clone's User-Workspace/data before launching. Keep the original backup. Do not replace a running database.

## Launch
- START-WINDOWS.cmd: fast-forward code update on startup, then run locally.
- START-PUBLISHING-WINDOWS.cmd: same startup plus publish public records every 60 seconds while running.

The publishing launcher explicitly enables public sharing. Normal startup does not publish.

Updates require a clean main branch and the expected origin. They never reset, delete or overwrite local edits. Offline or divergent updates are skipped and existing code launches. ZIP copies cannot auto-update code. Stop the old app before starting a new instance.

## Published information
Only completed Pages with numeric IDs: name, bio, ID, canonical link, completion status and update timestamp.
Only groups marked public: name, URL, group ID, visibility, member count, timestamp.
No private or unknown groups, portfolio names, notes, draft identities, browser profiles, credentials, SQLite files, or access tokens are uploaded.

The publisher merges public-records.json using GitHub's existing file SHA. Concurrent edits cause a retry on the next interval, not a forced overwrite. Other remote records are retained. This is append/update publication: changing a group to private or deleting a local record does NOT remove historical public copies. Remove unwanted published records from public-records.json separately; Git history may retain prior content.

The website reads this public file after GitHub Pages deployment. GitHub deploys can take several minutes; syncing is not instantaneous. The Sync panel displays publishing status and errors.

Only code pulls from GitHub into the local folder. Online records are NOT imported into the local database. Use one publishing computer per workspace to avoid competing edits to the same record.

The existing authenticated online mirror remains a separate option. It is not required for this public GitHub publication.
