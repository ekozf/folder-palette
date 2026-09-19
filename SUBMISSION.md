# Community directory submission checklist

Folder Palette is prepared for a public repository at `https://github.com/ekozf/folder-palette`.

## Repository preparation

- [ ] Create the public `ekozf/folder-palette` GitHub repository.
- [ ] Push this directory as the repository root on the default branch.
- [ ] Keep GitHub Issues enabled so users can report bugs and request features.
- [ ] Confirm that `README.md`, `LICENSE`, `manifest.json`, `versions.json`, the source, tests, and build configuration are committed.
- [ ] Confirm that `npm ci` and `npm run check` pass from a clean checkout.

## Initial release

- [ ] Confirm that `package.json`, `manifest.json`, and `versions.json` agree on version `2.0.0`.
- [ ] Create and push the exact tag `2.0.0` without a `v` prefix.
- [ ] Let the GitHub release workflow finish successfully.
- [ ] Confirm that the `2.0.0` release contains `main.js`, `manifest.json`, and `styles.css` as individual assets.

## Submit to Obsidian

- [ ] Sign in at `https://community.obsidian.md` with an Obsidian account.
- [ ] Connect the `ekozf` GitHub account to the Community profile.
- [ ] Open **Plugins**, select **New plugin**, and enter `https://github.com/ekozf/folder-palette`.
- [ ] Choose the owner, accept the developer policies, confirm ongoing maintenance, and submit.
- [ ] Review the automated Manifest, Releases, Source code, and Build verification results.
- [ ] If changes are required, increment the version, publish a new matching release, and request a new check from the entry menu.

The Community directory only requires the initial submission. Later updates are discovered from new GitHub releases whose tag exactly matches the version in `manifest.json`.
