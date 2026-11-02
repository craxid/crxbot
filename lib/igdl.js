/*
 * Plugins : iGram
 * Author  : @ai1
 * Date    : 4 Agustus 2026
 * Source  : https://api.andaraz.com/snippets/ai1/igram
 * Note    : Dapat disalin dan digunakan secara bebas.
 * © 2026 All Rights Reserved.
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

function generateRandomIP() {
    const ranges = [
        [1, 1], [2, 2], [5, 5], [23, 23], [27, 27], [31, 31], [36, 36], [37, 37], [39, 39], [42, 42],
        [46, 46], [49, 49], [50, 50], [60, 60], [114, 114], [117, 117], [118, 118], [119, 119], [120, 120],
        [121, 121], [122, 122], [123, 123], [124, 124], [125, 125], [126, 126], [180, 180], [182, 182], [183, 183]
    ];
    const range = ranges[Math.floor(Math.random() * ranges.length)];
    const ip = [
        range[0],
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256)
    ].join('.');
    return ip;
}

const toolDefinition = {
  name: 'igram_tools',
  description: 'Download Instagram videos using igram.world via Puppeteer API interception.',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The Instagram URL to download.',
      }
    },
    required: ['url'],
  },
};

async function handler({ url }) {
  if (!url) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: "URL is required" }) }],
      isError: true
    };
  }

  const spoofedIp = generateRandomIP();

  const browser = await puppeteer.launch({
    executablePath: '/data/data/com.termux/files/usr/bin/chromium-browser', // Pastikan path ini benar ya baka!
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-zygote',
      '--single-process'
    ],
    headless: true
  });

  try {
    const page = await browser.newPage();
    
    await page.setRequestInterception(true);
    page.on('request', interceptedRequest => {
        const headers = interceptedRequest.headers();
        headers['X-Forwarded-For'] = spoofedIp;
        headers['X-Real-IP'] = spoofedIp;
        headers['Client-IP'] = spoofedIp;
        headers['True-Client-IP'] = spoofedIp;
        headers['X-Originating-IP'] = spoofedIp;
        headers['X-Cluster-Client-IP'] = spoofedIp;
        headers['Forwarded'] = `for=${spoofedIp}`;
        
        if (interceptedRequest.isNavigationRequest()) {
            interceptedRequest.continue({ headers });
        } else {
            interceptedRequest.continue({ headers });
        }
    });

    let apiResolve;
    const apiPromise = new Promise((resolve) => {
        apiResolve = resolve;
    });

    page.on('response', async (response) => {
        const reqUrl = response.url();
        if (reqUrl.includes('/api/convert') && response.request().method() === 'POST') {
            try {
                const json = await response.json();
                apiResolve(json);
            } catch (e) {
            }
        }
    });

    await page.goto('https://igram.world/', { waitUntil: 'domcontentloaded', timeout: 0 });

    const inputSelector = '#search-form-input';
    const buttonSelector = 'button.search-form__button';

    await page.waitForSelector(inputSelector, { timeout: 0 });
    
    await page.evaluate((text, selector) => {
        const input = document.querySelector(selector);
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }, url, inputSelector);

    await page.waitForSelector(`${buttonSelector}:not([disabled])`, { timeout: 0 });

    await page.evaluate((selector) => {
        document.querySelector(selector).click();
    }, buttonSelector);

    const jsonResponse = await apiPromise;

    if (jsonResponse && jsonResponse.meta && jsonResponse.meta.dash_manifest) {
        delete jsonResponse.meta.dash_manifest;
    }

    await browser.close();

    return {
      content: [{ type: 'text', text: JSON.stringify(jsonResponse, null, 2) }]
    };

  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    return {
      content: [{ type: 'text', text: JSON.stringify({ status: false, error: error.message }, null, 2) }],
      isError: true
    };
  }
}

module.exports = { toolDefinition, handler };