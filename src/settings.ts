import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import type NextWeekdayPlugin from './main';

export interface PluginSettings {
	skipWeekends: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	skipWeekends: true,
};

export class SettingTab extends PluginSettingTab {
	plugin: NextWeekdayPlugin;

	constructor(app: App, plugin: NextWeekdayPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Skip weekends')
			.setDesc('When enabled, "next day" skips Saturday and Sunday.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.skipWeekends)
					.onChange(async value => {
						this.plugin.settings.skipWeekends = value;
						try {
							await this.plugin.saveSettings();
						} catch (e) {
							new Notice(e instanceof Error ? e.message : 'Failed to save settings');
						}
					})
			);
	}
}
