const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PALETTES,
  buildAutomaticAssignments,
  getPalette,
  groupingKey,
  normalizeHex,
  normalizePath,
  normalizeSettings,
  resolveTextColor,
  stableHash,
} = require("../src/core");

test("normalizes paths and short hex colors", () => {
  assert.equal(normalizePath("/Work\\Project/"), "Work/Project");
  assert.equal(normalizeHex("#AbC"), "#aabbcc");
  assert.equal(normalizeHex("invalid"), null);
});

test("migrates legacy contrast settings and clamps visual values", () => {
  const settings = normalizeSettings({
    contrastText: false,
    cornerRadius: 999,
    guideOpacity: -1,
    extensionOpacity: 5,
  });
  assert.equal(settings.defaultTextMode, "dark");
  assert.equal(settings.cornerRadius, 32);
  assert.equal(settings.guideOpacity, 0);
  assert.equal(settings.extensionOpacity, 1);
  assert.equal("contrastText" in settings, false);
});

test("ships three named preset palettes", () => {
  assert.deepEqual(Object.keys(PALETTES), ["catppuccin-mocha", "nord", "monokai"]);
  assert.equal(PALETTES["catppuccin-mocha"].colors.length, 14);
  assert.ok(PALETTES.nord.colors.length >= 8);
  assert.ok(PALETTES.monokai.colors.length >= 7);
});

test("reverses and rotates a palette", () => {
  const settings = normalizeSettings({ paletteId: "monokai", paletteDirection: "reverse", paletteOffset: 1 });
  const palette = getPalette(settings);
  const reversed = [...PALETTES.monokai.colors].reverse();
  assert.equal(palette[0].hex, reversed[1].hex);
  assert.equal(palette.at(-1).hex, reversed[0].hex);
});

test("visible assignment skips manually controlled folders", () => {
  const settings = normalizeSettings({
    overrides: { Manual: { mode: "manual", background: "#ffffff" } },
  });
  const entries = [
    { path: "Automatic", type: "folder" },
    { path: "Manual", type: "folder" },
    { path: "Next", type: "folder" },
  ];
  const assignments = buildAutomaticAssignments(entries, settings);
  assert.equal(assignments.has("Manual"), false);
  assert.equal(assignments.get("Automatic"), getPalette(settings)[0].hex);
  assert.equal(assignments.get("Next"), getPalette(settings)[1].hex);
});

test("files consume colors only in independent mode", () => {
  const entries = [
    { path: "Folder", type: "folder" },
    { path: "Folder/file.md", type: "file" },
    { path: "Next", type: "folder" },
  ];
  const inherited = normalizeSettings({ fileColorMode: "inherit" });
  const independent = normalizeSettings({ fileColorMode: "independent" });
  assert.equal(buildAutomaticAssignments(entries, inherited).has("Folder/file.md"), false);
  assert.equal(buildAutomaticAssignments(entries, independent).has("Folder/file.md"), true);
  assert.equal(buildAutomaticAssignments(entries, inherited).get("Next"), getPalette(inherited)[1].hex);
  assert.equal(buildAutomaticAssignments(entries, independent).get("Next"), getPalette(independent)[2].hex);
});

test("stable path assignment is independent of visible order", () => {
  const settings = normalizeSettings({ assignmentMode: "path" });
  const first = buildAutomaticAssignments([
    { path: "A", type: "folder" },
    { path: "B", type: "folder" },
  ], settings);
  const second = buildAutomaticAssignments([
    { path: "Z", type: "folder" },
    { path: "B", type: "folder" },
  ], settings);
  assert.equal(first.get("B"), second.get("B"));
  assert.equal(stableHash("B"), stableHash("B"));
});

test("automatic text selects the stronger configured contrast", () => {
  const settings = normalizeSettings({ darkText: "#000000", lightText: "#ffffff" });
  assert.equal(resolveTextColor(settings, { background: "#ffffff", textMode: "auto" }), "#000000");
  assert.equal(resolveTextColor(settings, { background: "#000000", textMode: "auto" }), "#ffffff");
});

test("grouping modes produce the expected keys", () => {
  const file = { path: "Work/note.md", folderPath: "Work", type: "file" };
  assert.equal(groupingKey(normalizeSettings({ groupingMode: "folder", fileColorMode: "inherit" }), file), "Work");
  assert.equal(groupingKey(normalizeSettings({ groupingMode: "row" }), file), "Work/note.md");
  assert.equal(groupingKey(normalizeSettings({ groupingMode: "continuous" }), file), "__explorer__");
});
