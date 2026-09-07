import { lookup } from "node:dns/promises";
import http, { type IncomingMessage } from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import ipaddr from "ipaddr.js";

export class ResourceError extends Error {
	constructor(
		public statusCode: number,
		message: string,
	) {
		super(message);
	}
}

export function publicUrl(value: string): URL {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new ResourceError(400, "Invalid URL");
	}
	if (
		!["https:", "http:"].includes(url.protocol) ||
		url.username ||
		url.password ||
		url.port ||
		!url.hostname.includes(".")
	) {
		throw new ResourceError(400, "A public HTTP(S) URL is required");
	}
	url.hash = "";
	return url;
}

export function isPublicAddress(address: string): boolean {
	try {
		return ipaddr.process(address).range() === "unicast";
	} catch {
		return false;
	}
}

export async function resolvePublicAddress(url: URL) {
	const hostname = url.hostname.replace(/^\[|\]$/g, "");
	const addresses = isIP(hostname)
		? [{ address: hostname, family: isIP(hostname) }]
		: await lookup(hostname, { all: true });
	if (
		!addresses.length ||
		addresses.some(({ address }) => !isPublicAddress(address))
	) {
		throw new ResourceError(
			400,
			"Private and reserved addresses are not supported",
		);
	}
	return addresses.find(({ family }) => family === 4) ?? addresses[0];
}

export async function readLimited(
	stream: AsyncIterable<Uint8Array>,
	maxBytes: number,
): Promise<Buffer> {
	const chunks: Buffer[] = [];
	let size = 0;
	for await (const chunk of stream) {
		size += chunk.length;
		if (size > maxBytes)
			throw new ResourceError(413, "Remote content is too large");
		chunks.push(Buffer.from(chunk));
	}
	return Buffer.concat(chunks);
}

export async function fetchPublicResource(
	value: string,
	options: { maxBytes: number; accept: string },
) {
	let url = publicUrl(value);
	const signal = AbortSignal.timeout(8000);
	for (let redirects = 0; redirects <= 4; redirects++) {
		const address = await resolvePublicAddress(url);
		signal.throwIfAborted();
		// Pin the validated DNS address; redirects are checked again before connecting.
		const response = await new Promise<IncomingMessage>((resolve, reject) => {
			const request = (url.protocol === "https:" ? https : http).get(
				url,
				{
					signal,
					lookup: (_hostname, options, callback) =>
						options.all
							? callback(null, [address])
							: callback(null, address.address, address.family),
					headers: {
						"User-Agent": "Twitterbot/1.0",
						Accept: options.accept,
						"Accept-Encoding": "gzip, deflate, br",
					},
				},
				resolve,
			);
			request.on("error", reject);
		});
		const status = response.statusCode ?? 502;
		if (
			[301, 302, 303, 307, 308].includes(status) &&
			response.headers.location
		) {
			response.destroy();
			url = publicUrl(new URL(response.headers.location, url).href);
			continue;
		}
		if (status < 200 || status >= 300) {
			response.destroy();
			throw new ResourceError(502, `Remote server returned ${status}`);
		}
		const encoding = response.headers["content-encoding"];
		const decoder =
			encoding === "gzip"
				? createGunzip()
				: encoding === "br"
					? createBrotliDecompress()
					: encoding === "deflate"
						? createInflate()
						: null;
		if (encoding && encoding !== "identity" && !decoder) {
			response.destroy();
			throw new ResourceError(502, "Unsupported response encoding");
		}
		if (decoder) response.on("error", (error) => decoder.destroy(error));
		try {
			const body = await readLimited(
				decoder ? response.pipe(decoder) : response,
				options.maxBytes,
			);
			return {
				body,
				contentType: response.headers["content-type"] ?? "",
				url: url.href,
			};
		} finally {
			response.destroy();
			decoder?.destroy();
		}
	}
	throw new ResourceError(502, "Too many redirects");
}
