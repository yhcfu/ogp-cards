import he from "he";

export type Card = {
	title?: string;
	description?: string;
	provider?: string;
	url: string;
	image?: string;
};

const text = (value: string | undefined) =>
	he.encode((value ?? "").replace(/\s+/g, " ").trim());

export function generateSvg(card: Card): string {
	const hostname = new URL(card.url).hostname.replace(/^www\./, "");
	const image =
		card.image && /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(card.image)
			? `<img src="${card.image}" alt="" />`
			: "";
	return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="160" viewBox="0 0 640 160" role="img" aria-label="${text(card.title || hostname)}">
<foreignObject width="640" height="160">
<div xmlns="http://www.w3.org/1999/xhtml">
<style>
*{box-sizing:border-box}body{margin:0}.card{display:flex;width:640px;height:160px;border:0;border-radius:18px;overflow:hidden;background:#e8ecf3;color:#263449;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",sans-serif;-webkit-font-smoothing:antialiased}.media{flex:0 0 160px;width:160px;height:160px;background:#dde3ed;border-right:0;display:flex;align-items:center;justify-content:center}.media img{width:100%;height:100%;object-fit:cover;display:block}.placeholder{width:34px;height:34px;color:#536176}.content{min-width:0;flex:1;padding:15px 17px;display:flex;flex-direction:column;justify-content:center;gap:4px}.site{font-size:16px;line-height:20px;color:#536176;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.title{font-size:18px;line-height:23px;font-weight:500;color:#263449}.description{font-size:16px;line-height:21px;color:#536176}.title,.description{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere}
</style>
<div class="card"><div class="media">${image || '<svg class="placeholder" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m3 16 5-5 5 5 3-3 5 5"/><circle cx="15.5" cy="8" r="1.5"/></svg>'}</div><div class="content"><div class="site">${text(hostname)}</div><div class="title">${text(card.title || hostname)}</div>${card.description ? `<div class="description">${text(card.description)}</div>` : ""}</div></div>
</div></foreignObject></svg>`;
}
