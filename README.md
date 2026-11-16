## Existing bektas Chrome profile

The default local engine now uses the bundled Chrome extension and your selected, already-open Meta Business Suite tab. Start with [CHROME-EXTENSION-SETUP.md](CHROME-EXTENSION-SETUP.md). It no longer opens a separate automation browser. Older browser-launch instructions below are superseded by that guide.

# AURANT

One interface: `index.html` at the repository root. The local Node server serves this same file.

GitHub Pages: deploy from `main`, folder `/ (root)`. Custom domain: `mnanalyze.com`.

Windows: install Node.js 24 LTS and Google Chrome, then run `START-WINDOWS.cmd`. Keep the terminal open and use http://127.0.0.1:4173.

Manual setup from the repository root: `npm run setup`, then `npm start`. Tests: `npm test`.

The public website displays launch instructions. The database and browser engine run locally; GitHub Pages cannot run Node.js or Facebook browser automation. Keep `User-Workspace/data` when updating. Never upload its database or browser session.

See `User-Workspace/README.md` for engine instructions. Live Facebook Page creation remains unverified.

## Pages, groups and online records

Public and private group directories support CSV, TSV and JSON import with column mapping, validation and duplicate detection. Page records show their captured ID, link and last update.

For the authenticated online mirror, backend deployment instructions and limitations, see [ONLINE-SETUP.md](ONLINE-SETUP.md). The backend must be hosted and connected before online sync works. Local records remain the source of truth; online access is read-only.
