# User Workspace

Open index.html or run npm start and visit http://127.0.0.1:4173.

Load 200 mock users to populate four local portfolios. Use Manage to edit a display name, bio, portfolio, profile photo, and other profile details. Rehearse creation or Rehearse update to review and confirm a local change.

This edition opens an empty roster and uses a fresh browser storage key. CSV import appends records and CSV export includes text fields only. Photos are stored in the current browser and origin.

For browser tests, run npm install, npx playwright install chromium, then npm test. Rehearsals use local data.

Use Bio database to edit up to 100 reusable bios. In the profile editor, Random bio selects a different saved bio where available. Create mock Page confirms the selected profile and assigns a local mock ID. Update mock Page keeps its ID. CSV includes the mock ID. This engine runs entirely in the browser.
