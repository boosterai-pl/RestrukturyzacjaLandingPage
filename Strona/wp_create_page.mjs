import puppeteer from 'puppeteer-core';
import { readFileSync } from 'fs';

// Read the HTML content
const htmlContent = readFileSync('/tmp/wp_page_content.html', 'utf-8');
const blockContent = '<!-- wp:html -->\n' + htmlContent + '\n<!-- /wp:html -->';

// Connect to existing Chrome
const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9222'
});

// Get all pages
const pages = await browser.pages();
const wpPage = pages.find(p => p.url().includes('wp-admin'));

if (!wpPage) {
  console.error('No wp-admin page found');
  await browser.disconnect();
  process.exit(1);
}

console.log('Found WP page:', wpPage.url());

// Use wp.apiFetch to update the page
const result = await wpPage.evaluate(async (content) => {
  try {
    const res = await wp.apiFetch({
      path: '/wp/v2/pages/430',
      method: 'POST',
      data: {
        title: 'Restrukturyzacja',
        slug: 'restrukturyzacja',
        content: content,
        status: 'draft'
      }
    });
    return { success: true, id: res.id, slug: res.slug, status: res.status, link: res.link };
  } catch (e) {
    return { success: false, error: e.message };
  }
}, blockContent);

console.log('Result:', JSON.stringify(result, null, 2));

await browser.disconnect();
