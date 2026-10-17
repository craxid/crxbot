const fetch = require('node-fetch');
const cheerio = require('cheerio');

let handler = async (m, { text, conn, usedPrefix, command }) => {
  if (!text) throw `*Contoh Penggunaan:* ${usedPrefix + command} Realme 14T`;

  try {
    await m.reply(wait); 
    
    const apei = 'https://spek-dusky.vercel.app';
    
    // 1. MENCARI LINK GSMARENA VIA DUCKDUCKGO (Bypass Cloudflare)
    const query = `site:gsmarena.com ${text}`;
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    const searchRes = await fetch(ddgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const html = await searchRes.text();
    const $ = cheerio.load(html);
    
    let deviceSlug = '';

    // Cari semua link hasil pencarian DuckDuckGo
    $('a').each((i, el) => {
      let href = $(el).attr('href');
      if (href) {
        // Dekode URL (karena link DuckDuckGo biasanya ter-encode)
        try { href = decodeURIComponent(href); } catch(e) {}
        
        // Cek apakah link mengarah ke gsmarena.com
        if (href.includes('gsmarena.com')) {
          // Ambil bagian slug-nya (contoh: realme_14t-13748.php)
          const match = href.match(/[a-zA-Z0-9_()\-]+-\d+\.php/);
          if (match) {
            deviceSlug = match[0].replace('.php', '');
            return false; // Hentikan loop jika sudah ketemu
          }
        }
      }
    });

    if (!deviceSlug) {
      throw new Error(`Perangkat "${text}" tidak ditemukan. Coba masukkan tipe HP yang lebih spesifik.`);
    }

    // 2. MENGAMBIL DETAIL SPESIFIKASI MENGGUNAKAN API VERCEL KAMU
    const detailRes = await fetch(`${apei}/${deviceSlug}`);
    const detailJson = await detailRes.json();

    if (!detailJson.status) {
        throw new Error(`Gagal mengambil spesifikasi untuk perangkat ini.`);
    }

    const res = detailJson.data;
    const s = res.specifications;

    // Helper untuk membersihkan sisa tag HTML dari API
    const cleanHtml = (str) => {
        if (!str || str === 'null' || str === 'undefined') return '-';
        return String(str).replace(/<[^>]*>?/gm, '').replace(/&amp;/g, '&').trim();
    };

    // FORMAT CAPTION SPESIFIKASI
    let caption = `
*📱 ${res.model}*

*📅 Released:* ${cleanHtml(res.release_date)}
*💾 Storage:* ${cleanHtml(res.storage)}
*📐 Dimensions:* ${cleanHtml(res.dimensions)}
*🤖 OS:* ${cleanHtml(res.os)}

*🌐 NETWORK*
• Technology: ${cleanHtml(s.Network?.Technology)}
• 2G Bands: ${cleanHtml(s.Network?.['2G bands'])}
• 3G Bands: ${cleanHtml(s.Network?.['3G bands'])}
• 4G Bands: ${cleanHtml(s.Network?.['4G bands'])}
• 5G Bands: ${cleanHtml(s.Network?.['5G bands'])}
• Speed: ${cleanHtml(s.Network?.Speed)}

*🚀 LAUNCH*
• Announced: ${cleanHtml(s.Launch?.Announced)}
• Status: ${cleanHtml(s.Launch?.Status)}

*🏗️ BODY*
• Dimensions: ${cleanHtml(s.Body?.Dimensions)}
• Weight: ${cleanHtml(s.Body?.Weight)}
• Build: ${cleanHtml(s.Body?.Build)}
• SIM: ${cleanHtml(s.SIM || s.Body?.SIM)}
• Protection: ${cleanHtml(s.Body?.Features)}

*🖥️ DISPLAY*
• Type: ${cleanHtml(s.Display?.Type)}
• Size: ${cleanHtml(s.Display?.Size)}
• Resolution: ${cleanHtml(s.Display?.Resolution)}
• Protection: ${cleanHtml(s.Display?.Protection)}

*⚙️ PLATFORM*
• OS: ${cleanHtml(s.Platform?.OS)}
• Chipset: ${cleanHtml(s.Platform?.Chipset)}
• CPU: ${cleanHtml(s.Platform?.CPU)}
• GPU: ${cleanHtml(s.Platform?.GPU)}

*🗄️ MEMORY*
• Card Slot: ${cleanHtml(s.Memory?.['Card slot'])}
• Internal: ${cleanHtml(s.Memory?.Internal)}

*📸 MAIN CAMERA*
• Detail: ${cleanHtml(s['Main Camera']?.Quad || s['Main Camera']?.Triple || s['Main Camera']?.Dual || s['Main Camera']?.Single)}
• Features: ${cleanHtml(s['Main Camera']?.Features)}
• Video: ${cleanHtml(s['Main Camera']?.Video)}

*🤳 SELFIE CAMERA*
• Detail: ${cleanHtml(s['Selfie camera']?.Single || s['Selfie camera']?.Dual)}
• Video: ${cleanHtml(s['Selfie camera']?.Video)}

*🔊 SOUND*
• Loudspeaker: ${cleanHtml(s.Sound?.Loudspeaker)}
• 3.5mm Jack: ${cleanHtml(s.Sound?.['3.5mm jack'])}
• Features: ${cleanHtml(s.Sound?.Features)}

*📡 CONNECTIVITY*
• WLAN: ${cleanHtml(s.Comms?.WLAN)}
• Bluetooth: ${cleanHtml(s.Comms?.Bluetooth)}
• Positioning: ${cleanHtml(s.Comms?.Positioning)}
• NFC: ${cleanHtml(s.Comms?.NFC)}
• Radio: ${cleanHtml(s.Comms?.Radio)}
• USB: ${cleanHtml(s.Comms?.USB)}

*🧭 FEATURES*
• Sensors: ${cleanHtml(s.Features?.Sensors)}

*🔋 BATTERY*
• Type: ${cleanHtml(s.Battery?.Type)}
• Charging: ${cleanHtml(s.Battery?.Charging)}

*🇪🇺 EU LABEL*
• Energy: ${cleanHtml(s['EU LABEL']?.Energy)}
• Battery: ${cleanHtml(s['EU LABEL']?.Battery)}
• Free Fall: ${cleanHtml(s['EU LABEL']?.['Free fall'])}
• Repairability: ${cleanHtml(s['EU LABEL']?.Repairability)}

*✨ MISC*
• Colors: ${cleanHtml(s.Misc?.Colors)}
• Models: ${cleanHtml(s.Misc?.Models)}
• Price: ${cleanHtml(s.Misc?.Price)}
`.trim();

    await conn.sendPresenceUpdate('composing', m.chat);
    await conn.sendFile(m.chat, res.imageUrl, 'spec.jpg', caption, m);

  } catch (err) {
    m.reply(`❌ *Error:* ${err.message || err}`);
  }
};

handler.command = handler.help = ['spek', 'gsmarena', 'specifications', 'spesifikasi'];
handler.tags = ['internet'];
handler.premium = false;
handler.limit = true;
handler.register = true;

module.exports = handler;
