import { Notice, Plugin, moment, normalizePath } from 'obsidian';
import { DEFAULT_SETTINGS, PluginSettings, SettingTab } from './settings';

export default class NextWeekdayPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SettingTab(this.app, this));

		this.addRibbonIcon('calendar-arrow-down', "Open next weekday's daily note", () => {
			void this.openNextWeekdayNote();
		});

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

	private substituteVars(content: string, date: ReturnType<typeof moment>, title: string, dateFormat: string): string {
		return content
			.replace(/{{title}}/gi, title)
			.replace(/{{date(?::([^}]+))?}}/gi, (_, fmt: string | undefined) => date.format(fmt ?? dateFormat))
			.replace(/{{time(?::([^}]+))?}}/gi, (_, fmt: string | undefined) => window.moment().format(fmt ?? 'HH:mm'));
	}

	private async readTemplate(templatePath: string): Promise<string> {
		const norm = normalizePath(templatePath);
		// daily-notes stores template paths without .md extension
		const file =
			this.app.vault.getFileByPath(`${norm}.md`) ??
			this.app.vault.getFileByPath(norm);
		if (!file) {
			new Notice(`Daily Next: template not found — "${templatePath}"`);
			return '';
		}
		return this.app.vault.read(file);
	}

	private async openNextWeekdayNote(): Promise<void> {
		try {
			type DailyNotesOpts = { format?: string; folder?: string; template?: string };
			type InternalPlugins = { getPluginById(id: string): { instance: { options?: DailyNotesOpts } } | null };
			const ip = (this.app as unknown as { internalPlugins: InternalPlugins }).internalPlugins;
			const opts = ip.getPluginById('daily-notes')?.instance?.options;
			const format   = opts?.format   || 'YYYY-MM-DD';
			const folder   = opts?.folder   ?? '';
			const template = opts?.template ?? '';

			const date  = this.nextWeekday();
			const title = date.format(format);
			const path  = normalizePath(folder ? `${folder}/${title}.md` : `${title}.md`);

			let file = this.app.vault.getFileByPath(path);
			if (!file) {
				if (folder) {
					const folderNorm = normalizePath(folder);
					if (!this.app.vault.getAbstractFileByPath(folderNorm)) {
						await this.app.vault.createFolder(folderNorm);
					}
				}

				const raw     = template ? await this.readTemplate(template) : '';
				const content = raw ? this.substituteVars(raw, date, title, format) : '';

				try {
					file = await this.app.vault.create(path, content);
				} catch (createErr) {
					// race: another invocation created the file between our check and create
					const existing = this.app.vault.getFileByPath(path);
					if (!existing) throw createErr;
					file = existing;
				}
			}

			await this.app.workspace.getLeaf(false).openFile(file);
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
