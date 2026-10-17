const fs = require("fs");
const fetch = require("node-fetch");
const { qrisDinamis } = require("qris-statis-to-dinamis");
const sharp = require("sharp");

let handler = async (m, { conn, args }) => {
  let qrisString = "00020101021126610016ID.CO.SHOPEE.WWW01189360091800228030460208228030460303UMI51440014ID.CO.QRIS.WWW0215ID10264917104750303UMI5204541153033605802ID5914CraXID Project6013JAKARTA TIMUR61051347062070703A016304E91C";

  if (!args[0]) throw "Masukkan nominalnya";
  let nominal = parseInt(args[0].replace(/\D/g, ""));
  if (isNaN(nominal) || nominal < 1) throw "Nominal harus lebih besar dari 0";

  // Memastikan direktori tmp ada agar tidak error saat write file
  if (!fs.existsSync("./tmp")) {
    fs.mkdirSync("./tmp", { recursive: true });
  }

  let filePath = "./tmp/qris_output.png";
  let croppedFilePath = "./tmp/cropped_qris_output.png";
  let finalFilePath = "./tmp/final_qris_output.png";

  try {
    // Generate QRIS
    await qrisDinamis(qrisString, nominal.toString(), { path: filePath });

    await sharp(filePath)
      .extract({ top: 100, left: 30, width: 606, height: 606 }) // (666 - 606) / 2 = 30
      .toFormat("png")
      .toFile(croppedFilePath);

    let who = m.quoted ? m.quoted.sender : m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender;

    // Menghilangkan spasi di awal URL fallback
    let pp = await conn.profilePictureUrl(who, 'image').catch((_) => 'https://craxid.github.io/icons/icon.webp');

    let res = await fetch(pp);
    if (!res.ok) throw new Error("Gagal mengambil foto profil dari URL");
    
    // Validasi tambahan untuk memastikan yang difetch benar-benar gambar, bukan HTML error page
    let contentType = res.headers.get("content-type");
    if (!contentType || !contentType.startsWith("image/")) {
        throw new Error("URL tidak mengembalikan format gambar yang valid");
    }
    let iconBuffer = await res.buffer();

    // Menambahkan xmlns pada SVG agar aman diproses oleh sharp di semua environment
    let mask = Buffer.from(`<svg width="120" height="120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="60" fill="#FFFFFF"/></svg>`, "utf-8");
    let maskBuffer = await sharp(mask).toFormat("png").toBuffer();

    let border = Buffer.from(`
      <svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="58" fill="none" stroke="#00E7FF" stroke-width="4"/>
      </svg>
    `, "utf-8");
    let borderBuffer = await sharp(border).toFormat("png").toBuffer();

    let icon = await sharp(iconBuffer)
      .resize(120, 120)
      .composite([{ input: maskBuffer, blend: "dest-in" }])
      .toFormat("png")
      .toBuffer();

    let finalIconBuffer = await sharp(icon)
      .composite([{ input: borderBuffer }])
      .toFormat("png")
      .toBuffer(); 

    let qrisWidth = 606;
    let qrisHeight = 606;
    let iconWidth = 120;
    let iconHeight = 120;
    
    // Menggunakan Math.round untuk memastikan koordinat berupa bilangan bulat
    let left = Math.round((qrisWidth - iconWidth) / 2);
    let top = Math.round((qrisHeight - iconHeight) / 2);

    await sharp(croppedFilePath)
      .composite([{ input: finalIconBuffer, top: top, left: left }])
      .toFormat("png")
      .toFile(finalFilePath);

    let caption = `🎉 *QRIS Berhasil Dibuat!* 🎉\n\n• Nominal: Rp ${nominal.toLocaleString("id-ID")},-\n• Tujuan: CraXID Project\n\nSilakan scan QRIS di atas untuk melakukan pembayaran. 📸\n\n_Pesan ini akan dihapus dalam 5 menit._`;

    let buffer = fs.readFileSync(finalFilePath);

    let sentMessage = await conn.sendMessage(m.chat, {
      image: buffer,
      caption: caption,
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true
      }
    }, { quoted: m });

    // Hapus file sementara agar tidak menumpuk di storage
    [filePath, croppedFilePath, finalFilePath].forEach((file) => {
        if (fs.existsSync(file)) fs.unlinkSync(file);
    });

    setTimeout(async () => {
        if (sentMessage && sentMessage.key) {
            await conn.sendMessage(m.chat, { delete: sentMessage.key });
        }
    }, 5 * 60 * 1000); 

  } catch (error) {
    m.reply(`❌ Terjadi kesalahan:\n${error.message || error}`);
    console.error(error);
  }
};

handler.help = ["buatqris <nominal>"];
handler.command = /^buatqris$/i;
handler.tags = ["main"];
module.exports = handler;