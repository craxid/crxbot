const fetch = require('node-fetch');

const handler = async (m, { text, usedPrefix, command }) => {
  if (!text) {
    throw `Masukkan domain!\n\n*Contoh:* ${usedPrefix + command} crax.my.id`;
  }
  try {
    const response = await fetch(`https://api.siputzx.my.id/api/tools/dns?domain=${text}`);
    const data = await response.json();
    const records = data.data.records;
    const txtRecords = records.txt.response.answer.map((record) => record.record.strings.join(', ')).join('\n- ');
    const cnameRecords = records.cname.response.answer.length > 0 ? records.cname.response.answer.map((record) => `- ${record.record.target}`).join('\n') : 'Tidak ditemukan';
    const mxRecords = records.mx.response.answer.map((record) => `- ${record.record.priority} ${record.record.target}`).join('\n');
    const nsRecords = records.ns.response.answer.map((record) => `- ${record.record.target}`).join('\n');
    const soaRecord = records.soa.response.answer[0].record;
    m.reply(`*DNS Lookup ${text}*\n\n` +
      `*Punycode Domain:* ${data.data.punycodeDomain}\n` +
      `*Unicode Domain:* ${data.data.unicodeDomain}\n\n` +
      `*Records A:*\n` + records.a.response.answer.map((record) => `- ${record.record.ipv4}`).join('\n') + `\n` +
      `*Records AAAA:*\n` + records.aaaa.response.answer.map((record) => `- ${record.record.ipv6}`).join('\n') + `\n` +
      `*Records CNAME:*\n` + cnameRecords + `\n` +
      `*Records MX:*\n` + mxRecords + `\n` +
      `*Records TXT:*\n- ` + txtRecords + `\n` +
      `*Records NS:*\n` + nsRecords + `\n` +
      `*Records SOA:*\n` +
      `- Host: ${soaRecord.host}\n` +
      `- Admin: ${soaRecord.admin}\n` +
      `- Serial: ${soaRecord.serial}\n` +
      `- Refresh: ${soaRecord.refresh}\n` +
      `- Retry: ${soaRecord.retry}\n` +
      `- Expire: ${soaRecord.expire}\n` +
      `- Minimum: ${soaRecord.minimum}`
    );
  } catch (error) {
    console.error(error);
    m.reply('Gagal mengambil data DNS');
  }
}

handler.command = handler.help = ['dns'];
handler.tags = ['tools'];
handler.premium = false;
handler.limit = 1;
handler.restrict = true;

module.exports = handler;