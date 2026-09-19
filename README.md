# Folder Palette

Folder Palette turns the Obsidian File Explorer into a readable, configurable color map. It colors folders, subfolders, and optionally files across the full explorer width while preserving indentation guides, icons, file-type labels, and accessible text contrast.

## Features

- Catppuccin Mocha, Nord, and Monokai presets.
- A custom palette editor with color names, color pickers, hex values, reordering, addition, and removal.
- Forward or reverse palette direction and a configurable starting color.
- Dynamic visible-order assignment that reuses hidden colors after folders collapse.
- Stable path assignment for deterministic colors that do not change with visibility.
- Files can inherit their parent folder, remain uncolored, or receive independent colors.
- Folder blocks, individually rounded rows, or one continuous explorer block.
- Automatic dark/light text contrast with global and per-folder overrides.
- Customizable gutters, corner radius, group spacing, animation duration, guide visibility and opacity, guide width, extension opacity, and hover/active brightness.
- Right-click folder controls for manual color, automatic color, parent inheritance, and cleared color.
- A searchable settings view for reviewing, editing, and removing path-based overrides.
- Desktop and mobile support; the plugin uses only the Obsidian API and browser APIs.

## Usage

Open **Settings → Folder Palette** to select a palette and configure behavior. The defaults reproduce the original Folder Palette look:

- Catppuccin Mocha colors in a smooth visible sequence.
- Files inherit their direct parent folder.
- Each folder and its inherited files form one rounded block.
- Automatic per-color text contrast, 7 px corners, 4 px gutters, and a 200 ms transition.

Right-click any folder in the File Explorer to set a manual color, restore automatic assignment, inherit the parent folder color, or remove its background. Overrides follow exact vault-relative folder paths.

## Installation

### Community directory

After Folder Palette is accepted into the Obsidian Community directory:

1. Open **Settings → Community plugins**.
2. Select **Browse** and search for **Folder Palette**.
3. Select **Install**, then **Enable**.

### Manual installation

Copy `main.js`, `manifest.json`, and `styles.css` into:

```text
<vault>/.obsidian/plugins/folder-palette/
```

Reload Obsidian and enable **Folder Palette** under **Settings → Community plugins**.

## Development

Requires Node.js 18 or later.

```bash
npm install
npm run dev
```

`npm run dev` watches `src/` and rebuilds `main.js`. Before committing or releasing, run:

```bash
npm run check
```

This runs the Node test suite, creates a production bundle, and validates the generated JavaScript.

## Releasing

1. Update `minAppVersion` in `manifest.json` if needed.
2. Run `npm version patch`, `npm version minor`, or `npm version major`.
3. Push the commit and the version tag without a `v` prefix.
4. The release workflow tests and builds the plugin, verifies that the tag matches `manifest.json`, and attaches `main.js`, `manifest.json`, and `styles.css` to the GitHub release.

See [SUBMISSION.md](./SUBMISSION.md) for the first Community directory submission checklist.

## Privacy and permissions

Folder Palette does not use the network, collect telemetry, display advertising, require an account, or access files outside the active Obsidian vault. Settings are stored through Obsidian's plugin data API.

## Palette credits

The built-in palettes use color values from [Catppuccin](https://catppuccin.com/palette/), [Nord](https://www.nordtheme.com/docs/colors-and-palettes), and [Monokai](https://monokai.pro/). Folder Palette is an independent project and is not affiliated with those projects.

## License

[MIT](./LICENSE) © 2026 ekozf
