// ===============================
// GitHub OAuth 認証（Web Application Flow）
// ===============================

// ★ あなたの GitHub OAuth App の設定をここに入れる
const CLIENT_ID = "Ov23liDnkKNkGR6q4wTj";
const REDIRECT_URI = "https://ron-since-2209.github.io/CarpeDiemPublic/";  // 認可後に戻る URL
const BACKEND_TOKEN_ENDPOINT = window.location.origin + window.location.pathname; 
// ↑ Authorization Code をアクセストークンに交換するあなたのバックエンド

// ===============================
// 1. GitHub 認可画面へリダイレクト
// ===============================
document.getElementById("login-btn").addEventListener("click", () => {
  const githubAuthUrl =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=public_repo`;  // PrivateRepo を読む際には repo 権限が必要 (auth.jsは不要)

  window.location.href = githubAuthUrl;
});

// ===============================
// 2. 認可後のリダイレクトで code を取得
// ===============================
function getAuthorizationCode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("code");
}

// ===============================
// 3. code をバックエンドに送ってアクセストークンを取得
// ===============================
async function exchangeCodeForToken(code) {
  const response = await fetch(BACKEND_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  });

  const data = await response.json();
  return data.access_token;  // バックエンドが返すアクセストークン
}

// ===============================
// 4. 認証状態を UI に反映
// ===============================
async function handleOAuthFlow() {
  const code = getAuthorizationCode();
  if (!code) return;

  document.getElementById("auth-status").textContent = "認証コードを受信しました。トークン取得中…";

  try {
    const token = await exchangeCodeForToken(code);

    if (token) {
      document.getElementById("auth-status").textContent = "認証成功！データ読み込みが可能です。";
      window.accessToken = token;

      // データ読み込みセクションを表示
      document.getElementById("data-section").style.display = "block";
    } else {
      document.getElementById("auth-status").textContent = "トークン取得に失敗しました。";
    }
  } catch (err) {
    console.error(err);
    document.getElementById("auth-status").textContent = "認証処理中にエラーが発生しました。";
  }
}

// ページ読み込み時に OAuth 処理を実行
handleOAuthFlow();
