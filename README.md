# LockIn - Social Media Blocker

A simple Chrome extension that blocks social media sites to help you stay focused and productive.

## Features

- Blocks popular social media sites including:

  - Facebook
  - Twitter / X
  - Instagram
  - TikTok
  - Reddit
  - YouTube
  - Snapchat
  - LinkedIn
  - Pinterest
  - Tumblr
  - Discord

- Shows a motivational "blocked" page when you try to visit these sites
- Toggle blocking on/off from the extension popup
- Clean, modern UI

## Installation

### 1. Build the extension

From the repo root:

```bash
npm run build
```

Or build only the extension:

```bash
npm run build --workspace=extension
```

### 2. Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right corner)
3. Click **Load unpacked**
4. Select the `apps/extension/dist` folder (after building)
5. The extension should now appear in your extensions list

### 3. Pin the Extension (Optional)

1. Click the puzzle piece icon in Chrome's toolbar
2. Find "LockIn - Social Media Blocker"
3. Click the pin icon to keep it visible in your toolbar

## Usage

- **Toggle Blocking**: Click the extension icon and use the toggle switch to enable/disable blocking
- **Visit a Blocked Site**: Try visiting any blocked site to see the motivational blocked page

## Customization

### Adding More Sites

1. Edit `apps/extension/rules.json` to add new blocking rules
2. Add corresponding host permissions in `apps/extension/manifest.json`
3. Reload the extension in `chrome://extensions/`

### Removing Sites

1. Remove the rule from `apps/extension/rules.json`
2. Remove the host permission from `apps/extension/manifest.json`
3. Optionally update the popup UI in `apps/extension/src/popup/`
4. Reload the extension

## Project structure (Turborepo)

- `apps/extension/` – Chrome extension (Vite + React). `manifest.json`, `rules.json`, `icons/` live here.
- `apps/website/` – Standalone website (same blocked-page experience)
- `packages/scene/` – Shared 3D scene (used by extension and website)

## Technical Details

This extension uses Chrome's Manifest V3 and the `declarativeNetRequest` API for efficient, privacy-respecting site blocking. The blocking happens at the network request level, redirecting blocked sites to a local "blocked" page.

## License

MIT License - Feel free to modify and distribute!
