import type { VercelRequest, VercelResponse } from "@vercel/node";
import sharp from "sharp";
import { generateSvg } from "../src/image/ogpSvg";
import { fetchPageMetadata } from "../src/metadata";
import { fetchPublicResource, publicUrl, ResourceError } from "../src/network";

export default async function (
	req: Pick<VercelRequest, "method" | "query">,
	res: VercelResponse,
) {
	res.setHeader("access-control-allow-origin", "*");
	if (req.method === "OPTIONS") {
		res.setHeader("access-control-allow-methods", "GET, HEAD, OPTIONS");
		return res.status(204).end();
	}
	if (req.method !== "GET" && req.method !== "HEAD") {
		res.setHeader("allow", "GET, HEAD, OPTIONS");
		return res.status(405).end();
	}
	res.setHeader("x-content-type-options", "nosniff");
	let url: URL;
	try {
		url = publicUrl(typeof req.query.url === "string" ? req.query.url : "");
	} catch {
		return res
			.status(400)
			.json({ message: "A public HTTP(S) URL is required" });
	}
	try {
		const { metadata, responseUrl } = await fetchPageMetadata(url.href);
		let image: string | undefined;
		if (metadata.image) {
			try {
				const resource = await fetchPublicResource(
					new URL(metadata.image, responseUrl).href,
					{ maxBytes: 4 * 1024 * 1024, accept: "image/*" },
				);
				if (!resource.contentType.toLowerCase().startsWith("image/"))
					throw new Error("Not an image");
				const thumbnail = await sharp(resource.body, {
					limitInputPixels: 25_000_000,
					pages: 1,
				})
					.rotate()
					.resize(320, 320, { fit: "cover", withoutEnlargement: true })
					.webp({ quality: 80 })
					.toBuffer();
				image = `data:image/webp;base64,${thumbnail.toString("base64")}`;
			} catch {
				/* A missing thumbnail must not hide the link title. */
			}
		}
		res.setHeader("content-type", "image/svg+xml; charset=utf-8");
		res.setHeader(
			"cache-control",
			"public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
		);
		return res
			.status(200)
			.send(generateSvg({ ...metadata, url: responseUrl, image }));
	} catch (error) {
		res.setHeader("cache-control", "no-store");
		res.setHeader("content-type", "image/svg+xml; charset=utf-8");
		return res
			.status(
				error instanceof ResourceError && error.statusCode === 400 ? 400 : 502,
			)
			.send(
				generateSvg({
					url: url.href,
					title: "プレビューを取得できませんでした",
					description: "リンクを開いてページをご覧ください。",
				}),
			);
	}
}
