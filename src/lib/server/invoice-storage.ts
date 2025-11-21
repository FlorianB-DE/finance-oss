import path from 'node:path';

const DEFAULT_OUTPUT_DIR = path.resolve('.cache/invoices');

export function getInvoiceOutputDir() {
	const configured = process.env.FILES_DIR;
	return configured && configured.trim().length > 0 ? path.resolve(configured) : DEFAULT_OUTPUT_DIR;
}

export function resolveInvoiceFile(storedPath?: string | null) {
	if (!storedPath) return null;
	const normalized = storedPath.trim();
	if (path.isAbsolute(normalized)) {
		return normalized;
	}

	if (normalized.startsWith('./') || normalized.startsWith('../')) {
		return path.resolve(normalized);
	}

	return path.join(getInvoiceOutputDir(), normalized);
}

export function toStoredInvoicePath(fullPath: string) {
	return path.relative('.', path.resolve(fullPath));
}
