import { chromium } from 'playwright';
import { dismissCookiePopup } from './src/scraper/parser.js';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://www.rightmove.co.uk/', { waitUntil: 'networkidle', timeout: 30000 });
  await dismissCookiePopup(page);
  
  await page.click('button:has-text("Buy")');
  await page.waitForTimeout(500);
  
  const input = page.locator('input[name="locationSearch"]').first();
  await input.fill('E1');
  await page.waitForTimeout(1000);
  
  const searchBtn = page.locator('button:has-text("Search")').first();
  await searchBtn.click();
  
  await page.waitForURL(/property-for-sale/, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
  
  console.log('Final URL:', page.url());
  
  const match = page.url().match(/locationIdentifier=([^&]+)/);
  if (match) {
    console.log('Location Identifier:', decodeURIComponent(match[1]));
  }
  
  await browser.close();
}

test().catch(console.error);
