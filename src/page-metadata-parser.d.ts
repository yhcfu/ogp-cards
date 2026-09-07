declare module "page-metadata-parser" {
	export function getMetadata(
		document: object,
		url: string,
	): import("./metadata").IPageMetadata;
}
