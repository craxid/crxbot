/*
  Create: t.me/AwasPhpJir
  RestApis: api.ikyyxd.my.id
  Note: Menggunakan 2step & bypass cloudflare
*/

const https = require('https');
const { URL } = require('url');

class SoundloadersScraper {
  constructor() {
    this.cfApiUrl = 'https://api.ikyyxd.my.id/bypass/turnstile-cf-min';
    this.turnstileSiteKey = '0x4AAAAAADdgLDfT5kFRbt_5';
    this.targetUrl = 'https://soundloaders.app';
    this.userAgent = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36';
    this.cookies = new Map();
  }

  _log(...args) { console.error(`[${new Date().toISOString().slice(11, 19)}]`, ...args); }

  _parseCookies(headers) {
    const setCookies = headers['set-cookie'];
    if (!setCookies) return;
    (Array.isArray(setCookies) ? setCookies : [setCookies]).forEach(cookieStr => {
      const [nameValue] = cookieStr.split(';');
      const [name, ...rest] = nameValue.split('=');
      if (name) this.cookies.set(name.trim(), rest.join('=').trim());
    });
  }

  _getCookieString() {
    return Array.from(this.cookies.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  }

  async solveTurnstile(targetPageUrl) {
    this._log('🛡️ [CF] Bypass Turnstile via Ikyyxd API...');
    const apiUrl = new URL(this.cfApiUrl);
    apiUrl.searchParams.append('url', targetPageUrl);
    apiUrl.searchParams.append('sitekey', this.turnstileSiteKey);

    return new Promise((resolve, reject) => {
      const req = https.request(apiUrl, {
        method: 'GET', timeout: 60000,
        headers: { 'Accept': 'application/json', 'User-Agent': this.userAgent }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.status && json.result && json.result.token) {
              resolve(json.result.token);
            } else { reject(new Error(`CF API Error: ${JSON.stringify(json)}`)); }
          } catch (e) { reject(new Error(`CF Parse Error: ${e.message}`)); }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('CF Timeout')); });
      req.end();
    });
  }

  _makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
      if (this.cookies.size > 0) options.headers['Cookie'] = this._getCookieString();

      const req = https.request(options, (res) => {
        this._parseCookies(res.headers);
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
      });
      req.on('error', reject);
      if (postData) req.write(postData);
      req.end();
    });
  }

  async step1_GetPreview(spotifyUrl, cfToken) {
    this._log('🚀 [Step 1] Fetching track info...');
    const payload = new URLSearchParams();
    payload.append('url', spotifyUrl);
    payload.append('cftoken', cfToken);

    const options = {
      hostname: 'soundloaders.app', path: '/action', method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload.toString()),
        'User-Agent': this.userAgent,
        'Referer': this.targetUrl + '/',
        'Origin': this.targetUrl
      }
    };

    const res = await this._makeRequest(options, payload.toString());
    if (res.status !== 200) throw new Error(`Step 1 HTTP ${res.status}`);
    
    const json = JSON.parse(res.body);
    if (!json.status || !json.html) throw new Error('Invalid Step 1 Response');
    
    const html = json.html;

    const tokenMatch = html.match(/<input[^>]+name=["']track_token["'][^>]+value=["']([^"']+)["']/i) ||
                       html.match(/track_token["']?\s*[:=]\s*["']([a-zA-Z0-9]+)["']/i);
    
    const dataMatch = html.match(/<input[^>]+name=["']data["'][^>]+value=["']([^"']+)["']/i) ||
                      html.match(/data["']?\s*[:=]\s*["']([A-Za-z0-9+/=]+)["']/i);

    if (!tokenMatch || !dataMatch) throw new Error('Failed to extract tokens from HTML');

    const titleMatch = html.match(/<h2[^>]*class="[^"]*font-bold[^"]*"[^>]*>([^<]+)<\/h2>/i) || 
                       html.match(/alt="([^"]+)"[^>]*class="[^"]*w-40/i);
    const artistMatch = html.match(/<p[^>]*class="[^"]*text-sm[^"]*"[^>]*>([^<]+)<\/p>/i);

    const title = titleMatch ? titleMatch[1].trim() : 'Unknown Title';
    const artist = artistMatch ? artistMatch[1].trim() : 'Unknown Artist';

    return { trackToken: tokenMatch[1], dataPayload: dataMatch[1], title, artist };
  }

  async step2_GetDownloadLink(trackToken, dataPayload) {
    this._log('📥 [Step 2] Generating download link...');
    const payload = new URLSearchParams();
    payload.append('data', dataPayload);
    payload.append('track_token', trackToken);

    const options = {
      hostname: 'soundloaders.app', path: '/action/tracks', method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload.toString()),
        'User-Agent': this.userAgent,
        'Referer': this.targetUrl + '/action',
        'Origin': this.targetUrl,
        'Accept': 'application/json, text/javascript, */*; q=0.01'
      }
    };

    const res = await this._makeRequest(options, payload.toString());
    if (res.status !== 200) throw new Error(`Step 2 HTTP ${res.status}`);

    let content = res.body;
    try {
      const json = JSON.parse(content);
      if (json.status === false) throw new Error(json.error || 'Server rejected request');
      if (json.url) return { mp3: json.url, cover: null };
      if (json.html) content = json.html;
    } catch (e) {
      if (e.message.includes('Server rejected')) throw e;
    }

    const mp3Match = content.match(/<a\s+id=["']popup["'][^>]+href=["']([^"']+)["'][^>]*>\s*Download Mp3/i);
    const coverMatch = content.match(/<a\s+id=["']popup["'][^>]+href=["']([^"']+)["'][^>]*>\s*Download Cover/i);

    const mp3Url = mp3Match ? mp3Match[1] : null;
    const coverUrl = coverMatch ? coverMatch[1] : null;

    if (!mp3Url) {
      const fallback = content.match(/href=["'](https:\/\/dl\.soundloaders\.app\/[^"']+)["']/i);
      if (fallback) return { mp3: fallback[1], cover: coverUrl };
      throw new Error('MP3 Link not found in final HTML');
    }

    return { mp3: mp3Url, cover: coverUrl };
  }

  async download(spotifyUrl) {
    try {
      const cfToken = await this.solveTurnstile(this.targetUrl);
      await new Promise(r => setTimeout(r, 800));
      
      const step1 = await this.step1_GetPreview(spotifyUrl, cfToken);
      await new Promise(r => setTimeout(r, 1200));
      
      const links = await this.step2_GetDownloadLink(step1.trackToken, step1.dataPayload);
      
      return {
        status: true,
        message: "Success",
        data: {
          title: step1.title,
          artist: step1.artist,
          download_url: links.mp3,
          cover_url: links.cover,
          source: spotifyUrl,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        status: false,
        message: error.message,
        data: null,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Ekspor class agar bisa digunakan oleh file lain (terutama handler bot)
module.exports = SoundloadersScraper;