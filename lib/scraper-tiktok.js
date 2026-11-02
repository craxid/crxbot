const fetch = require('node-fetch');
const cheerio = require('cheerio');

// Kumpulan User-Agent populer (desktop, Android, iOS)
const userAgents = [
  // Desktop
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/121.0',

  // Android
  'Mozilla/5.0 (Linux; Android 14; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; Samsung Galaxy S22) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 12; Redmi Note 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',

  // iOS
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
];

// Fungsi ambil UA random
function getRandomUA() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

async function scrapeTikTok(url) {
  const res = await fetch('https://savetik.co/api/ajaxSearch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': getRandomUA(),
      'Referer': 'https://savetik.co/',
      'Origin': 'https://savetik.co'
    },
    body: `q=${encodeURIComponent(url)}`
  });

  const json = await res.json();
  if (json.status !== 'ok') throw 'Gagal mengambil data dari savetik.co';

  const $ = cheerio.load(json.data);

  return {
    title: $('.content h3').text().trim() || 'Video TikTok',
    thumbnail: $('.image-tik img').attr('src') || 'https://i.imgur.com/0fJZp0N.png',
    videoUrl: $('a:contains("Download MP4 HD")').attr('href') ||
              $('a:contains("Download MP4 [1]")').attr('href'),
    audioUrl: $('a:contains("Download MP3")').attr('href')
  };
}

module.exports = scrapeTikTok;