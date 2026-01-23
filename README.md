# LockedIn - Social Media Blocker

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

### 1. Generate Icons (Required)

Before loading the extension, you need to generate the icon files:

1. Open `icons/generate-icons.html` in Chrome
2. Right-click each canvas and select "Save image as..."
3. Save them as `icon16.png`, `icon48.png`, and `icon128.png` in the `icons/` folder

### 2. Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right corner)
3. Click **Load unpacked**
4. Select the `lockedin` folder (this folder)
5. The extension should now appear in your extensions list

### 3. Pin the Extension (Optional)

1. Click the puzzle piece icon in Chrome's toolbar
2. Find "LockedIn - Social Media Blocker"
3. Click the pin icon to keep it visible in your toolbar

## Usage

- **Toggle Blocking**: Click the extension icon and use the toggle switch to enable/disable blocking
- **Visit a Blocked Site**: Try visiting any blocked site to see the motivational blocked page

## Customization

### Adding More Sites

1. Edit `rules.json` to add new blocking rules
2. Add corresponding host permissions in `manifest.json`
3. Reload the extension in `chrome://extensions/`

### Removing Sites

1. Remove the rule from `rules.json`
2. Remove the host permission from `manifest.json`
3. Optionally update `popup.html` to remove from the UI list
4. Reload the extension

## Files

- `manifest.json` - Extension configuration
- `rules.json` - Blocking rules for declarativeNetRequest API
- `popup.html` - Extension popup UI
- `popup.js` - Popup functionality
- `blocked.html` - Page shown when a site is blocked
- `icons/` - Extension icons

## Technical Details

This extension uses Chrome's Manifest V3 and the `declarativeNetRequest` API for efficient, privacy-respecting site blocking. The blocking happens at the network request level, redirecting blocked sites to a local "blocked" page.

## License

MIT License - Feel free to modify and distribute!
