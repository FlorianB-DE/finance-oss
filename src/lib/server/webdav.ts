import { createClient, type WebDAVClient } from 'webdav';
import { readFile } from 'node:fs/promises';
import { resolveInvoiceFile } from './invoice-storage';
import { createLogger } from './logger';

const log = createLogger({ module: 'webdav' });

let client: WebDAVClient | null = null;

function getWebDAVClient(): WebDAVClient | null {
	if (client) {
		return client;
	}

	const url = Bun.env.WEBDAV_URL;
	const username = Bun.env.WEBDAV_USERNAME;
	const password = Bun.env.WEBDAV_PASSWORD;

	if (!url || !username || !password) {
		log.debug('WebDAV not configured (missing WEBDAV_URL, WEBDAV_USERNAME, or WEBDAV_PASSWORD)');
		return null;
	}

	try {
		client = createClient(url, {
			username,
			password
		});
		log.info({ url }, 'WebDAV client initialized');
		return client;
	} catch (error) {
		log.error({ err: error, url }, 'Failed to initialize WebDAV client');
		return null;
	}
}

export function isWebDAVConfigured(): boolean {
	return !!(
		Bun.env.WEBDAV_URL &&
		Bun.env.WEBDAV_USERNAME &&
		Bun.env.WEBDAV_PASSWORD
	);
}

export async function uploadInvoiceToWebDAV(
	invoiceNumber: string,
	pdfPath: string
): Promise<string> {
	const webdavClient = getWebDAVClient();
	if (!webdavClient) {
		throw new Error('WebDAV is not configured');
	}

	const resolvedPath = resolveInvoiceFile(pdfPath);
	if (!resolvedPath) {
		throw new Error(`Could not resolve PDF path: ${pdfPath}`);
	}

	const pdfBuffer = await readFile(resolvedPath);
	const remotePath = getRemotePath(invoiceNumber);

	// Ensure the directory exists
	const directoryPath = getDirectoryPath(invoiceNumber);
	try {
		await webdavClient.createDirectory(directoryPath, { recursive: true });
	} catch (error) {
		// Directory might already exist, which is fine
		log.debug({ err: error, directoryPath }, 'Directory creation result (may already exist)');
	}

	// Upload the file
	await webdavClient.putFileContents(remotePath, pdfBuffer, {
		overwrite: false // Don't overwrite if file already exists
	});

	log.info(
		{ invoiceNumber, remotePath, localPath: resolvedPath },
		'Invoice PDF uploaded to WebDAV'
	);

	return remotePath;
}

function getRemotePath(invoiceNumber: string): string {
	const basePath = Bun.env.WEBDAV_BASE_PATH || '/invoices';
	// Remove any leading/trailing slashes and ensure proper format
	const cleanBasePath = basePath.replace(/^\/+|\/+$/g, '');
	return `/${cleanBasePath}/${invoiceNumber}.pdf`;
}

function getDirectoryPath(invoiceNumber: string): string {
	const basePath = Bun.env.WEBDAV_BASE_PATH || '/invoices';
	const cleanBasePath = basePath.replace(/^\/+|\/+$/g, '');
	return `/${cleanBasePath}`;
}

