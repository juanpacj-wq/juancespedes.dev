/*
 * Minimal RFC 5322 / MIME builder for one plain-text message. Small on purpose: the site sends a
 * single kind of email, and a dependency would weigh more than this file.
 */

const base64Utf8 = (text: string): string => {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
};

/** Removes CR and LF so user input can never start a new header line (header injection). */
const singleLine = (value: string): string => value.replace(/[\r\n]+/g, ' ').trim();

/** RFC 2047 encoded-word, so names and subjects keep their accents. */
const encodeWord = (value: string): string => `=?UTF-8?B?${base64Utf8(singleLine(value))}?=`;

const wrap = (value: string, width = 76): string =>
  value.match(new RegExp(`.{1,${String(width)}}`, 'g'))?.join('\r\n') ?? '';

export interface Mailbox {
  readonly name: string;
  readonly address: string;
}

export interface PlainTextEmail {
  readonly from: Mailbox;
  readonly to: Mailbox;
  readonly replyTo: Mailbox;
  readonly subject: string;
  readonly body: string;
  readonly date: Date;
  readonly messageId: string;
}

const mailbox = ({ name, address }: Mailbox): string =>
  `${encodeWord(name)} <${singleLine(address)}>`;

export const buildPlainTextEmail = (email: PlainTextEmail): string =>
  [
    `From: ${mailbox(email.from)}`,
    `To: ${mailbox(email.to)}`,
    `Reply-To: ${mailbox(email.replyTo)}`,
    `Subject: ${encodeWord(email.subject)}`,
    `Date: ${email.date.toUTCString()}`,
    `Message-ID: <${singleLine(email.messageId)}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap(base64Utf8(email.body.replace(/\r?\n/g, '\r\n'))),
    '',
  ].join('\r\n');
