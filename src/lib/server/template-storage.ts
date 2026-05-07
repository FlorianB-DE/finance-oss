import path from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { getInvoiceOutputDir } from '$lib/server/invoice-storage';

export function getTemplateOutputDir() {
	return path.join(getInvoiceOutputDir(), 'templates');
}

/** Stored path is basename only (under template dir). */
export function resolveTemplateFile(storedPath?: string | null) {
	if (!storedPath) return null;
	const base = getTemplateOutputDir();
	const safe = path.basename(storedPath.trim());
	if (!safe || safe === '.' || safe === '..') return null;
	return path.join(base, safe);
}

export function toStoredTemplatePath(filename: string) {
	return path.basename(filename);
}

const ALLOWED_EXT = /\.html?$/i;

export function isAllowedTemplateFilename(name: string) {
	const base = path.basename(name.trim());
	return base.length > 0 && ALLOWED_EXT.test(base) && !base.includes('..');
}

export function safeTemplateBasename(originalName: string): string | null {
	const base = path.basename(originalName.trim()).replace(/[^a-zA-Z0-9._-]/g, '_');
	if (!base || !ALLOWED_EXT.test(base)) return null;
	return base;
}

export async function listTemplateFiles(): Promise<string[]> {
	const dir = getTemplateOutputDir();
	try {
		const names = await readdir(dir);
		return names
			.filter(n => ALLOWED_EXT.test(n))
			.filter(n => {
				try {
					const full = path.join(dir, n);
					return existsSync(full) && statSync(full).isFile();
				} catch {
					return false;
				}
			})
			.sort((a, b) => a.localeCompare(b, 'de'));
	} catch {
		return [];
	}
}
