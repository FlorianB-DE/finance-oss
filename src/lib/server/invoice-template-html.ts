import tailwindCss from '$lib/layout.css?inline';

export const INVOICE_BODY_PLACEHOLDER = '{{INVOICE_BODY}}';

const BASE_PAGE_CSS = `@page {
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
			}`;

/**
 * Merges an uploaded HTML template with the rendered invoice body.
 * The template must contain {@link INVOICE_BODY_PLACEHOLDER}.
 */
export function mergeInvoiceTemplateHtml(
	templateSource: string,
	invoiceBodyHtml: string,
	svelteHead?: string
): string {
	const merged = templateSource.replaceAll(INVOICE_BODY_PLACEHOLDER, invoiceBodyHtml);
	const styleBlock = `<style>${BASE_PAGE_CSS}${tailwindCss ?? ''}</style>${svelteHead ?? ''}`;

	if (merged.includes('</head>')) {
		return merged.replace('</head>', `${styleBlock}</head>`);
	}

	return `<!doctype html>
<html lang="de">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width,initial-scale=1" />
		${styleBlock}
	</head>
	<body>
		${merged}
	</body>
</html>`;
}
