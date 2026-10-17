const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

let handler = async (m, { conn }) => {
  try {
    // Memberikan reaksi atau pesan tunggu karena fetch via curl mungkin butuh 1-2 detik
    await m.reply(wait);

    // Perintah bash yang Anda berikan
    const command = 'curl -fsSL https://raw.githubusercontent.com/dylanaraps/neofetch/master/neofetch | bash -s -- --stdout';
    
    // Mengeksekusi perintah di terminal
    const { stdout, stderr } = await execPromise(command);

    if (stderr && !stdout) {
      console.log('Stderr:', stderr);
    }

    // Mengirimkan hasil output (stdout) dari neofetch ke WhatsApp
    m.reply(stdout.trim());
    
  } catch (e) {
    console.error(e);
    m.reply(`❌ Gagal mengambil data sistem!\n\n*Error:* ${e.message}`);
  }
}

handler.help = ['neofetch']
handler.tags = ['info']
handler.command = ['neofetch']

module.exports = handler