import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { VercelResponse } from "@vercel/node";
import handler from "../api/svg";
import { generateSvg } from "../src/image/ogpSvg";

async function main() {
	const directory = process.argv[2];
	if (!directory) throw new Error("Pass an output directory");
	await mkdir(directory, { recursive: true });
	const url =
		"https://nicochannel.jp/not-equal-me-plus/live/smKH4XtYbE7vYVZQyfWqHK2H";
	let status = 200;
	let svg = "";
	const response = {
		setHeader() {
			return response;
		},
		status(value: number) {
			status = value;
			return response;
		},
		send(value: string) {
			svg = value;
			return response;
		},
		json(value: unknown) {
			throw new Error(JSON.stringify(value));
		},
		end() {
			return response;
		},
	};
	await handler(
		{ method: "GET", query: { url } },
		response as unknown as VercelResponse,
	);
	if (status !== 200 || !svg.includes("data:image/webp;base64,"))
		throw new Error(`Live card failed: ${status}`);
	await writeFile(path.join(directory, "nico.svg"), svg);
	await writeFile(
		path.join(directory, "no-image.svg"),
		generateSvg({
			url: "https://example.com/",
			title: "画像がないページでも、タイトルを読みやすく",
			description:
				"サイトにOGP画像が設定されていない場合も、同じ余白と文字組みで表示します。",
		}),
	);
	await writeFile(
		path.join(directory, "long-title.svg"),
		generateSvg({
			url: "https://example.com/",
			title:
				"とても長い日本語のタイトルでも、カードの中では2行に収まるようにして、説明文と重ならずに読めるようにします。",
			description:
				"説明文は控えめなグレーで2行まで。長いURLを省いて内容に集中できるカードです。",
		}),
	);
	console.log(
		`Live Nicochannel metadata and thumbnail rendered: ${Buffer.byteLength(svg)} bytes`,
	);
}
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
