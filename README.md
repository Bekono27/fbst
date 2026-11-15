# ChefPages MVP

Open index.html directly, or run npm start from this directory and visit http://127.0.0.1:4173. Node.js is required only for the server and tests.

Load 200 demo drafts to populate four placeholder portfolios with fictional Mongolian-style chef names and mock bios. Open a draft, review the Page fields, and use Rehearse creation to record a local confirmation. For a Page you publish manually in Meta Business Suite, record its URL or ID and update its status.

Export CSV to back up data or obtain a template. Imports append rows. Data is stored in the current browser and origin, so export before changing browser or moving from the file to the local server.

Playwright tests target the local workflow. Run npm install, npx playwright install chromium, and npm test. This package has no Meta sign-in, live submission, or GitHub remote configured.
