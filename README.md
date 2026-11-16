# AURANT

One interface: `index.html` at the repository root. The local Node server serves this same file.

GitHub Pages: deploy from `main`, folder `/ (root)`. Custom domain: `mnanalyze.com`.

Windows: install Node.js 24 LTS and Google Chrome, then run `START-WINDOWS.cmd`. Keep the terminal open and use http://127.0.0.1:4173.

Manual setup from the repository root: `npm run setup`, then `npm start`. Tests: `npm test`.

The public website displays launch instructions. The database and browser engine run locally; GitHub Pages cannot run Node.js or Facebook browser automation. Keep `User-Workspace/data` when updating. Never upload its database or browser session.

See `User-Workspace/README.md` for engine instructions. Live Facebook Page creation remains unverified.
