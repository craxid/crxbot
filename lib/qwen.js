const { randomUUID } = require('node:crypto');

// ==========================================
// CONFIGURATION (Hardcoded)
// ==========================================
const RAW_COOKIE = 'ISI_COOKIE_QWEN_DISINI';
const BX_UMIDTOKEN = 'ISI_TOKEN_DISINI';
const MODEL = 'qwen3.7-plus';
const BASE_URL = 'https://chat.qwen.ai';
const PRESET_CHAT_ID = 'ISI_CHAT_ID_DISINI'; // Pastikan ID ini valid dan aktif di browser kamu

// Parse JSON Cookie jadi string HTTP
let FORMATTED_COOKIE = '';
try {
  const cookieArr = JSON.parse(RAW_COOKIE);
  FORMATTED_COOKIE = cookieArr.map(c => `${c.name}=${c.value}`).join('; ');
} catch (e) {
  FORMATTED_COOKIE = RAW_COOKIE; 
}
// ==========================================

function buildHeaders() {
  const h = {
    'Accept':            'application/json',
    'Accept-Language':   'id-ID,id;q=0.9',
    'Content-Type':      'application/json',
    'Cookie':            FORMATTED_COOKIE,
    'Origin':            BASE_URL,
    'Referer':           `${BASE_URL}/`,
    'User-Agent':        'Mozilla/5.0 (Linux; Android 7.1.1) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
    'Version':           '0.2.66',
    'source':            'h5',
    'X-Accel-Buffering': 'no',
    'X-Request-Id':      randomUUID(),
    'Timezone':          new Date().toString(),
    'bx-v':              '2.5.36',
  };
  if (BX_UMIDTOKEN) h['bx-umidtoken'] = BX_UMIDTOKEN;
  return h;
}

function buildMessage(content) {
  return {
    fid:          randomUUID(),
    parentId:     null,
    childrenIds:  [],
    role:         'user',
    content,
    user_action:  'chat',
    files:        [],
    timestamp:    Math.floor(Date.now() / 1000),
    models:       [MODEL],
    chat_type:    't2t',
    feature_config: {
      thinking_enabled: false,
      output_schema:    'phase',
      research_mode:    'normal',
      auto_thinking:    false,
      thinking_mode:    'disabled',
      thinking_format:  'summary',
      auto_search:      false,
    },
    extra:         { meta: { subChatType: 't2t' } },
    sub_chat_type: 't2t',
  };
}

async function chatWithQwen(content, chatId = null) {
  if (!FORMATTED_COOKIE) throw new Error('Cookie kosong atau format salah.');

  // Selalu gunakan PRESET_CHAT_ID karena endpoint /new sudah ditutup oleh Qwen
  const activeChatId = chatId || PRESET_CHAT_ID;

  const body = {
    stream:             true,
    version:            '2.1',
    incremental_output: true,
    chat_id:            activeChatId,
    chat_mode:          'normal',
    model:              MODEL,
    parent_id:          null,
    messages:           [buildMessage(content)],
    timestamp:          Math.floor(Date.now() / 1000),
  };

  const res = await fetch(
    `${BASE_URL}/api/v2/chat/completions?chat_id=${activeChatId}`,
    { method: 'POST', headers: buildHeaders(), body: JSON.stringify(body) }
  );

  if (res.status === 401 || res.status === 403) {
    throw new Error(`Cookie expired (HTTP ${res.status}). Silakan ambil ulang dari browser.`);
  }
  if (!res.ok) {
    throw new Error(`HTTP Error ${res.status} saat mengirim pesan: ${await res.text()}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const raw = line.slice(5).trim();
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        if (!parsed.choices?.[0]?.delta) continue;
        const delta = parsed.choices[0].delta;

        if (delta.phase === 'thinking_summary') continue;
        if (delta.phase === 'answer' && delta.content) {
          fullResponse += delta.content;
        }
      } catch {
        // Abaikan parse error saat stream terpotong
      }
    }
  }

  return { text: fullResponse.trim(), chatId: activeChatId };
}

module.exports = { chatWithQwen };