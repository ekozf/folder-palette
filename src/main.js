const {
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  TFolder,
} = require("obsidian");

const {
  DARK_TEXT,
  PALETTES,
  buildAutomaticAssignments,
  cloneColors,
  getPalette,
  groupingKey,
  normalizeHex,
  normalizePath,
  normalizeSettings,
  parentPath,
  resolveTextColor,
} = require("./core");

class FolderColorModal extends Modal {
  constructor(app, plugin, folder, onApplied = null) {
    super(app);
    this.plugin = plugin;
    this.folder = folder;
    this.onApplied = onApplied;
    const current = plugin.settings.overrides[folder.path];
    const automatic = plugin.getAutomaticColor(folder.path);
    this.background = normalizeHex(
      current?.mode === "manual" ? current.background : automatic,
      automatic,
    );
    this.textMode = current?.textMode || plugin.settings.defaultTextMode;
    this.customText = normalizeHex(current?.customText, DARK_TEXT);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("folder-palette-modal");
    contentEl.createEl("h2", { text: `Color “${this.folder.name}”` });
    contentEl.createEl("p", {
      cls: "setting-item-description",
      text: "Choose a color from the active palette or select any custom background.",
    });

    const palette = contentEl.createDiv({ cls: "folder-palette-grid" });
    const repaintPalette = () => {
      palette.querySelectorAll(".folder-palette-swatch").forEach((button) => {
        button.toggleClass("is-selected", button.dataset.color === this.background);
      });
    };

    let repaintPreview = () => {};
    for (const accent of this.plugin.getActivePalette()) {
      const button = palette.createEl("button", {
        cls: "folder-palette-swatch",
        attr: {
          type: "button",
          title: `${accent.name} ${accent.hex}`,
          "aria-label": accent.name,
          "data-color": accent.hex,
        },
      });
      button.style.setProperty("--folder-palette-swatch", accent.hex);
      button.createSpan({ cls: "folder-palette-swatch-dot" });
      button.createSpan({ cls: "folder-palette-swatch-name", text: accent.name });
      button.addEventListener("click", () => {
        this.background = accent.hex;
        repaintPalette();
        repaintPreview();
      });
    }

    const customRow = contentEl.createDiv({ cls: "folder-palette-custom-color-row" });
    customRow.createSpan({ text: "Custom background" });
    const backgroundPicker = customRow.createEl("input", {
      attr: { type: "color", value: this.background, "aria-label": "Custom background color" },
    });
    backgroundPicker.value = this.background;
    backgroundPicker.addEventListener("input", () => {
      this.background = backgroundPicker.value.toLowerCase();
      repaintPalette();
      repaintPreview();
    });

    const textSetting = new Setting(contentEl)
      .setName("Text color")
      .setDesc("Automatic chooses the configured dark or light text with stronger contrast.");

    let customTextWrapper;
    textSetting.addDropdown((dropdown) => dropdown
      .addOption("auto", "Automatic contrast")
      .addOption("dark", "Dark")
      .addOption("light", "Light")
      .addOption("custom", "Custom")
      .setValue(this.textMode)
      .onChange((value) => {
        this.textMode = value;
        customTextWrapper.toggleClass("is-hidden", value !== "custom");
        repaintPreview();
      }));

    customTextWrapper = contentEl.createDiv({ cls: "folder-palette-custom-text-row" });
    customTextWrapper.toggleClass("is-hidden", this.textMode !== "custom");
    customTextWrapper.createSpan({ text: "Custom text" });
    const textPicker = customTextWrapper.createEl("input", {
      attr: { type: "color", value: this.customText, "aria-label": "Custom text color" },
    });
    textPicker.value = this.customText;
    textPicker.addEventListener("input", () => {
      this.customText = textPicker.value.toLowerCase();
      repaintPreview();
    });

    const preview = contentEl.createDiv({ cls: "folder-palette-preview" });
    preview.createSpan({ text: "▾  Folder / inherited-note.md" });
    repaintPreview = () => {
      preview.style.backgroundColor = this.background;
      preview.style.color = this.plugin.resolveTextColor({
        background: this.background,
        textMode: this.textMode,
        customText: this.customText,
      });
      backgroundPicker.value = normalizeHex(this.background, "#000000");
    };

    const actions = contentEl.createDiv({ cls: "folder-palette-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel" });
    cancel.addEventListener("click", () => this.close());
    const save = actions.createEl("button", { cls: "mod-cta", text: "Apply color" });
    save.addEventListener("click", async () => {
      await this.plugin.setOverride(this.folder.path, {
        mode: "manual",
        background: this.background,
        textMode: this.textMode,
        customText: this.customText,
      });
      this.onApplied?.();
      this.close();
    });

    repaintPalette();
    repaintPreview();
  }

  onClose() {
    this.contentEl.empty();
  }
}

class FolderPaletteSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.overrideSearch = "";
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("folder-palette-settings");
    containerEl.createEl("h2", { text: "Folder Palette" });
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "Color the File Explorer with preset or custom palettes. Every assignment, grouping, file, contrast, and visual behavior can be adjusted below.",
    });

    this.displayBehavior(containerEl);
    this.displayPalette(containerEl);
    this.displayAppearance(containerEl);
    this.displayOverrides(containerEl);
  }

  displayBehavior(containerEl) {
    containerEl.createEl("h3", { text: "Behavior" });

    new Setting(containerEl)
      .setName("Color File Explorer")
      .setDesc("Turn all Folder Palette styling on or off without losing settings or overrides.")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.enabled)
        .onChange(async (value) => {
          this.plugin.settings.enabled = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Automatic assignment")
      .setDesc("Visible order reuses colors after collapse. Stable paths keep the same deterministic color regardless of visibility.")
      .addDropdown((dropdown) => dropdown
        .addOption("visible", "Visible order (dynamic)")
        .addOption("path", "Stable path")
        .setValue(this.plugin.settings.assignmentMode)
        .onChange(async (value) => {
          this.plugin.settings.assignmentMode = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("File colors")
      .setDesc("Files can inherit their parent, remain uncolored, or receive independent palette colors.")
      .addDropdown((dropdown) => dropdown
        .addOption("inherit", "Inherit parent folder")
        .addOption("none", "No file background")
        .addOption("independent", "Independent colors")
        .setValue(this.plugin.settings.fileColorMode)
        .onChange(async (value) => {
          this.plugin.settings.fileColorMode = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Grouping")
      .setDesc("Group folders with inherited files, round every row separately, or treat all colored rows as one continuous block.")
      .addDropdown((dropdown) => dropdown
        .addOption("folder", "Folder blocks")
        .addOption("row", "Individual rows")
        .addOption("continuous", "Continuous explorer block")
        .setValue(this.plugin.settings.groupingMode)
        .onChange(async (value) => {
          this.plugin.settings.groupingMode = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Default text color")
      .setDesc("Automatic calculates contrast per background. Folder overrides can still choose their own text behavior.")
      .addDropdown((dropdown) => dropdown
        .addOption("auto", "Automatic contrast")
        .addOption("dark", "Always dark")
        .addOption("light", "Always light")
        .setValue(this.plugin.settings.defaultTextMode)
        .onChange(async (value) => {
          this.plugin.settings.defaultTextMode = value;
          await this.plugin.saveSettings();
        }));
  }

  displayPalette(containerEl) {
    containerEl.createEl("h3", { text: "Palette" });

    const paletteSetting = new Setting(containerEl)
      .setName("Color palette")
      .setDesc("Choose a preset or maintain your own ordered list of colors.");
    paletteSetting.addDropdown((dropdown) => {
      for (const [id, palette] of Object.entries(PALETTES)) dropdown.addOption(id, palette.name);
      return dropdown
        .addOption("custom", "Custom")
        .setValue(this.plugin.settings.paletteId)
        .onChange(async (value) => {
          this.plugin.settings.paletteId = value;
          this.plugin.settings.paletteOffset = 0;
          await this.plugin.saveSettings();
          this.display();
        });
    });

    new Setting(containerEl)
      .setName("Color direction")
      .setDesc("Run through the selected palette in its displayed order or reverse it.")
      .addDropdown((dropdown) => dropdown
        .addOption("forward", "Forward")
        .addOption("reverse", "Reverse")
        .setValue(this.plugin.settings.paletteDirection)
        .onChange(async (value) => {
          this.plugin.settings.paletteDirection = value;
          await this.plugin.saveSettings();
          this.display();
        }));

    const activePalette = this.plugin.getActivePalette();
    new Setting(containerEl)
      .setName("Starting color")
      .setDesc("Rotate the sequence so another color appears first.")
      .addSlider((slider) => slider
        .setLimits(0, Math.max(0, activePalette.length - 1), 1)
        .setDynamicTooltip()
        .setValue(Math.min(this.plugin.settings.paletteOffset, activePalette.length - 1))
        .onChange(async (value) => {
          this.plugin.settings.paletteOffset = value;
          await this.plugin.saveSettings();
        }));

    const preview = containerEl.createDiv({ cls: "folder-palette-settings-palette" });
    for (const accent of activePalette) {
      const chip = preview.createDiv({ cls: "folder-palette-settings-chip" });
      chip.style.setProperty("--folder-palette-swatch", accent.hex);
      chip.createSpan({ cls: "folder-palette-settings-dot" });
      chip.createSpan({ text: accent.name });
    }

    if (this.plugin.settings.paletteId !== "custom") {
      new Setting(containerEl)
        .setName("Customize this palette")
        .setDesc("Copy the current displayed sequence into the custom editor without changing the built-in preset.")
        .addButton((button) => button
          .setButtonText("Copy to custom")
          .onClick(async () => {
            this.plugin.settings.customPalette = cloneColors(activePalette);
            this.plugin.settings.paletteId = "custom";
            this.plugin.settings.paletteDirection = "forward";
            this.plugin.settings.paletteOffset = 0;
            await this.plugin.saveSettings();
            this.display();
          }));
      return;
    }

    containerEl.createEl("h4", { text: "Custom colors" });
    this.plugin.settings.customPalette.forEach((color, index) => {
      const colorSetting = new Setting(containerEl)
        .setClass("folder-palette-custom-color-setting")
        .setName(`Color ${index + 1}`)
        .setDesc(color.hex);
      colorSetting.addText((text) => text
        .setPlaceholder(`Color ${index + 1}`)
        .setValue(color.name)
        .onChange(async (value) => {
          this.plugin.settings.customPalette[index].name = value.trim() || `Color ${index + 1}`;
          await this.plugin.saveSettings();
        }));
      colorSetting.addColorPicker((picker) => picker
        .setValue(color.hex)
        .onChange(async (value) => {
          const current = this.plugin.settings.customPalette[index];
          current.hex = normalizeHex(value, current.hex);
          await this.plugin.saveSettings();
        }));
      colorSetting.addText((text) => text
        .setPlaceholder("#rrggbb")
        .setValue(color.hex)
        .onChange(async (value) => {
          const normalized = normalizeHex(value);
          if (!normalized) return;
          this.plugin.settings.customPalette[index].hex = normalized;
          await this.plugin.saveSettings();
        }));
      colorSetting.addButton((button) => button
        .setIcon("arrow-up")
        .setTooltip("Move up")
        .setDisabled(index === 0)
        .onClick(async () => this.moveCustomColor(index, index - 1)));
      colorSetting.addButton((button) => button
        .setIcon("arrow-down")
        .setTooltip("Move down")
        .setDisabled(index === this.plugin.settings.customPalette.length - 1)
        .onClick(async () => this.moveCustomColor(index, index + 1)));
      colorSetting.addButton((button) => button
        .setIcon("trash-2")
        .setTooltip("Remove color")
        .setWarning()
        .setDisabled(this.plugin.settings.customPalette.length === 1)
        .onClick(async () => {
          this.plugin.settings.customPalette.splice(index, 1);
          this.plugin.settings.paletteOffset = 0;
          await this.plugin.saveSettings();
          this.display();
        }));
    });

    new Setting(containerEl)
      .setName("Add custom color")
      .setDesc("Custom palettes contain at least one color and restart from the beginning when exhausted.")
      .addButton((button) => button
        .setButtonText("Add color")
        .onClick(async () => {
          this.plugin.settings.customPalette.push({
            name: `Color ${this.plugin.settings.customPalette.length + 1}`,
            hex: "#89b4fa",
          });
          await this.plugin.saveSettings();
          this.display();
        }));
  }

  async moveCustomColor(from, to) {
    const palette = this.plugin.settings.customPalette;
    const [color] = palette.splice(from, 1);
    palette.splice(to, 0, color);
    this.plugin.settings.paletteOffset = 0;
    await this.plugin.saveSettings();
    this.display();
  }

  displayAppearance(containerEl) {
    containerEl.createEl("h3", { text: "Appearance" });

    this.addSlider(containerEl, {
      name: "Side gutter",
      description: "Space between colored backgrounds and the File Explorer edges.",
      key: "sideGutter",
      minimum: 0,
      maximum: 32,
      step: 1,
      unit: "px",
    });
    this.addSlider(containerEl, {
      name: "Corner radius",
      description: "Round the outer corners of each group. Set to 0 for square corners.",
      key: "cornerRadius",
      minimum: 0,
      maximum: 32,
      step: 1,
      unit: "px",
    });
    this.addSlider(containerEl, {
      name: "Space between groups",
      description: "Vertical separation before each folder block, individual row, or continuous explorer block.",
      key: "blockGap",
      minimum: 0,
      maximum: 20,
      step: 1,
      unit: "px",
    });
    this.addSlider(containerEl, {
      name: "Color transition",
      description: "Animation duration when automatic assignments change. Set to 0 to disable animation.",
      key: "animationDuration",
      minimum: 0,
      maximum: 1000,
      step: 25,
      unit: "ms",
    });

    new Setting(containerEl)
      .setName("Show indentation guides")
      .setDesc("Draw tree lines above colored backgrounds so folder depth remains visible.")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.showGuides)
        .onChange(async (value) => {
          this.plugin.settings.showGuides = value;
          await this.plugin.saveSettings();
          this.display();
        }));

    if (this.plugin.settings.showGuides) {
      this.addPercentSlider(containerEl, "Guide opacity", "Opacity of indentation guides relative to the effective row text color.", "guideOpacity");
      this.addSlider(containerEl, {
        name: "Guide width",
        description: "Thickness of the indentation guide lines.",
        key: "guideWidth",
        minimum: 1,
        maximum: 4,
        step: 1,
        unit: "px",
      });
    }

    this.addPercentSlider(containerEl, "File extension opacity", "Opacity of file-type labels such as PNG, JPG, and PDF.", "extensionOpacity");
    this.addPercentSlider(containerEl, "Hover brightness", "Brightness applied while hovering a colored row.", "hoverBrightness", 50, 125);
    this.addPercentSlider(containerEl, "Active brightness", "Brightness applied to the active file row.", "activeBrightness", 50, 125);

    new Setting(containerEl)
      .setName("Dark text")
      .setDesc("Used by automatic contrast when it produces the stronger contrast ratio.")
      .addColorPicker((picker) => picker
        .setValue(this.plugin.settings.darkText)
        .onChange(async (value) => {
          this.plugin.settings.darkText = normalizeHex(value, DARK_TEXT);
          await this.plugin.saveSettings();
        }))
      .addText((text) => text
        .setValue(this.plugin.settings.darkText)
        .onChange(async (value) => {
          const normalized = normalizeHex(value);
          if (!normalized) return;
          this.plugin.settings.darkText = normalized;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Light text")
      .setDesc("Used by automatic contrast when it produces the stronger contrast ratio.")
      .addColorPicker((picker) => picker
        .setValue(this.plugin.settings.lightText)
        .onChange(async (value) => {
          this.plugin.settings.lightText = normalizeHex(value, "#cdd6f4");
          await this.plugin.saveSettings();
        }))
      .addText((text) => text
        .setValue(this.plugin.settings.lightText)
        .onChange(async (value) => {
          const normalized = normalizeHex(value);
          if (!normalized) return;
          this.plugin.settings.lightText = normalized;
          await this.plugin.saveSettings();
        }));
  }

  addSlider(containerEl, options) {
    const setting = new Setting(containerEl)
      .setName(options.name)
      .setDesc(options.description);
    let valueEl;
    setting.addSlider((slider) => slider
      .setLimits(options.minimum, options.maximum, options.step)
      .setDynamicTooltip()
      .setValue(this.plugin.settings[options.key])
      .onChange(async (value) => {
        this.plugin.settings[options.key] = value;
        valueEl?.setText(`${value}${options.unit}`);
        await this.plugin.saveSettings();
      }));
    valueEl = setting.controlEl.createSpan({
      cls: "folder-palette-setting-value",
      text: `${this.plugin.settings[options.key]}${options.unit}`,
    });
  }

  addPercentSlider(containerEl, name, description, key, minimum = 0, maximum = 100) {
    const setting = new Setting(containerEl).setName(name).setDesc(description);
    const current = Math.round(this.plugin.settings[key] * 100);
    let valueEl;
    setting.addSlider((slider) => slider
      .setLimits(minimum, maximum, 1)
      .setDynamicTooltip()
      .setValue(current)
      .onChange(async (value) => {
        this.plugin.settings[key] = value / 100;
        valueEl?.setText(`${value}%`);
        await this.plugin.saveSettings();
      }));
    valueEl = setting.controlEl.createSpan({ cls: "folder-palette-setting-value", text: `${current}%` });
  }

  displayOverrides(containerEl) {
    containerEl.createEl("h3", { text: "Folder overrides" });
    const overrideCount = Object.keys(this.plugin.settings.overrides).length;
    new Setting(containerEl)
      .setName("Search overrides")
      .setDesc(`${overrideCount} path-based override${overrideCount === 1 ? "" : "s"}. Overrides remain tied to their exact folder path.`)
      .addText((text) => text
        .setPlaceholder("Filter by folder path")
        .setValue(this.overrideSearch)
        .onChange((value) => {
          this.overrideSearch = value;
          renderList();
        }));

    const list = containerEl.createDiv({ cls: "folder-palette-override-list" });
    const renderList = () => {
      list.empty();
      const query = this.overrideSearch.trim().toLowerCase();
      const entries = Object.entries(this.plugin.settings.overrides)
        .filter(([path]) => !query || path.toLowerCase().includes(query))
        .sort(([first], [second]) => first.localeCompare(second));
      if (entries.length === 0) {
        list.createEl("p", {
          cls: "setting-item-description folder-palette-empty-state",
          text: overrideCount === 0 ? "No folder overrides yet." : "No overrides match this search.",
        });
        return;
      }
      for (const [path, override] of entries) {
        const folder = this.app.vault.getAbstractFileByPath(path);
        const description = override.mode === "manual"
          ? `Manual ${normalizeHex(override.background, "#808080")}`
          : override.mode === "inherit" ? "Inherits parent color" : "Color cleared";
        const setting = new Setting(list).setName(path).setDesc(description);
        if (override.mode === "manual") {
          setting.nameEl.createSpan({ cls: "folder-palette-override-dot" })
            .style.setProperty("--folder-palette-swatch", normalizeHex(override.background, "#808080"));
        }
        setting.addButton((button) => button
          .setButtonText("Edit")
          .setDisabled(!(folder instanceof TFolder))
          .onClick(() => {
            if (folder instanceof TFolder) {
              new FolderColorModal(this.app, this.plugin, folder, () => this.display()).open();
            }
          }));
        setting.addButton((button) => button
          .setIcon("rotate-ccw")
          .setTooltip("Restore automatic color")
          .onClick(async () => {
            await this.plugin.setOverride(path, { mode: "automatic" });
            this.display();
          }));
      }
    };
    renderList();

    new Setting(containerEl)
      .setName("Reset all overrides")
      .setDesc("Restore automatic assignment for every folder.")
      .addButton((button) => button
        .setButtonText("Reset overrides")
        .setWarning()
        .setDisabled(overrideCount === 0)
        .onClick(async () => {
          this.plugin.settings.overrides = {};
          await this.plugin.saveSettings();
          new Notice("All folder overrides were reset to automatic.");
          this.display();
        }));

    new Setting(containerEl)
      .setName("Refresh colors")
      .setDesc("Re-read the open File Explorer and recalculate all automatic colors.")
      .addButton((button) => button
        .setButtonText("Refresh")
        .onClick(() => {
          this.plugin.scheduleApply(0);
          new Notice("Folder Palette refreshed.");
        }));
  }
}

module.exports = class FolderPalettePlugin extends Plugin {
  async onload() {
    this.settings = normalizeSettings((await this.loadData()) || {});
    await this.saveData(this.settings);

    this.addSettingTab(new FolderPaletteSettingTab(this.app, this));
    this.registerContextMenu();
    this.registerCommands();
    this.registerVaultEvents();
    this.visibleAutomaticColors = new Map();

    this.app.workspace.onLayoutReady(() => {
      this.startObserver();
      this.scheduleApply(0);
    });
  }

  onunload() {
    if (this.observer) this.observer.disconnect();
    if (this.applyTimer) window.clearTimeout(this.applyTimer);
    this.clearExplorerStyles();
    this.removeExplorerLayers();
  }

  async saveSettings() {
    this.settings = normalizeSettings(this.settings);
    await this.saveData(this.settings);
    this.scheduleApply(0);
  }

  getActivePalette() {
    return getPalette(this.settings);
  }

  getAutomaticColor(path) {
    return this.visibleAutomaticColors?.get(normalizePath(path)) || this.getActivePalette()[0].hex;
  }

  resolveTextColor(style) {
    return resolveTextColor(this.settings, style);
  }

  getEffectiveFolderStyle(folderPath, automaticColors = this.visibleAutomaticColors, seen = new Set()) {
    const path = normalizePath(folderPath);
    if (!path || seen.has(path)) return null;
    seen.add(path);

    const override = this.settings.overrides[path];
    if (override?.mode === "clear") return null;
    if (override?.mode === "inherit") return this.getEffectiveFolderStyle(parentPath(path), automaticColors, seen);

    const style = override?.mode === "manual"
      ? {
        background: normalizeHex(override.background, automaticColors.get(path) || this.getActivePalette()[0].hex),
        textMode: override.textMode || this.settings.defaultTextMode,
        customText: override.customText,
      }
      : {
        background: automaticColors.get(path) || this.getActivePalette()[0].hex,
        textMode: this.settings.defaultTextMode,
      };
    return { ...style, text: this.resolveTextColor(style) };
  }

  getRowStyle(record, automaticColors) {
    if (record.type === "folder") return this.getEffectiveFolderStyle(record.path, automaticColors);
    if (this.settings.fileColorMode === "none") return null;
    if (this.settings.fileColorMode === "inherit") {
      return this.getEffectiveFolderStyle(record.folderPath, automaticColors);
    }
    const style = {
      background: automaticColors.get(record.path) || this.getActivePalette()[0].hex,
      textMode: this.settings.defaultTextMode,
    };
    return { ...style, text: this.resolveTextColor(style) };
  }

  async setOverride(folderPath, override) {
    const path = normalizePath(folderPath);
    if (!path) return;
    if (!override || override.mode === "automatic") delete this.settings.overrides[path];
    else this.settings.overrides[path] = override;
    await this.saveSettings();
    new Notice(`Folder Palette updated ${path}.`);
  }

  registerContextMenu() {
    this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => {
      if (!(file instanceof TFolder) || file.isRoot()) return;
      menu.addSeparator();
      menu.addItem((item) => item
        .setTitle("Set folder color…")
        .setIcon("palette")
        .onClick(() => new FolderColorModal(this.app, this, file).open()));
      menu.addItem((item) => item
        .setTitle("Use automatic folder color")
        .setIcon("rotate-ccw")
        .onClick(() => this.setOverride(file.path, { mode: "automatic" })));
      menu.addItem((item) => item
        .setTitle("Inherit parent folder color")
        .setIcon("corner-left-up")
        .onClick(() => this.setOverride(file.path, { mode: "inherit" })));
      menu.addItem((item) => item
        .setTitle("Clear folder color")
        .setIcon("eraser")
        .onClick(() => this.setOverride(file.path, { mode: "clear" })));
    }));
  }

  registerCommands() {
    this.addCommand({
      id: "refresh-folder-colors",
      name: "Refresh File Explorer colors",
      callback: () => {
        this.scheduleApply(0);
        new Notice("Folder Palette refreshed.");
      },
    });
    this.addCommand({
      id: "toggle-folder-colors",
      name: "Toggle File Explorer colors",
      callback: async () => {
        this.settings.enabled = !this.settings.enabled;
        await this.saveSettings();
        new Notice(`Folder Palette ${this.settings.enabled ? "enabled" : "disabled"}.`);
      },
    });
  }

  registerVaultEvents() {
    this.registerEvent(this.app.vault.on("create", () => this.scheduleApply()));
    this.registerEvent(this.app.vault.on("delete", () => this.scheduleApply()));
    this.registerEvent(this.app.vault.on("rename", () => this.scheduleApply()));
    this.registerEvent(this.app.workspace.on("layout-change", () => this.scheduleApply()));
  }

  startObserver() {
    if (this.observer) this.observer.disconnect();
    this.observer = new MutationObserver((mutations) => {
      const explorerChanged = mutations.some((mutation) => {
        if (mutation.type === "attributes") {
          return mutation.target instanceof Element && mutation.target.classList.contains("nav-folder");
        }
        if (mutation.type !== "childList" || mutation.addedNodes.length === 0) return false;
        return Array.from(mutation.addedNodes).some((node) => {
          if (!(node instanceof Element)) return true;
          return !node.matches(".folder-palette-row-background, .folder-palette-row-guides, .folder-palette-guide");
        });
      });
      if (explorerChanged) this.scheduleApply();
    });
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "aria-expanded"],
    });
    this.register(() => this.observer?.disconnect());
    this.registerDomEvent(window, "resize", () => this.scheduleApply());
  }

  scheduleApply(delay = 40) {
    if (this.applyTimer) window.clearTimeout(this.applyTimer);
    this.applyTimer = window.setTimeout(() => {
      this.applyTimer = null;
      this.applyExplorerStyles();
    }, delay);
  }

  clearExplorerStyles() {
    document.querySelectorAll(
      '.workspace-leaf-content[data-type="file-explorer"] .folder-palette-colored-row',
    ).forEach((row) => {
      row.removeClass("folder-palette-colored-row", "folder-palette-block-start", "folder-palette-block-end");
      for (const property of [
        "--folder-palette-bg",
        "--folder-palette-fg",
        "--folder-palette-left-offset",
        "--folder-palette-right-offset",
        "--folder-palette-radius",
        "--folder-palette-block-gap",
        "--folder-palette-animation",
        "--folder-palette-guide-opacity",
        "--folder-palette-guide-width",
        "--folder-palette-extension-opacity",
        "--folder-palette-hover-brightness",
        "--folder-palette-active-brightness",
      ]) row.style.removeProperty(property);
      row.removeAttribute("data-folder-palette-group");
      row.querySelectorAll(".folder-palette-file-extension").forEach((extension) => {
        extension.removeClass("folder-palette-file-extension");
      });
    });
  }

  removeExplorerLayers() {
    document.querySelectorAll(
      '.workspace-leaf-content[data-type="file-explorer"] .folder-palette-row-background, '
      + '.workspace-leaf-content[data-type="file-explorer"] .folder-palette-row-guides',
    ).forEach((element) => element.remove());
  }

  applyExplorerStyles() {
    if (!this.settings.enabled) {
      this.clearExplorerStyles();
      this.removeExplorerLayers();
      return;
    }

    const styledRows = new Set();
    this.visibleAutomaticColors = new Map();

    for (const explorer of document.querySelectorAll('.workspace-leaf-content[data-type="file-explorer"]')) {
      const records = [];
      const selector = '.nav-folder-title[data-path], .nav-file-title[data-path]';
      for (const row of explorer.querySelectorAll(selector)) {
        if (!this.isVisibleRow(row)) continue;
        const path = normalizePath(row.getAttribute("data-path"));
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFolder && !file.isRoot()) {
          records.push({ row, path, type: "folder", folderPath: path, file });
        } else if (file instanceof TFile && file.parent && !file.parent.isRoot()) {
          records.push({ row, path, type: "file", folderPath: file.parent.path, file });
        }
      }

      const activePalette = this.getActivePalette();
      const automaticColors = buildAutomaticAssignments(records, this.settings, activePalette);
      for (const [path, color] of automaticColors) {
        if (!this.visibleAutomaticColors.has(path)) this.visibleAutomaticColors.set(path, color);
      }

      const container = explorer.querySelector(".nav-files-container");
      const containerRect = container?.getBoundingClientRect();
      const targetLeft = containerRect ? containerRect.left + this.settings.sideGutter : 0;
      const targetRight = containerRect && container
        ? containerRect.left + container.clientWidth - this.settings.sideGutter
        : 0;
      const styledEntries = [];

      records.forEach((record, sequenceIndex) => {
        const style = this.getRowStyle(record, automaticColors);
        if (!style) return;
        const { row } = record;
        let background = Array.from(row.children)
          .find((child) => child.classList.contains("folder-palette-row-background"));
        if (!background) {
          background = document.createElement("div");
          background.className = "folder-palette-row-background";
          background.setAttribute("aria-hidden", "true");
          row.append(background);
        }

        row.addClass("folder-palette-colored-row");
        row.removeClass("folder-palette-block-start", "folder-palette-block-end");
        row.style.setProperty("--folder-palette-bg", style.background);
        row.style.setProperty("--folder-palette-fg", style.text);
        row.style.setProperty("--folder-palette-radius", `${this.settings.cornerRadius}px`);
        row.style.setProperty("--folder-palette-block-gap", `${this.settings.blockGap}px`);
        row.style.setProperty("--folder-palette-animation", `${this.settings.animationDuration}ms`);
        row.style.setProperty("--folder-palette-guide-opacity", String(this.settings.guideOpacity));
        row.style.setProperty("--folder-palette-guide-width", `${this.settings.guideWidth}px`);
        row.style.setProperty("--folder-palette-extension-opacity", String(this.settings.extensionOpacity));
        row.style.setProperty("--folder-palette-hover-brightness", String(this.settings.hoverBrightness));
        row.style.setProperty("--folder-palette-active-brightness", String(this.settings.activeBrightness));

        if (containerRect) {
          const rowRect = row.getBoundingClientRect();
          row.style.setProperty("--folder-palette-left-offset", `${rowRect.left - targetLeft}px`);
          row.style.setProperty("--folder-palette-right-offset", `${targetRight - rowRect.right}px`);
        }

        if (this.settings.showGuides) this.renderIndentationGuides(row, explorer, targetLeft, targetRight);
        else row.querySelectorAll(":scope > .folder-palette-row-guides").forEach((element) => element.remove());
        if (record.type === "file") this.markFileExtension(row, record.file.extension);

        const group = groupingKey(this.settings, record);
        row.setAttribute("data-folder-palette-group", group);
        styledRows.add(row);
        styledEntries.push({ row, group, sequenceIndex });
      });

      styledEntries.forEach((entry, index) => {
        const previous = styledEntries[index - 1];
        const next = styledEntries[index + 1];
        const continuesFromPrevious = previous
          && previous.group === entry.group
          && previous.sequenceIndex === entry.sequenceIndex - 1;
        const continuesToNext = next
          && next.group === entry.group
          && next.sequenceIndex === entry.sequenceIndex + 1;
        entry.row.toggleClass("folder-palette-block-start", !continuesFromPrevious);
        entry.row.toggleClass("folder-palette-block-end", !continuesToNext);
      });
    }

    document.querySelectorAll(
      '.workspace-leaf-content[data-type="file-explorer"] .folder-palette-colored-row',
    ).forEach((row) => {
      if (styledRows.has(row)) return;
      row.removeClass("folder-palette-colored-row", "folder-palette-block-start", "folder-palette-block-end");
      row.removeAttribute("data-folder-palette-group");
      row.querySelectorAll(":scope > .folder-palette-row-background, :scope > .folder-palette-row-guides")
        .forEach((element) => element.remove());
      row.querySelectorAll(".folder-palette-file-extension").forEach((extension) => {
        extension.removeClass("folder-palette-file-extension");
      });
    });
  }

  renderIndentationGuides(row, explorer, targetLeft, targetRight) {
    let guideLayer = Array.from(row.children)
      .find((child) => child.classList.contains("folder-palette-row-guides"));
    if (!guideLayer) {
      guideLayer = document.createElement("div");
      guideLayer.className = "folder-palette-row-guides";
      guideLayer.setAttribute("aria-hidden", "true");
      row.append(guideLayer);
    }
    guideLayer.replaceChildren();

    const positions = new Set();
    let ancestor = row.parentElement;
    while (ancestor && ancestor !== explorer) {
      if (ancestor.classList.contains("nav-folder-children")) {
        const position = Math.round(ancestor.getBoundingClientRect().left - targetLeft);
        if (position > 2 && position < (targetRight - targetLeft - 2)) positions.add(position);
      }
      ancestor = ancestor.parentElement;
    }

    for (const position of Array.from(positions).sort((first, second) => first - second)) {
      const guide = document.createElement("span");
      guide.className = "folder-palette-guide";
      guide.style.left = `${position}px`;
      guideLayer.append(guide);
    }
  }

  markFileExtension(row, extension) {
    row.querySelectorAll(".folder-palette-file-extension").forEach((element) => {
      element.removeClass("folder-palette-file-extension");
    });
    const expected = String(extension || "").trim().toLowerCase();
    if (!expected) return;
    for (const element of row.querySelectorAll("*")) {
      if (element.classList.contains("folder-palette-row-background")
        || element.classList.contains("folder-palette-row-guides")
        || element.classList.contains("folder-palette-guide")) continue;
      if (element.children.length === 0 && element.textContent.trim().toLowerCase() === expected) {
        element.addClass("folder-palette-file-extension");
      }
    }
  }

  isVisibleRow(row) {
    return row instanceof HTMLElement
      && row.offsetParent !== null
      && row.getClientRects().length > 0;
  }
};
