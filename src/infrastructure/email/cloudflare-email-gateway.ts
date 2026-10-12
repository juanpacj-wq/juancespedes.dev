import type { ContactGateway } from '../../application/ports/contact';
import { buildPlainTextEmail } from './mime';

/**
 * Sends contact requests through Cloudflare Email Routing (a `send_email` binding). The binding
 * only delivers to verified destination addresses, so the site can never be abused to email
 * third parties. The transport is injected to keep this adapter testable outside a worker.
 */
export interface RawEmailTransport {
  send(from: string, to: string, raw: string): Promise<void>;
}

export interface CloudflareEmailGatewayConfig {
  readonly transport: RawEmailTransport;
  readonly fromAddress: string;
  readonly toAddress: string;
  readonly newId: () => string;
}

export const makeCloudflareEmailGateway = ({
  transport,
  fromAddress,
  toAddress,
  newId,
}: CloudflareEmailGatewayConfig): ContactGateway => ({
  async deliver(request, { locale, receivedAt }) {
    const domain = fromAddress.split('@')[1] ?? 'localhost';
    const raw = buildPlainTextEmail({
      from: { name: 'juancespedes.dev', address: fromAddress },
      to: { name: 'Juan Céspedes', address: toAddress },
      replyTo: { name: request.name, address: request.email },
      subject: `Contacto desde el portfolio: ${request.name}`,
      body: [
        `Nombre: ${request.name}`,
        `Correo: ${request.email}`,
        `Idioma del sitio: ${locale}`,
        `Recibido: ${receivedAt.toISOString()}`,
        '',
        request.message,
      ].join('\n'),
      date: receivedAt,
      messageId: `${newId()}@${domain}`,
    });
    await transport.send(fromAddress, toAddress, raw);
  },
});
