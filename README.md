# Personal OGP cards

A self-hosted Open Graph image service for Cosense, based on [ci7lus/ricapitolare](https://github.com/ci7lus/ricapitolare). The MIT license and upstream attribution are retained.

The card follows a compact social link-preview layout: a large square thumbnail, a domain label, a two-line title and a two-line description on a light blue-gray surface with dark text. Long URLs are omitted from the image. There is no outer stroke or thumbnail divider; the softly contrasting surface itself defines the card boundary. A missing thumbnail uses a neutral placeholder.

Production: **https://ogp-cards.vercel.app**

Source: **https://github.com/yhcfu/ogp-cards**

## Use in Cosense

Use this pattern with the production domain:

```text
[https://example.com/article https://ogp-cards.vercel.app/svg?url=https%3A%2F%2Fexample.com%2Farticle#.svg]
```

The first URL is the click target. The second renders the card. `#.svg` lets Cosense recognize the response as an image. The existing `/svg?url=...` interface is preserved, so the writing UserScript only needs a new endpoint. Existing saved cards retain their previous endpoint until explicitly edited.

`GET /?url=...` returns the extracted metadata as JSON; `GET /` describes the original metadata API.

## Free personal hosting

Use a **Vercel Hobby** team and the included `vercel.app` domain. Hobby is for personal, non-commercial use, with hard usage caps rather than paid overages. Do not start a Pro trial or add paid storage, image optimization or other services for this project. Check the current [Hobby terms](https://vercel.com/docs/plans/hobby) and [pricing](https://vercel.com/pricing) before changing plans.

Requirements: Node.js 24 and pnpm 11.16.0.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm check
pnpm exec vercel link --project ogp-cards --scope YOUR-HOBBY-TEAM
pnpm exec vercel --prod --scope YOUR-HOBBY-TEAM
```

Choose the **Other** framework preset. The build command is `pnpm vercel-build`; the project uses Vercel's Node.js API functions directly. Keep the public production domain accessible without Vercel Authentication so signed-out Cosense readers can load the image. Preview deployments may remain protected. No environment variables or database are required.

## Change the design

Edit `src/image/ogpSvg.ts`. Card geometry, colors, fonts and line limits are declared together. Edit `api/svg.ts` to adjust thumbnail processing. The SVG contains its own styles and encoded image, so it does not depend on the reader's login, UserScript or external fonts.

```sh
pnpm preview:cards /tmp/ogp-preview
```

This exercises the actual endpoint handler against the Nicochannel example and writes SVGs for a real thumbnail, a missing image and a long title. It performs outbound requests. The unit tests remain offline.

## Request and resource bounds

- Only public HTTP(S) addresses on their default ports are accepted. Credentials and private/reserved DNS results are rejected, including redirect targets and image URLs. The validated address is pinned for each connection.
- Each resource request has an eight-second abort signal and at most four redirects. The Vercel function has a 30-second limit.
- HTML is limited to 2 MiB and images to 4 MiB after decompression. Images are decoded with a 25-megapixel limit and converted to at most 320 × 320 WebP pixels before embedding.
- Successful cards are cached on the CDN for one day; the browser cache lasts five minutes. This reduces work under the free tier. Site metadata updates may take a day to appear. Failed requests are not cached.
- The service fetches public pages with a crawler user agent. Some sites block remote previews or provide no metadata. A failed thumbnail does not discard a successfully fetched title.

## Verification

```sh
pnpm test
pnpm check
pnpm exec biome check src api package.json vercel.json
pnpm audit --prod
```

Deployment is a separate step from local testing. After deployment, verify the exact production `/svg?url=...` URL while signed out before switching the Cosense endpoint.

GitHub login is not yet connected to the Vercel account, so automatic deployment on Git push is not enabled. Publish updates with the CLI command above; connecting the GitHub login in Vercel account settings can enable Git integration later.
