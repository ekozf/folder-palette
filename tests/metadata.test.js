const test = require("node:test");
const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const versions = JSON.parse(readFileSync(join(root, "versions.json"), "utf8"));

test("release versions and minimum app versions agree", () => {
  assert.equal(manifest.version, packageJson.version);
  assert.equal(versions[manifest.version], manifest.minAppVersion);
});

test("manifest metadata follows Community directory constraints", () => {
  assert.match(manifest.id, /^[a-z0-9-]+$/);
  assert.equal(manifest.id.includes("obsidian"), false);
  assert.equal(manifest.id.endsWith("plugin"), false);
  assert.ok(manifest.description.length <= 250);
  assert.ok(manifest.description.endsWith("."));
  assert.equal(manifest.name, "Folder Palette");
  assert.equal(manifest.author, "ekozf");
});

test("required repository and release files exist", () => {
  for (const file of ["README.md", "LICENSE", "manifest.json", "main.js", "styles.css"]) {
    assert.equal(existsSync(join(root, file)), true, `${file} should exist`);
  }
});
