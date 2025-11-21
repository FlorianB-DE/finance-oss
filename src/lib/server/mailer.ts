import nodemailer from 'nodemailer';
import { getOrCreateSettings } from '$lib/server/settings';
import { prisma } from '$lib/server/prisma';
import { resolveInvoiceFile } from '$lib/server/invoice-storage';
import { createLogger } from '$lib/server/logger';

const log = createLogger({ module: 'mailer' });

export async function sendInvoiceEmail(invoiceId: number) {
	const settings = await getOrCreateSettings();
	if (!settings.emailFrom || !settings.smtpHost) {
		throw new Error('SMTP Einstellungen unvollständig');
	}

	const invoice = await prisma.invoice.findUnique({
		where: { id: invoiceId },
		include: { recipient: true }
	});

	if (!invoice || !invoice.pdfPath) {
		throw new Error('Rechnung oder PDF nicht gefunden');
	}

	if (!invoice.recipient?.email) {
		throw new Error('Empfänger hat keine E-Mail-Adresse');
	}

	const transport = nodemailer.createTransport({
		host: settings.smtpHost,
		port: settings.smtpPort ?? 587,
		secure: (settings.smtpPort ?? 587) === 465,
		auth:
			settings.smtpUser && settings.smtpPassword
				? {
						user: settings.smtpUser,
						pass: settings.smtpPassword
					}
				: undefined
	});

	const attachmentPath = resolveInvoiceFile(invoice.pdfPath);
	if (!attachmentPath) {
		throw new Error('Pfad zur Rechnung konnte nicht aufgelöst werden');
	}

	await transport.sendMail({
		from: settings.emailFrom,
		to: invoice.recipient.email,
		subject: `Rechnung ${invoice.number}`,
		text:
			settings.emailSignature ??
			`Guten Tag,\n\nim Anhang finden Sie die Rechnung ${invoice.number}.\n\nBeste Grüße`,
		attachments: [
			{
				filename: `Rechnung-${invoice.number}.pdf`,
				path: attachmentPath
			}
		]
	});

	log.info(
		{ invoiceId, invoiceNumber: invoice.number, recipient: invoice.recipient.email },
		'Invoice email sent'
	);

	return { ok: true };
}
