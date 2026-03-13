# Tryl Chrome Extension

Manifest V3 extension for AI fashion try-on. Load as unpacked extension.

**Requires Node 18+** (for build).

## Build

```bash
pnpm build
```

Output: `dist/`

## Load unpacked

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist` folder

## Dev

```bash
pnpm dev
```

Runs build in watch mode. Reload the extension in `chrome://extensions/` after changes.
