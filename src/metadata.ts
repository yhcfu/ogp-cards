import domino from "domino";
import iconv from "iconv-lite";
import { getMetadata } from "page-metadata-parser";
import { detectEncode } from "./encoding";
import { fetchPublicResource } from "./network";

export class MetadataParseError extends Error {
	constructor(
		public statusCode: number,
		message: string,
	) {
		super(message);
		this.name = "MetadataParseError";
	}
}

export async function fetchPageMetadata(url: string): Promise<{
	metadata: IPageMetadata;
	responseUrl: string;
}> {
	const r = await fetchPublicResource(url, {
		maxBytes: 2 * 1024 * 1024,
		accept: "text/html",
	});
	if (!r.contentType.toLowerCase().startsWith("text/html")) {
		throw new MetadataParseError(400, "remote content was not html");
	}
	const buf = r.body;
	let html: string;
	const encoding = detectEncode(buf);
	if (encoding) {
		html = iconv.decode(buf, encoding);
	} else {
		html = buf.toString("utf8");
	}

	const { document } = domino.createWindow(html);
	const responseUrl = r.url || url;
	const metadata = getMetadata(document, responseUrl);

	return { metadata, responseUrl };
}

export type IPageMetadata = {
	description?: string;
	icon?: string;
	image?: string;
	keywords?: string[];
	title?: string;
	language?: string;
	type?: string;
	url: string;
	provider: string;
};
