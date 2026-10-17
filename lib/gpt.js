// lib/gpt.js

async function requestChatGPTInvite() {
  try {
    // 1. Mengambil session dan accessToken
    const sessionResponse = await fetch("https://chatgpt.com/api/auth/session", {
      method: "GET",
      credentials: "include"
    });
    
    const sessionData = await sessionResponse.json();
    const accessToken = sessionData.accessToken;
    
    if (!accessToken) {
      throw new Error("Failed to obtain accessToken. Sesi mungkin tidak valid atau tidak ada cookie.");
    }
    
    console.log("AccessToken acquired, sending invitation request...");
    
    // 2. Mengirim request invitation
    const inviteResponse = await fetch("https://chatgpt.com/backend-api/accounts/5e4c9b31-1b4e-4887-839b-607597928d7c/invites/request", {
      method: "POST",
      headers: {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9",
        "authorization": `Bearer ${accessToken}`,
        "cache-control": "no-cache",
        "oai-language": "en-US",
        "pragma": "no-cache",
        "sec-ch-ua-arch": "\"x86\"",
        "sec-ch-ua-bitness": "\"64\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-model": "\"\"",
        "sec-ch-ua-platform": "\"macOS\"",
        "sec-ch-ua-platform-version": "\"13.5.1\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin"
      },
      referrer: "https://chatgpt.com/k12-verification",
      referrerPolicy: "strict-origin-when-cross-origin",
      body: null,
      mode: "cors",
      credentials: "include"
    });

    const result = await inviteResponse.json();
    console.log("Invitation request successful:", result);
    
    return result; // Mengembalikan hasil ke pemanggil

  } catch (error) {
    console.error("Request failed in gpt.js:", error.message);
    throw error; // Lempar error agar bisa ditangkap oleh handler pemanggil
  }
}

// Ekspor fungsi agar bisa dipanggil dari file lain
module.exports = { requestChatGPTInvite };