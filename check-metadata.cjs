// Dependency-free checks for this single-page static deployment.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = __dirname;
const origin = 'https://bonjour-quest-matei11.vercel.app';
const canonical = origin + '/';
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function attrs(tag) {
  const result = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) result[match[1].toLowerCase()] = decode(match[2] ?? match[3]);
  return result;
}
function check(html, robots, sitemap, allowMissingImage = false) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
  assert.ok(head, 'Missing head');
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map(match => attrs(match[0]));
  function meta(key, property = true) {
    const entries = metas.filter(item => item[property ? 'property' : 'name'] === key);
    assert.equal(entries.length, 1, `Expected exactly one ${key}`);
    assert.ok(entries[0].content?.trim(), `Empty ${key}`);
    return entries[0].content;
  }
  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map(match => attrs(match[0])).filter(item => item.rel?.split(/\s+/).includes('canonical'));
  assert.equal(links.length, 1, 'Expected exactly one canonical link');
  assert.equal(links[0].href, canonical, 'Canonical must use the deployed homepage');
  const title = decode(head.match(/<title>([^<]*)<\/title>/i)?.[1] || '');
  assert.equal(title, 'Bonjour Quest — Play & learn French');
  assert.equal(meta('og:title'), title, 'OG title must match page title');
  assert.equal(meta('og:description'), meta('description', false), 'OG description must match page description');
  assert.equal(meta('og:site_name'), 'Bonjour Quest');
  assert.equal(meta('og:type'), 'website');
  assert.equal(meta('og:url'), canonical);
  assert.equal(meta('og:locale'), 'en_US');
  const imagePresent = metas.some(item => item.property === 'og:image');
  if (!allowMissingImage || imagePresent) {
    assert.ok(imagePresent, 'Missing og:image: supply a real share-image path or public URL; do not invent one');
    const image = new URL(meta('og:image'));
    assert.equal(image.protocol, 'https:', 'Share image must use absolute HTTPS');
    assert.ok(!/placeholder|example\.com/i.test(image.href), 'Placeholder image URL');
    assert.ok(meta('og:image:alt').trim(), 'Share image needs an accurate text alternative');
    if (image.origin === origin) {
      assert.equal(image.search, '', 'Use a stable image path');
      const file = path.resolve(root, '.' + decodeURIComponent(image.pathname));
      assert.ok(file.startsWith(root + path.sep), 'Image must be within the site');
      assert.ok(fs.existsSync(file) && fs.statSync(file).isFile(), 'Local share image must exist');
    }
  }
  assert.equal(robots.trim().replace(/\r/g, ''), `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml`, 'Unexpected crawler policy or sitemap URL');
  assert.match(sitemap, /<urlset\s+xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"\s*>/);
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(locations, [canonical], 'Sitemap must list only the existing homepage');
  assert.equal((sitemap.match(/<url>/g) || []).length, 1, 'Unexpected sitemap entries');
}
const html = read('index.html'), robots = read('robots.txt'), sitemap = read('sitemap.xml');
const args = process.argv.slice(2);
assert.ok(args.every(arg => arg === '--allow-missing-image'), 'Unknown option');
const allowMissingImage = args.includes('--allow-missing-image');
try {
  check(html, robots, sitemap, allowMissingImage);
  // Prove the check catches representative regressions rather than only today's files.
  assert.throws(() => check(html.replace('rel="canonical"', 'rel="alternate"'), robots, sitemap, true));
  assert.throws(() => check(html.replace('property="og:title"', 'property="unused"'), robots, sitemap, true));
  assert.throws(() => check(html, robots.replace('Allow: /', 'Disallow: /'), sitemap, true));
  assert.throws(() => check(html, robots, sitemap.replace('</urlset>', '<url><loc>' + origin + '/missing</loc></url></urlset>'), true));
  console.log(allowMissingImage ? 'PASS: canonical, text metadata, crawler files and regression cases. Image requirement explicitly deferred; run without --allow-missing-image for complete validation.' : 'PASS: required metadata, share-image declaration, crawler files and regression cases.');
} catch (error) {
  console.error('FAIL:', error.message);
  process.exitCode = 1;
}
