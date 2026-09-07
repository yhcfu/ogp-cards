import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import { generateSvg } from "../src/image/ogpSvg";
import {
	fetchPublicResource,
	isPublicAddress,
	publicUrl,
	readLimited,
} from "../src/network";

test("card escapes fetched metadata and accepts only encoded thumbnail pixels", () => {
	const svg = generateSvg({
		url: "https://example.com/long/path",
		title: '<script>alert("x")</script>',
		description: "a & b <style>bad</style>",
		image: "https://evil.example/track.svg",
	});
	assert.ok(!svg.includes("<script>"));
	assert.ok(!svg.includes("<style>bad"));
	assert.ok(svg.includes("&#x3C;script&#x3E;"));
	assert.ok(!svg.includes("evil.example"));
	assert.ok(!svg.includes("/long/path"));
	assert.ok(svg.includes("example.com"));
});

test("metadata-free pages retain a readable domain and image placeholder", () => {
	const svg = generateSvg({ url: "https://www.example.com/" });
	assert.match(svg, /class="title">example.com</);
	assert.match(svg, /class="placeholder"/);
	assert.doesNotMatch(svg, /undefined|null/);
});

test("public URL boundary rejects credentials, other protocols, and alternate ports", () => {
	for (const url of [
		"file:///etc/passwd",
		"https://a:b@example.com/",
		"https://example.com:444/",
		"http://localhost/",
	])
		assert.throws(() => publicUrl(url));
	assert.equal(
		publicUrl("https://example.com/a%20b#section").href,
		"https://example.com/a%20b",
	);
});

test("address boundary rejects loopback, private, link local, mapped IPv4, and multicast", () => {
	for (const address of [
		"127.0.0.1",
		"10.0.0.1",
		"172.16.0.1",
		"192.168.0.1",
		"169.254.169.254",
		"100.64.0.1",
		"224.0.0.1",
		"::1",
		"fc00::1",
		"fe80::1",
		"::ffff:127.0.0.1",
		"not an ip",
	])
		assert.equal(isPublicAddress(address), false, address);
	assert.equal(isPublicAddress("1.1.1.1"), true);
	assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
});

test("private destinations are rejected before an HTTP connection", async () => {
	await assert.rejects(
		fetchPublicResource("http://127.0.0.1/", {
			maxBytes: 100,
			accept: "text/html",
		}),
		/Private and reserved/,
	);
});

test("stream reader enforces the body limit across chunks", async () => {
	assert.equal(
		(
			await readLimited(
				Readable.from([Buffer.from("abc"), Buffer.from("de")]),
				5,
			)
		).toString(),
		"abcde",
	);
	await assert.rejects(
		readLimited(Readable.from([Buffer.from("abc"), Buffer.from("def")]), 5),
		/too large/,
	);
});
