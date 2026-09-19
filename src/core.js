const PALETTES = Object.freeze({
  "catppuccin-mocha": Object.freeze({
    name: "Catppuccin Mocha",
    colors: Object.freeze([
      { name: "Rosewater", hex: "#f5e0dc" },
      { name: "Flamingo", hex: "#f2cdcd" },
      { name: "Maroon", hex: "#eba0ac" },
      { name: "Red", hex: "#f38ba8" },
      { name: "Pink", hex: "#f5c2e7" },
      { name: "Mauve", hex: "#cba6f7" },
      { name: "Lavender", hex: "#b4befe" },
      { name: "Blue", hex: "#89b4fa" },
      { name: "Sapphire", hex: "#74c7ec" },
      { name: "Sky", hex: "#89dceb" },
      { name: "Teal", hex: "#94e2d5" },
      { name: "Green", hex: "#a6e3a1" },
      { name: "Yellow", hex: "#f9e2af" },
      { name: "Peach", hex: "#fab387" },
    ]),
  }),
  nord: Object.freeze({
    name: "Nord",
    colors: Object.freeze([
      { name: "Red", hex: "#bf616a" },
      { name: "Orange", hex: "#d08770" },
      { name: "Yellow", hex: "#ebcb8b" },
      { name: "Green", hex: "#a3be8c" },
      { name: "Frost cyan", hex: "#8fbcbb" },
      { name: "Frost light blue", hex: "#88c0d0" },
      { name: "Frost blue", hex: "#81a1c1" },
      { name: "Frost dark blue", hex: "#5e81ac" },
      { name: "Purple", hex: "#b48ead" },
    ]),
  }),
  monokai: Object.freeze({
    name: "Monokai",
    colors: Object.freeze([
      { name: "Pink", hex: "#f92672" },
      { name: "Orange", hex: "#fd971f" },
      { name: "Yellow", hex: "#e6db74" },
      { name: "Green", hex: "#a6e22e" },
      { name: "Cyan", hex: "#66d9ef" },
      { name: "Blue", hex: "#4aa5f0" },
      { name: "Purple", hex: "#ae81ff" },
    ]),
  }),
});

const DARK_TEXT = "#11111b";
const LIGHT_TEXT = "#f8f8f2";

const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  paletteId: "catppuccin-mocha",
  customPalette: PALETTES["catppuccin-mocha"].colors,
  paletteDirection: "forward",
  paletteOffset: 0,
  assignmentMode: "visible",
  fileColorMode: "inherit",
  groupingMode: "folder",
  defaultTextMode: "auto",
  darkText: DARK_TEXT,
  lightText: "#cdd6f4",
  cornerRadius: 7,
  sideGutter: 4,
  blockGap: 4,
  animationDuration: 200,
  showGuides: true,
  guideOpacity: 0.38,
  guideWidth: 1,
  extensionOpacity: 0.65,
  hoverBrightness: 0.96,
  activeBrightness: 0.9,
  overrides: {},
});

function normalizePath(path) {
  return String(path || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function parentPath(path) {
  const normalized = normalizePath(path);
  const slash = normalized.lastIndexOf("/");
  return slash === -1 ? "" : normalized.slice(0, slash);
}

function normalizeHex(value, fallback = null) {
  const candidate = String(value || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(candidate)) return candidate.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(candidate)) {
    return (`#${candidate[1]}${candidate[1]}${candidate[2]}${candidate[2]}${candidate[3]}${candidate[3]}`).toLowerCase();
  }
  return fallback;
}

function clampNumber(value, minimum, maximum, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, number));
}

function cloneColors(colors) {
  return colors.map((color, index) => ({
    name: String(color?.name || `Color ${index + 1}`).trim() || `Color ${index + 1}`,
    hex: normalizeHex(color?.hex, "#808080"),
  }));
}

function normalizeCustomPalette(value) {
  if (!Array.isArray(value)) return cloneColors(PALETTES["catppuccin-mocha"].colors);
  const colors = cloneColors(value).filter((color) => normalizeHex(color.hex));
  return colors.length > 0 ? colors : cloneColors(PALETTES["catppuccin-mocha"].colors);
}

function normalizeSettings(stored = {}) {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...stored,
    customPalette: normalizeCustomPalette(stored.customPalette),
    overrides: stored.overrides && typeof stored.overrides === "object" && !Array.isArray(stored.overrides)
      ? { ...stored.overrides }
      : {},
  };

  if (!PALETTES[settings.paletteId] && settings.paletteId !== "custom") {
    settings.paletteId = DEFAULT_SETTINGS.paletteId;
  }
  if (!stored.defaultTextMode) {
    settings.defaultTextMode = stored.contrastText === false ? "dark" : "auto";
  }
  if (!["forward", "reverse"].includes(settings.paletteDirection)) settings.paletteDirection = "forward";
  if (!["visible", "path"].includes(settings.assignmentMode)) settings.assignmentMode = "visible";
  if (!["inherit", "none", "independent"].includes(settings.fileColorMode)) settings.fileColorMode = "inherit";
  if (!["folder", "row", "continuous"].includes(settings.groupingMode)) settings.groupingMode = "folder";
  if (!["auto", "dark", "light"].includes(settings.defaultTextMode)) settings.defaultTextMode = "auto";

  settings.darkText = normalizeHex(settings.darkText, DARK_TEXT);
  settings.lightText = normalizeHex(settings.lightText, DEFAULT_SETTINGS.lightText);
  settings.paletteOffset = Math.round(clampNumber(settings.paletteOffset, 0, 999, 0));
  settings.cornerRadius = Math.round(clampNumber(settings.cornerRadius, 0, 32, DEFAULT_SETTINGS.cornerRadius));
  settings.sideGutter = Math.round(clampNumber(settings.sideGutter, 0, 32, DEFAULT_SETTINGS.sideGutter));
  settings.blockGap = Math.round(clampNumber(settings.blockGap, 0, 20, DEFAULT_SETTINGS.blockGap));
  settings.animationDuration = Math.round(clampNumber(settings.animationDuration, 0, 2000, DEFAULT_SETTINGS.animationDuration));
  settings.guideOpacity = clampNumber(settings.guideOpacity, 0, 1, DEFAULT_SETTINGS.guideOpacity);
  settings.guideWidth = Math.round(clampNumber(settings.guideWidth, 1, 4, DEFAULT_SETTINGS.guideWidth));
  settings.extensionOpacity = clampNumber(settings.extensionOpacity, 0, 1, DEFAULT_SETTINGS.extensionOpacity);
  settings.hoverBrightness = clampNumber(settings.hoverBrightness, 0.5, 1.25, DEFAULT_SETTINGS.hoverBrightness);
  settings.activeBrightness = clampNumber(settings.activeBrightness, 0.5, 1.25, DEFAULT_SETTINGS.activeBrightness);
  settings.enabled = settings.enabled !== false;
  settings.showGuides = settings.showGuides !== false;

  delete settings.contrastText;
  delete settings.autoAssignments;
  delete settings.nextColorIndex;
  return settings;
}

function getPalette(settings) {
  const source = settings.paletteId === "custom"
    ? normalizeCustomPalette(settings.customPalette)
    : cloneColors((PALETTES[settings.paletteId] || PALETTES[DEFAULT_SETTINGS.paletteId]).colors);
  const directed = settings.paletteDirection === "reverse" ? [...source].reverse() : source;
  if (directed.length === 0) return [{ name: "Fallback", hex: "#808080" }];
  const offset = ((Math.round(settings.paletteOffset) % directed.length) + directed.length) % directed.length;
  return directed.slice(offset).concat(directed.slice(0, offset));
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildAutomaticAssignments(entries, settings, palette = getPalette(settings)) {
  const assignments = new Map();
  let visibleIndex = 0;
  for (const entry of entries) {
    const path = normalizePath(entry.path);
    if (!path || assignments.has(path)) continue;
    if (entry.type === "folder") {
      const mode = settings.overrides[path]?.mode;
      if (mode && mode !== "automatic") continue;
    } else if (entry.type === "file") {
      if (settings.fileColorMode !== "independent") continue;
    } else {
      continue;
    }
    const index = settings.assignmentMode === "path"
      ? stableHash(path) % palette.length
      : visibleIndex++ % palette.length;
    assignments.set(path, palette[index].hex);
  }
  return assignments;
}

function srgbChannel(value) {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex) {
  const value = normalizeHex(hex, "#000000").slice(1);
  const red = srgbChannel(parseInt(value.slice(0, 2), 16));
  const green = srgbChannel(parseInt(value.slice(2, 4), 16));
  const blue = srgbChannel(parseInt(value.slice(4, 6), 16));
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

function contrastRatio(first, second) {
  const light = Math.max(first, second);
  const dark = Math.min(first, second);
  return (light + 0.05) / (dark + 0.05);
}

function resolveTextColor(settings, style) {
  const mode = style.textMode || settings.defaultTextMode || "auto";
  if (mode === "dark") return settings.darkText;
  if (mode === "light") return settings.lightText;
  if (mode === "custom") return normalizeHex(style.customText, settings.darkText);

  const background = relativeLuminance(style.background);
  const dark = relativeLuminance(settings.darkText);
  const light = relativeLuminance(settings.lightText);
  return contrastRatio(background, dark) >= contrastRatio(background, light)
    ? settings.darkText
    : settings.lightText;
}

function groupingKey(settings, entry) {
  if (settings.groupingMode === "continuous") return "__explorer__";
  if (settings.groupingMode === "row") return entry.path;
  if (entry.type === "file" && settings.fileColorMode === "inherit") return entry.folderPath;
  return entry.path;
}

module.exports = {
  DARK_TEXT,
  DEFAULT_SETTINGS,
  LIGHT_TEXT,
  PALETTES,
  buildAutomaticAssignments,
  cloneColors,
  contrastRatio,
  getPalette,
  groupingKey,
  normalizeHex,
  normalizePath,
  normalizeSettings,
  parentPath,
  relativeLuminance,
  resolveTextColor,
  stableHash,
};
