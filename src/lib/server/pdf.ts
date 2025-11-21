import type { Settings } from '@prisma/client';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { render as renderComponent } from 'svelte/server';
import InvoiceDocument from '$lib/pdf/InvoiceDocument.svelte';
import type { RenderInvoice } from '$lib/server/invoice-format';
import tailwindCss from '$lib/layout.css?inline';

const BROWSER_ARGS = ['--no-sandbox', '--disable-setuid-sandbox'];
const DEFAULT_CACHE_DIR = path.resolve('.cache/puppeteer');
const DEFAULT_PRODUCT = 'chrome-headless-shell';

if (!process.env.PUPPETEER_CACHE_DIR) {
	process.env.PUPPETEER_CACHE_DIR = DEFAULT_CACHE_DIR;
}
if (!process.env.PUPPETEER_PRODUCT) {
	process.env.PUPPETEER_PRODUCT = DEFAULT_PRODUCT;
}

export async function renderInvoicePdf(invoice: RenderInvoice, settings: Settings) {
	const { body, head } = renderComponent(InvoiceDocument, {
		props: { invoice, settings }
	});

	const fullHtml = wrapHtml(body, head, tailwindCss);
	const browser = await puppeteer.launch({
		headless: 'shell',
		args: BROWSER_ARGS
	});

	try {
		const page = await browser.newPage();
		await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
		const pdfBuffer = await page.pdf({
			format: 'A4',
			printBackground: true,
			margin: {
				top: '0mm',
				right: '0mm',
				bottom: '0mm',
				left: '0mm'
			}
		});

		return Buffer.from(pdfBuffer);
	} finally {
		await browser.close();
	}
}

function wrapHtml(content: string, headContent?: string, tailwindCss?: string) {
	return `<!doctype html>
<html lang="de">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width,initial-scale=1" />
		${headContent ?? ''}
		<style>
			@page {
				size: A4;
				margin: 0;
			}

			html,
			body {
				margin: 0;
				padding: 0;
				background: #f0f4ff;
				font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
			}

			body {
				min-height: 100%;
			}

			* {
				box-sizing: border-box;
			}

			${tailwindCss ?? ''}
		</style>
	</head>
	<body>
		${content}
	</body>
</html>`;
}
