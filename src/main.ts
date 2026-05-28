import { Notice, Plugin, TFile, normalizePath } from 'obsidian';
import { DEFAULT_SETTINGS, PluginSettings, SettingTab } from './settings';

export default class NextWeekdayPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SettingTab(this.app, this));

		this.addCommand({
			id: 'open-next-weekday-daily-note',
			name: "Open next weekday's daily note",
			callback: () => { void this.openNextWeekdayNote(); },
		});
	}

	private nextWeekday() {
		const d = window.moment().add(1, 'days');
		if (this.settings.skipWeekends) {
			if (d.day() === 6) d.add(2, 'days'); // Sat → Mon
			if (d.day() === 0) d.add(1, 'days'); // Sun → Mon
		}
		return d;
	}

	private async openNextWeekdayNote(): Promise<void> {
		try {
			const dn = (this.app as any).internalPlugins.getPluginById('daily-notes')?.instance;
			const opts = dn?.options as { format?: string; folder?: string; template?: string } | undefined;
			const format   = opts?.format   || 'YYYY-MM-DD'; // || catches empty string
			const folder   = opts?.folder   ?? '';
			const template = opts?.template ?? '';

			const title = this.nextWeekday().format(format);
			const path  = normalizePath(folder ? `${folder}/${title}.md` : `${title}.md`);

			let file = this.app.vault.getFileByPath(path);
			if (!file) {
				let content = '';
				if (template) {
					try { content = await this.app.vault.adapter.read(template); } catch { /* proceed empty */ }
				}
				file = await this.app.vault.create(path, content);
			}

			await this.app.workspace.getLeaf().openFile(file);
		} catch (e) {
			new Notice(e instanceof Error ? e.message : String(e));
		}
	}

	async loadSettings() {
		this.settings = { ...DEFAULT_SETTINGS, ...await this.loadData() as Partial<PluginSettings> };
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
