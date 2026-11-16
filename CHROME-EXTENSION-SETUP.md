# Use the existing bektas Chrome profile

The default production engine now connects to one selected Meta Business Suite tab through the bundled Chrome extension. It does not launch Playwright, create another browser profile, copy cookies, or read saved passwords. The old Playwright module remains only for existing injected test fixtures.

## Update your clone

Stop the local app with Ctrl+C. Run this one command in Command Prompt:
```cmd
"C:\Program Files\Git\cmd\git.exe" -C "C:\Users\bekta\fbst" pull --ff-only origin main
```

Start START-WINDOWS.cmd or START-PUBLISHING-WINDOWS.cmd from C:\Users\bekta\fbst. Keep its window open.

## Install once in bektas

1. Open Chrome using your bektas profile.
2. Visit chrome://extensions.
3. Turn on Developer mode.
4. Click Load unpacked and select C:\Users\bekta\fbst\chrome-extension.
5. Open your existing https://business.facebook.com/ tab. Sign in yourself if required.
6. Click the Chrome extensions puzzle icon, then AURANT, then **Энэ Meta tab-ийг холбох**.

The extension cannot read Chrome's profile display name. Installing and pairing it inside bektas is how you choose that profile. Do not install/pair it in another profile.

No token copying is needed: clicking Connect obtains the current local app token and keeps it in extension session storage. It is not written to GitHub or sent to Meta. Pair again after restarting the local app or Chrome. If Chrome asks for local-network access, allow it for this extension to reach 127.0.0.1.

After code updates, click Reload for AURANT in chrome://extensions, refresh the Meta tab, then reconnect. Stop running jobs before updating.

## Run

Keep the selected Meta tab open. Keep it visible while a job runs and do not manually change portfolios or navigate during the job.
In AURANT select a record with the exact business portfolio name, a valid category, and a 3–8 word Mongolian bio. Start Page creation.

The extension attempts to open the asset selector, click the requested portfolio, verify the right detail pane, open Manage Pages and Create a new Facebook Page, fill the form, submit once, and collect a matching numeric Page ID.

Meta terms, checkpoints and login remain manual. Missing/ambiguous selectors or IDs stop the job. A Page URL with only a custom name may require manually recording its numeric ID.

## Recovery

Only one tab and one job are active at a time. Jobs are delivered once, never automatically retried.
- Closing/disconnecting the tab, refreshing during creation, or losing the result marks the record for review after the four-minute job timeout.
- If a Page may have been created, open that Page and collect its ID; do not create it again.
- If Meta navigates outside business.facebook.com, the extension does not follow/control that other domain. Record the verified Page ID manually in AURANT.
- Use Disconnect in the extension popup to stop the connection. Already submitted Facebook actions cannot be undone by disconnecting.
- After a review state, only reset a record once you have verified the Page was not created.

GitHub publishing is unchanged: completed Page metadata and public group metadata only, when the publishing launcher is enabled.

## Scope and validation

This version implements the local bridge and Page creation/capture workflow. It does not implement Like, Comment, Share, proxy routing, bulk account creation, or a 500-account engine.

Syntax and isolated bridge state-machine checks passed. This environment could not run the Node integration suite, load an unpacked Chrome extension, or test live Meta DOM selectors. Treat the first real Page creation as supervised validation, not a proven deployment.
