/**
 * Kimi scrapper (Modified for WhatsApp Bot)
 * By : CraXID Project
 * Web : https://crax.my.id
 * Site : kimi.com
 */

// Token langsung disematkan (Hardcoded) - Sudah digabung dalam satu baris
const TOKEN = global.kimi

// token generated 4 agu. 2026

const BASE = "https://kimi.moonshot.cn";

const HEADERS = {
  "Authorization": `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
  "Referer": "https://kimi.com/"
};

async function createChat(name = "WA Bot Session") {
  try {
    const r = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ name, is_example: false })
    });
    
    if (!r.ok) {
        throw new Error(`HTTP ${r.status} - ${await r.text()}`);
    }
    
    const j = await r.json();
    if (j.error_type) throw new Error(`Create chat failed: ${j.message}`);
    return j.id;
  } catch (e) {
    throw new Error(`Gagal membuat sesi Kimi baru: ${e.message}`);
  }
}

async function chatWithKimi(prompt, chatId = null) {
  // Jika tidak ada ID, buat sesi baru (Kimi mendukung auto-create dengan baik)
  const id = chatId || await createChat();

  const body = {
    messages: [{ role: "user", content: prompt }],
    model: "kimi",
    use_search: true, // Diaktifkan secara default agar bisa browsing
    kimiplus_infos: [{ id: "thinking", enabled: true }] // Mengaktifkan mode berpikir
  };

  const r = await fetch(`${BASE}/api/chat/${id}/completion/stream`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body)
  });

  if (!r.ok) {
    const errText = await r.text();
    throw new Error(`Gagal memproses pesan (HTTP ${r.status}): ${errText}`);
  }

  let fullText = "";
  let refs = [];
  const decoder = new TextDecoder();
  const reader = r.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split("\n");
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const j = JSON.parse(line.slice(6));

        // Menggabungkan pesan balasan
        if (j.event === "cmpl" && j.text) {
          fullText += j.text;
        }

        // Menangkap sumber referensi pencarian
        if (j.event === "search_plus" && j.refs) {
          refs = j.refs;
        }

        // Menangkap error dari stream
        if (j.event === "error") {
          throw new Error(`Kimi Error: ${j.message}`);
        }
      } catch (e) {
        if (e.message.startsWith("Kimi Error")) throw e;
      }
    }
  }

  // Jika ada referensi dari web, format dan tambahkan di bawah pesan
  if (refs.length > 0) {
    fullText += "\n\n*Sumber:*";
    refs.forEach((ref, i) => {
      fullText += `\n${i + 1}. ${ref.title}\n(${ref.url})`;
    });
  }

  return { chatId: id, text: fullText.trim() };
}

module.exports = { chatWithKimi };