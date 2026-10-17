// File: lib/notionai.js

async function chatWithNotionAI(prompt, modelName) {
  const url = 'https://ai.hilderanonline.web.id/v1/chat/completions';
  const apiKey = process.env.NOTIONAI_KEY || 'ISI_API_KEY_DISINI';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        // User-Agent penting untuk menembus Cloudflare Tunnel
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        stream: false // Di-set true sesuai permintaan
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    // Membaca balasan Stream (Server-Sent Events)
    let fullText = '';
    const decoder = new TextDecoder('utf-8');

    for await (const chunk of response.body) {
      const decodedChunk = decoder.decode(chunk, { stream: true });
      const lines = decodedChunk.split('\n');

      for (const line of lines) {
        if (line.trim() === '' || line.includes('[DONE]')) continue;
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.replace('data: ', ''));
            if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
              fullText += data.choices[0].delta.content;
            }
          } catch (e) {
            // Abaikan error parse JSON pada chunk yang tidak lengkap
          }
        }
      }
    }

    return fullText;
  } catch (error) {
    console.error(`NotionAI Error (${modelName}):`, error);
    throw error;
  }
}

module.exports = { chatWithNotionAI };