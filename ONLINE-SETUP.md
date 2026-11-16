# AURANT online records

## What works

The Windows app remains the source of truth. It saves Page IDs, links, bios, categories, statuses and timestamps in SQLite. Groups are stored separately with explicit public/private visibility, member counts and notes. Groups can be imported as CSV, TSV or JSON with a column mapping preview. Export Excel or Google Sheets as CSV first. Imports validate the whole file before saving; duplicate Facebook group links are skipped, not silently overwritten. Group visibility comes from your sheet or chosen section, not from automatic Facebook inspection.

The online copy is a read-only mirror. It is not a Facebook editor. Saved changes in the platform do not automatically rename a live Facebook Page or change its bio.

## Deploy the backend once

GitHub Pages cannot run this service. Use a Node.js 24+ host with a persistent volume and HTTPS reverse proxy. Do not use ephemeral storage. No paid hosting account has been created or charged by this update.

Run `node User-Workspace/online-server.cjs` with these environment variables set in your hosting provider's secret/settings panel:

- `AURANT_WRITE_KEY`: a randomly generated secret of at least 32 characters, used only by the local app.
- `AURANT_READ_KEY`: a different randomly generated secret of at least 32 characters, used by the online viewer.
- `DATA_DIR`: the mounted persistent directory for `online.sqlite`.
- `HOST`: normally `0.0.0.0` on a managed host, or retain the default loopback behind a local reverse proxy.
- `PORT`: the host's assigned port, default 4180.
- `AURANT_ORIGINS`: comma-separated permitted website origins; defaults to `https://mnanalyze.com,https://bekono27.github.io`.

No npm dependencies are needed by this backend. Use HTTPS at the public hostname. Never commit keys, database files, or browser sessions. The backend exposes only `/snapshot`, authenticated on every read/write. Read keys cannot write. CORS is not authentication; the keys provide access. Anyone with the read key can read all mirrored records. This first version is a single-workspace mirror, not individual user accounts.

## Connect the local app

1. Update the repository, preserving `User-Workspace/data`.
2. Run `START-WINDOWS.cmd`.
3. Open **Онлайн холболт**, enter the backend's root HTTPS address and its write key.
4. Click **Холбох**. The app sends the first snapshot immediately and checks for changes every ten seconds while running.
5. Check the displayed last-sync timestamp. Errors remain visible and local records stay intact.

Configuration is stored in `User-Workspace/data/online-sync.json`, which is ignored by Git. Protect that directory; it contains the write key and browser session. On Windows, use your account's filesystem permissions. Changing computers requires moving this file with the database to preserve the writer identity. A second writer is rejected rather than silently replacing the first device's records. There is no destructive automatic pull/merge.

## View online

Visit https://mnanalyze.com/, open **Онлайн холболт**, and enter the backend address and read key. The key stays in browser memory and is forgotten on reload. Click **Онлайн мэдээлэл шинэчлэх** to reload the snapshot. Page links and IDs and both group sections are visible. Editing and Facebook operations remain local.

## Backup and operation

Back up the local `data` directory and the online SQLite database using SQLite backup tooling or stop the corresponding process before copying its database files. Keep keys private and rotate them at the host when necessary, then reconnect clients. There is no retention history or per-user permission system in this version. A failed upload is retried; a snapshot conflict is surfaced and never silently overwritten. Deployment and real internet sync need verification after you configure a host. Local automated tests exercise the actual HTTP backend and persistent database.
