// ============================================================
// chatserver.js
// Render + WebSocket + GAS + Spreadsheet
// URL自動リンク化・画像埋め込み・未読通知対応版
// ============================================================

const express = require("express");
const { WebSocketServer, WebSocket } = require("ws");

const app = express();
const port = process.env.PORT || 3000;

const GAS_DEPLOY_URL = process.env.GAS_DEPLOY_URL;
const GAS_SHARED_SECRET = process.env.GAS_SHARED_SECRET;

const chatHistory = [];
const MAX_HISTORY = 30;

let historyLoaded = false;
let historyLoadingPromise = null;

// 管理者による再読み込みの状態
let adminReloading = false;
let messagesDuringAdminReload = [];


// ============================================================
// HTML
// ============================================================

app.get("/", function (req, res) {

  res.send(`
<!DOCTYPE html>
<html lang="ja">

<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>カスタムチャットシステム Pro</title>

<style>

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: sans-serif;
  background: #111;
  color: #fff;
}

#game-area {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
  z-index: 1;
}

#top-bar-container {
  position: absolute;
  top: 15px;
  left: 15px;
  z-index: 10;
  display: flex;
  gap: 10px;
  padding: 8px;
  background: rgba(0,0,0,0.6);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.4);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.bar-group {
  display: flex;
  gap: 4px;
  align-items: center;
}

.bar-label {
  color: #ccc;
  font-size: 11px;
  font-weight: bold;
}

#url-input {
  width: 220px;
  padding: 4px 8px;
  font-size: 12px;
  color: #fff;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 4px;
  outline: none;
}

#url-btn {
  padding: 4px 10px;
  color: white;
  background: #2196F3;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  font-size: 12px;
}

#name-input {
  width: 100px;
  padding: 4px 8px;
  font-size: 12px;
  color: #ffca28;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 4px;
  outline: none;
  font-weight: bold;
}

#chat-container {
  position: absolute;
  right: 30px;
  bottom: 30px;
  width: 320px;
  height: 260px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  background: rgba(0,0,0,0.6);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.5);
  overflow: hidden;
}

#chat-drag-bar {
  flex: 0 0 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.05);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.45);
  font-size: 14px;
  cursor: grab;
  user-select: none;
  touch-action: none;
}

#chat-drag-bar:hover {
  background: rgba(255,255,255,0.10);
  color: rgba(255,255,255,0.75);
}

#chat-drag-bar.dragging {
  cursor: grabbing;
  background: rgba(255,255,255,0.12);
  color: #fff;
}

#messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin: 0;
  padding: 10px;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

#messages li {
  padding: 6px 10px;
  color: #fff;
  font-size: 13px;
  line-height: 1.4;
  word-break: break-all;
  background: rgba(255,255,255,0.08);
  border-radius: 4px;
}

.sender {
  margin-right: 6px;
  color: #ffca28;
  font-weight: bold;
}

.timestamp {
  margin-right: 6px;
  color: #aaa;
  font-size: 10px;
}

.chat-link {
  color: #64b5f6;
  text-decoration: underline;
  overflow-wrap: anywhere;
}

.chat-link:hover {
  color: #90caf9;
}

.chat-content {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.chat-image-container {
  margin-top: 7px;
  margin-bottom: 5px;
}

.chat-image {
  display: block;
  max-width: 100%;
  max-height: 220px;
  width: auto;
  height: auto;
  border-radius: 5px;
  object-fit: contain;
  cursor: pointer;
  background: rgba(255,255,255,0.05);
}

#input-area {
  display: flex;
  flex: 0 0 auto;
  padding: 8px;
  background: rgba(0,0,0,0.4);
  border-top: 1px solid rgba(255,255,255,0.1);
}

#chat-input {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  font-size: 13px;
  color: #fff;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 4px;
  outline: none;
}

#send-btn {
  margin-left: 8px;
  padding: 6px 14px;
  color: white;
  background: #4caf50;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  font-size: 13px;
}

</style>
</head>

<body>

<div id="top-bar-container">

  <div class="bar-group">
    <span class="bar-label">URL:</span>
    <input type="text" id="url-input" value="https://example.com">
    <button id="url-btn">移動</button>
  </div>

  <div class="bar-group"
    style="margin-left:5px;border-left:1px solid rgba(255,255,255,0.2);padding-left:10px;">
    <span class="bar-label">NAME:</span>
    <input type="text" id="name-input" value="ゲスト" maxlength="10">
  </div>

</div>

<iframe id="game-area" src="https://example.com"></iframe>

<div id="chat-container">

  <div id="chat-drag-bar" title="ドラッグして移動">⋮⋮⋮</div>

  <ul id="messages"></ul>

  <div id="input-area">
    <input
      type="text"
      id="chat-input"
      placeholder="チャットを開始..."
      autocomplete="off"
    >
    <button id="send-btn">送信</button>
  </div>

</div>

<script>

// ============================================================
// DOM
// ============================================================

const gameArea = document.getElementById("game-area");
const urlInput = document.getElementById("url-input");
const urlBtn = document.getElementById("url-btn");
const nameInput = document.getElementById("name-input");
const topBar = document.getElementById("top-bar-container");

const chatContainer = document.getElementById("chat-container");
const chatDragBar = document.getElementById("chat-drag-bar");

const messages = document.getElementById("messages");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");


// ============================================================
// localStorage
// ============================================================

const STORAGE_NAME_KEY = "chatserver_saved_name";
const STORAGE_POSITION_KEY = "chatserver_saved_position";


function loadSavedName() {
  try {
    const saved = localStorage.getItem(STORAGE_NAME_KEY);
    nameInput.value =
      saved && saved.trim()
        ? saved.slice(0, 10)
        : "ゲスト";
  } catch (error) {
    nameInput.value = "ゲスト";
  }
}


function saveName() {
  const name = nameInput.value.trim() || "ゲスト";

  try {
    localStorage.setItem(
      STORAGE_NAME_KEY,
      name.slice(0, 10)
    );
  } catch (error) {
    console.warn(error);
  }
}


loadSavedName();

nameInput.addEventListener("input", saveName);

nameInput.addEventListener("change", function () {
  if (!nameInput.value.trim()) {
    nameInput.value = "ゲスト";
  }
  saveName();
});


// ============================================================
// 位置保存
// ============================================================

function saveChatPosition() {
  try {
    const rect = chatContainer.getBoundingClientRect();
    localStorage.setItem(
      STORAGE_POSITION_KEY,
      JSON.stringify({
        x: rect.left,
        y: rect.top
      })
    );
  } catch (error) {
    console.warn(error);
  }
}


function loadChatPosition() {
  try {
    const saved = localStorage.getItem(STORAGE_POSITION_KEY);

    if (!saved) return;

    const position = JSON.parse(saved);

    if (
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y)
    ) return;

    const maxX = Math.max(
      0,
      window.innerWidth - chatContainer.offsetWidth
    );

    const maxY = Math.max(
      0,
      window.innerHeight - chatContainer.offsetHeight
    );

    const x = Math.max(0, Math.min(position.x, maxX));
    const y = Math.max(0, Math.min(position.y, maxY));

    chatContainer.style.left = x + "px";
    chatContainer.style.top = y + "px";
    chatContainer.style.right = "auto";
    chatContainer.style.bottom = "auto";

  } catch (error) {
    console.warn(error);
  }
}


loadChatPosition();


// ============================================================
// ドラッグ
// ============================================================

let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;


chatDragBar.addEventListener("pointerdown", function (event) {

  if (
    event.pointerType === "mouse" &&
    event.button !== 0
  ) return;

  event.preventDefault();

  const rect = chatContainer.getBoundingClientRect();

  dragOffsetX = event.clientX - rect.left;
  dragOffsetY = event.clientY - rect.top;

  chatContainer.style.left = rect.left + "px";
  chatContainer.style.top = rect.top + "px";
  chatContainer.style.right = "auto";
  chatContainer.style.bottom = "auto";

  isDragging = true;

  chatDragBar.classList.add("dragging");

  try {
    chatDragBar.setPointerCapture(event.pointerId);
  } catch (error) {}
});


chatDragBar.addEventListener("pointermove", function (event) {

  if (!isDragging) return;

  event.preventDefault();

  const maxX = Math.max(
    0,
    window.innerWidth - chatContainer.offsetWidth
  );

  const maxY = Math.max(
    0,
    window.innerHeight - chatContainer.offsetHeight
  );

  const x = Math.max(
    0,
    Math.min(event.clientX - dragOffsetX, maxX)
  );

  const y = Math.max(
    0,
    Math.min(event.clientY - dragOffsetY, maxY)
  );

  chatContainer.style.left = x + "px";
  chatContainer.style.top = y + "px";
});


function finishDragging(event) {

  if (!isDragging) return;

  isDragging = false;
  chatDragBar.classList.remove("dragging");

  try {
    chatDragBar.releasePointerCapture(event.pointerId);
  } catch (error) {}

  saveChatPosition();
}


chatDragBar.addEventListener("pointerup", finishDragging);
chatDragBar.addEventListener("pointercancel", finishDragging);


window.addEventListener("resize", function () {

  if (!chatContainer.style.left) return;

  const rect = chatContainer.getBoundingClientRect();

  const maxX = Math.max(
    0,
    window.innerWidth - rect.width
  );

  const maxY = Math.max(
    0,
    window.innerHeight - rect.height
  );

  chatContainer.style.left =
    Math.max(0, Math.min(rect.left, maxX)) + "px";

  chatContainer.style.top =
    Math.max(0, Math.min(rect.top, maxY)) + "px";

  saveChatPosition();
});


// ============================================================
// URL変更
// ============================================================

function changeUrl() {

  let url = urlInput.value.trim();

  if (!url) return;

  if (
    !url.startsWith("http://") &&
    !url.startsWith("https://")
  ) {
    url = "https://" + url;
    urlInput.value = url;
  }

  gameArea.src = url;
  topBar.style.opacity = "0";
  topBar.style.transform = "translateY(-20px)";

  setTimeout(function () {
    topBar.style.display = "none";
  }, 500);
}


urlBtn.addEventListener("click", changeUrl);

urlInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") changeUrl();
});


// ============================================================
// 未読通知
// ============================================================

const BASE_TITLE = "カスタムチャットシステム Pro";

let unreadCount = 0;
let activeNotification = null;


function canUseNotification() {
  return (
    "Notification" in window &&
    window.isSecureContext
  );
}


function requestNotificationPermission() {

  if (!canUseNotification()) return;

  if (Notification.permission !== "default") return;

  try {
    const result = Notification.requestPermission();

    if (result && typeof result.catch === "function") {
      result.catch(function (error) {
        console.warn("通知許可エラー:", error);
      });
    }
  } catch (error) {
    console.warn("通知許可エラー:", error);
  }
}


document.addEventListener(
  "click",
  requestNotificationPermission,
  { once: true }
);


function updateUnreadTitle() {

  if (unreadCount > 0) {
    document.title =
      "(" + unreadCount + ") " + BASE_TITLE;
  } else {
    document.title = BASE_TITLE;
  }
}


function closeUnreadNotification() {

  if (activeNotification) {
    try {
      activeNotification.close();
    } catch (error) {}

    activeNotification = null;
  }
}


function resetUnreadCount() {

  unreadCount = 0;

  updateUnreadTitle();

  closeUnreadNotification();
}


function showUnreadNotification() {

  if (!canUseNotification()) return;

  if (Notification.permission !== "granted") return;

  if (unreadCount <= 0) return;

  closeUnreadNotification();

  try {

    const notification = new Notification(
      BASE_TITLE,
      {
        body:
          "新規メッセージがあります（" +
          unreadCount +
          "件）",

        tag: "chatserver-unread",

        silent: false
      }
    );

    activeNotification = notification;

    notification.onclick = function () {

      window.focus();

      resetUnreadCount();

      notification.close();
    };

    notification.onclose = function () {

      if (activeNotification === notification) {
        activeNotification = null;
      }
    };

  } catch (error) {

    console.warn("通知表示エラー:", error);
  }
}


function handleUnreadMessage(data) {

  if (data.type !== "message") return;

  if (data.isSelf === true) return;

  if (!document.hidden) return;

  unreadCount++;

  updateUnreadTitle();

  showUnreadNotification();
}


document.addEventListener(
  "visibilitychange",
  function () {

    if (!document.hidden) {
      resetUnreadCount();
    }
  }
);


window.addEventListener("focus", function () {

  if (!document.hidden) {
    resetUnreadCount();
  }
});


// ============================================================
// WebSocket
// ============================================================

const protocol =
  window.location.protocol === "https:" ? "wss:" : "ws:";

const ws = new WebSocket(
  protocol + "//" + window.location.host
);


// ============================================================
// タイムスタンプ
// ============================================================

function getJapanDateParts(date) {

  const parts = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }
  ).formatToParts(date);

  const result = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      result[part.type] = part.value;
    }
  }

  return result;
}


function formatTimestamp(value) {

  if (!value) return "";

  const date = new Date(value);

  if (isNaN(date.getTime())) return "";

  const target = getJapanDateParts(date);
  const now = getJapanDateParts(new Date());

  if (
    target.year === now.year &&
    target.month === now.month &&
    target.day === now.day
  ) {
    return target.hour + ":" + target.minute;
  }

  if (target.year === now.year) {
    return (
      target.month + "/" +
      target.day + " " +
      target.hour + ":" +
      target.minute
    );
  }

  return (
    target.year + "/" +
    target.month + "/" +
    target.day + " " +
    target.hour + ":" +
    target.minute
  );
}


// ============================================================
// 画像URL判定
// ============================================================

function isImageUrl(url) {

  try {

    const parsed = new URL(url);

    if (
      parsed.protocol !== "http:" &&
      parsed.protocol !== "https:"
    ) return false;

    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    // 通常の画像拡張子
    if (/\\.(png|jpg|jpeg|gif|webp|avif|bmp|svg)$/i.test(path)) {
      return true;
    }

    // Bing画像
    if (
      host === "th.bing.com" &&
      path.startsWith("/th/id/")
    ) {
      return true;
    }

    // Google画像のサムネイル
    if (
      host === "encrypted-tbn0.gstatic.com" ||
      host === "encrypted-tbn1.gstatic.com" ||
      host === "encrypted-tbn2.gstatic.com" ||
      host === "encrypted-tbn3.gstatic.com"
    ) {
      return true;
    }

    // Googleusercontent
    if (
      host.endsWith(".googleusercontent.com") &&
      (
        path.includes("/image") ||
        path.includes("/photo")
      )
    ) {
      return true;
    }

    // Discord CDN
    if (
      host === "cdn.discordapp.com" ||
      host === "media.discordapp.net"
    ) {
      if (
        path.includes("/attachments/") ||
        path.includes("/icons/") ||
        path.includes("/avatars/")
      ) {
        return true;
      }
    }

    // Imgur
    if (host === "i.imgur.com") {
      return true;
    }

    return false;

  } catch (error) {
    return false;
  }
}


// ============================================================
// URL自動リンク化
// http:// や https:// がなくても認識
// ============================================================

function appendRichText(container, text) {

  // 通常URLと、プロトコルなしのドメインを検出
  //
  // 対応例:
  // https://example.com
  // http://example.com
  // example.com
  // www.example.com
  // example.co.jp/path
  // example.com/image.png

  const urlRegex =
    /(?:https?:\\/\\/)?(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}(?::[0-9]{1,5})?(?:\\/[^\\s<>"']*)?(?:\\?[^\\s<>"']*)?(?:#[^\\s<>"']*)?/gi;

  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {

    const startIndex = match.index;

    // メールアドレスなどの途中をURLとして認識しない
    if (
      startIndex > 0 &&
      /[a-zA-Z0-9_@.\\/-]/.test(text.charAt(startIndex - 1))
    ) {
      continue;
    }

    let rawUrl = match[0];

    // 文末の句読点などを除外
    let trailing = "";

    while (
      rawUrl.length > 0 &&
      /[.,!?;:。、，．！？）)]/.test(
        rawUrl.charAt(rawUrl.length - 1)
      )
    ) {
      trailing =
        rawUrl.charAt(rawUrl.length - 1) +
        trailing;

      rawUrl = rawUrl.slice(0, -1);
    }

    if (!rawUrl) {
      continue;
    }

    let fullUrl = rawUrl;

    // http(s)がなければhttpsを補完
    if (!/^https?:\\/\\//i.test(fullUrl)) {
      fullUrl = "https://" + fullUrl;
    }

    // URLとして有効か確認
    try {

      const parsed = new URL(fullUrl);

      if (
        parsed.protocol !== "http:" &&
        parsed.protocol !== "https:"
      ) {
        continue;
      }

    } catch (error) {
      continue;
    }

    // URLより前の文章
    if (startIndex > lastIndex) {

      container.appendChild(
        document.createTextNode(
          text.slice(lastIndex, startIndex)
        )
      );
    }

    // 画像URLの場合
    if (isImageUrl(fullUrl)) {

      const imageContainer =
        document.createElement("div");

      imageContainer.className =
        "chat-image-container";

      const link =
        document.createElement("a");

      link.href = fullUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      const image =
        document.createElement("img");

      image.src = fullUrl;
      image.className = "chat-image";
      image.loading = "lazy";
      image.alt = "チャット画像";

      image.onerror = function () {

        const fallback =
          document.createElement("a");

        fallback.href = fullUrl;
        fallback.target = "_blank";
        fallback.rel = "noopener noreferrer";
        fallback.className = "chat-link";
        fallback.textContent = "画像を開く";

        link.replaceWith(fallback);
      };

      link.appendChild(image);

      imageContainer.appendChild(link);

      container.appendChild(imageContainer);

    } else {

      // 通常リンク
      const link =
        document.createElement("a");

      link.href = fullUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "chat-link";

      // 表示は投稿された文字列のまま
      link.textContent = rawUrl;

      container.appendChild(link);
    }

    // URL末尾に付いていた句読点を復元
    if (trailing) {

      container.appendChild(
        document.createTextNode(trailing)
      );
    }

    lastIndex = urlRegex.lastIndex;
  }

  // 最後のURLより後ろにある文章
  if (lastIndex < text.length) {

    container.appendChild(
      document.createTextNode(
        text.slice(lastIndex)
      )
    );
  }
}


// ============================================================
// 受信
// ============================================================

ws.onmessage = function (event) {

  try {

    const data = JSON.parse(event.data);

    // 管理者がGASから再読み込みしたとき、
    // 画面の履歴を受け取った履歴に入れ替える。
    if (data && data.type === "history_reset") {
      messages.replaceChildren();

      if (Array.isArray(data.messages)) {
        for (const message of data.messages) {
          ws.onmessage({
            data: JSON.stringify({
              type: "history",
              text: message.text,
              senderId: message.senderId,
              timestamp: message.timestamp
            })
          });
        }
      }

      return;
    }

    if (
      !data ||
      typeof data.text !== "string"
    ) {
      return;
    }

    const li = document.createElement("li");

    const sender = document.createElement("span");

    sender.className = "sender";

    sender.textContent =
      "[" + (data.senderId || "ゲスト") + "]";

    li.appendChild(sender);

    if (data.timestamp) {

      const timestamp =
        document.createElement("span");

      timestamp.className = "timestamp";

      timestamp.textContent =
        formatTimestamp(data.timestamp);

      li.appendChild(timestamp);
    }

    const content =
      document.createElement("div");

    content.className = "chat-content";

    appendRichText(
      content,
      String(data.text || "")
    );

    li.appendChild(content);

    messages.appendChild(li);

    while (messages.children.length > 30) {

      messages.removeChild(
        messages.firstChild
      );
    }

    messages.scrollTop =
      messages.scrollHeight;

    handleUnreadMessage(data);

  } catch (error) {

    console.error("受信エラー:", error);
  }
};


// ============================================================
// WebSocket状態
// ============================================================

ws.onopen = function () {
  console.log("WebSocket connected");
};

ws.onerror = function (error) {
  console.error("WebSocket error:", error);
};

ws.onclose = function () {
  console.log("WebSocket closed");
};


// ============================================================
// 送信
// ============================================================

function sendMessage() {

  const text = chatInput.value.trim();

  let name = nameInput.value.trim();

  if (!name) name = "ゲスト";

  if (!text) return;

  if (ws.readyState !== WebSocket.OPEN) {

    console.error("WebSocket未接続");

    return;
  }

  saveName();

  ws.send(
    JSON.stringify({
      text: text,
      name: name
    })
  );

  chatInput.value = "";
}


sendBtn.addEventListener("click", sendMessage);

chatInput.addEventListener("keydown", function (event) {

  if (
    event.key === "Enter" &&
    !event.isComposing
  ) {
    sendMessage();
  }
});


// ============================================================
// "/" shortcut
// ============================================================

window.addEventListener("keydown", function (event) {

  if (
    document.activeElement === chatInput ||
    document.activeElement === urlInput ||
    document.activeElement === nameInput
  ) return;

  if (event.key === "/") {

    event.preventDefault();

    chatInput.focus();
  }
});

</script>

</body>
</html>
  `);
});


// ============================================================
// HTTP SERVER
// ============================================================

const server = app.listen(port, function () {

  console.log("========================================");
  console.log("ChatServer 起動");
  console.log("PORT: " + port);
  console.log("========================================");

  loadHistoryFromGAS();
});


// ============================================================
// WEBSOCKET SERVER
// ============================================================

const wss = new WebSocketServer({
  server: server
});


// ============================================================
// GAS 共通通信
// ============================================================

async function callGAS(payload) {
  if (!GAS_DEPLOY_URL || !GAS_SHARED_SECRET) {
    throw new Error(
      "GAS_DEPLOY_URL または GAS_SHARED_SECRET が未設定です"
    );
  }

  const response = await fetch(GAS_DEPLOY_URL, {
    method: "POST",
    redirect: "follow",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...payload,
      secret: GAS_SHARED_SECRET
    }),
    signal: AbortSignal.timeout(20000)
  });

  if (!response.ok) {
    throw new Error("GAS HTTP " + response.status);
  }

  let data;

  try {
    data = await response.json();
  } catch (error) {
    throw new Error("GASの応答がJSONではありません");
  }

  if (!data || data.ok !== true) {
    throw new Error(
      "GASエラー: " +
      (data && typeof data.error === "string"
        ? data.error
        : "詳細不明")
    );
  }

  return data;
}


// ============================================================
// GAS 履歴取得
// ============================================================

async function loadHistoryFromGAS() {
  if (historyLoaded) {
    console.log("[GAS] 履歴はロード済みです");
    return;
  }

  if (historyLoadingPromise) {
    console.log("[GAS] 現在ロード中です");
    return historyLoadingPromise;
  }

  historyLoadingPromise = (async function () {
    try {
      console.log("[GAS] 履歴取得開始");

      const result = await callGAS({
        action: "read"
      });

      if (!Array.isArray(result.messages)) {
        throw new Error("GASの履歴形式が不正です");
      }

      // 読み込み中に届いた新着を保持
      const currentMessages = chatHistory.slice();

      chatHistory.length = 0;

      result.messages.forEach(function (message) {
        if (!message) return;

        chatHistory.push({
          text:
            message.text == null
              ? ""
              : String(message.text),

          senderId:
            message.sender_id == null ||
            message.sender_id === ""
              ? "ゲスト"
              : String(message.sender_id),

          timestamp: message.timestamp || null
        });
      });

      // 読み込み中の新着を復元
      for (const message of currentMessages) {
        const exists = chatHistory.some(function (item) {
          return (
            item.timestamp === message.timestamp &&
            item.text === message.text &&
            item.senderId === message.senderId
          );
        });

        if (!exists) {
          chatHistory.push(message);
        }
      }

      while (chatHistory.length > MAX_HISTORY) {
        chatHistory.shift();
      }

      historyLoaded = true;

      console.log(
        "[GAS] 履歴取得成功: " +
        chatHistory.length +
        "件"
      );

    } catch (error) {
      historyLoaded = false;

      console.error(
        "[GAS] 履歴取得失敗:",
        error instanceof Error ? error.message : "unknown"
      );

    } finally {
      historyLoadingPromise = null;
    }
  })();

  return historyLoadingPromise;
}


// ============================================================
// GAS メッセージ保存
// ============================================================

// 処理中のGAS保存を追跡する
const pendingGASWrites = new Set();

function saveMessageToGAS(message) {
  const promise = saveMessageToGASInternal(message);

  pendingGASWrites.add(promise);

  promise.finally(function () {
    pendingGASWrites.delete(promise);
  });

  return promise;
}

async function saveMessageToGASInternal(message) {
  try {
    await callGAS({
      action: "write",
      text: message.text,
      sender_id: message.senderId,
      timestamp: message.timestamp
    });

    console.log("[GAS] メッセージ保存成功");
    return true;

  } catch (error) {
    console.error(
      "[GAS] メッセージ保存失敗:",
      error instanceof Error ? error.message : "unknown"
    );

    return false;
  }
}

// ============================================================
// WEBSOCKET CONNECTION
// ============================================================

wss.on("connection", async function (ws) {

  console.log("[WS] Client connected");

  let initialHistorySent = false;

  const pendingMessages = [];


  // ==========================================================
  // この接続への送信
  // ==========================================================

  function sendToThisClient(data) {

    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }

    if (!initialHistorySent) {

      pendingMessages.push(data);

    } else {

      ws.send(JSON.stringify(data));
    }
  }


  ws.chatSend = sendToThisClient;


  // ==========================================================
  // メッセージ受信
  // ==========================================================

  ws.on("message", async function (rawMessage) {

    try {

      const clientData =
        JSON.parse(rawMessage.toString());

      let text = "";

      if (
        clientData &&
        typeof clientData.text === "string"
      ) {

        text = clientData.text.trim();
      }

      if (!text) return;

      let senderId = "ゲスト";

      if (
        typeof clientData.name === "string" &&
        clientData.name.trim()
      ) {

        senderId =
          clientData.name.trim().slice(0, 10);
      }

      const timestamp =
        new Date().toISOString();

      const message = {

        text: text,

        senderId: senderId,

        timestamp: timestamp

      };

      console.log(
        "[CHAT] NEW: " +
        JSON.stringify(message)
      );

      chatHistory.push(message);

      // GAS再読み込み中に届いた新着を記録する
      if (adminReloading) {
        messagesDuringAdminReload.push({ ...message });
      }

      while (chatHistory.length > MAX_HISTORY) {

        chatHistory.shift();
      }

      // 全ユーザーへ配信
      wss.clients.forEach(function (client) {

        if (client.readyState !== WebSocket.OPEN) {
          return;
        }

        const outgoingMessage = {

          type: "message",

          text: message.text,

          senderId: message.senderId,

          timestamp: message.timestamp,

          isSelf: client === ws

        };

        if (typeof client.chatSend === "function") {

          client.chatSend(outgoingMessage);

        } else {

          client.send(
            JSON.stringify(outgoingMessage)
          );
        }
      });

      scheduleBotReply(message);

      
      await saveMessageToGAS(message);

    } catch (error) {

      console.error(
        "[WS] Message error:",
        error
      );
    }
  });


  // ==========================================================
  // 初期履歴送信
  // ==========================================================

  try {

    if (!historyLoaded) {
      await loadHistoryFromGAS();
    }

    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const pendingTimestamps = new Set(

      pendingMessages

        .filter(function (item) {
          return item.type === "message";
        })

        .map(function (item) {
          return item.timestamp;
        })

    );

    const initialMessages = chatHistory.filter(
      function (message) {

        return !pendingTimestamps.has(
          message.timestamp
        );
      }
    );

    console.log(
      "[WS] 履歴を送信: " +
      initialMessages.length + "件"
    );

    for (const message of initialMessages) {

      if (ws.readyState !== WebSocket.OPEN) {
        break;
      }

      ws.send(
        JSON.stringify({

          type: "history",

          text: message.text,

          senderId: message.senderId,

          timestamp: message.timestamp

        })
      );
    }

    initialHistorySent = true;

    // 履歴送信中に届いた新着
    for (const message of pendingMessages) {

      if (ws.readyState === WebSocket.OPEN) {

        ws.send(
          JSON.stringify(message)
        );
      }
    }

    pendingMessages.length = 0;

  } catch (error) {

    console.error(
      "[WS] History error:",
      error
    );

    initialHistorySent = true;

    for (const message of pendingMessages) {

      if (ws.readyState === WebSocket.OPEN) {

        ws.send(
          JSON.stringify(message)
        );
      }
    }

    pendingMessages.length = 0;
  }


  // ==========================================================
  // 切断・エラー
  // ==========================================================

  ws.on("close", function () {

    console.log("[WS] Client disconnected");

  });

  ws.on("error", function (error) {

    console.error("[WS] Error:", error);

  });

});


// ============================================================
// チャボ：Supabase Edge Function連携
//
// 「チャボ」「ちゃぼ」で参加開始
// 投稿が30分空いたら会話終了
// 会話中は新着ごとに順番に判定
// ============================================================

const BOT_FUNCTION_URL = process.env.BOT_FUNCTION_URL;
const BOT_SHARED_SECRET = process.env.BOT_SHARED_SECRET;

const BOT_NAME = "チャボ";

const CONVERSATION_GAP_MS = 30 * 60 * 1000;

// 会話が長くなりすぎないようにする上限
const MAX_BOT_CONTEXT = 100;

// 処理待ちの上限
const MAX_BOT_QUEUE = 100;

let conversationMessages = [];
let conversationActive = false;
let conversationLastMessageAt = 0;

// 新しい会話になったら増やす
let conversationGeneration = 0;

// 新着が来るたびに増やす
let botRevision = 0;

const botQueue = [];
let botBusy = false;


// ============================================================
// 会話履歴の管理
// ============================================================

function appendConversationMessage(message) {
  conversationMessages.push({
    senderId: message.senderId,
    text: message.text,
    timestamp: message.timestamp
  });

  while (conversationMessages.length > MAX_BOT_CONTEXT) {
    conversationMessages.shift();
  }
}


function isBotMentioned(text) {
  return (
    text.includes("チャボ") ||
    text.includes("ちゃぼ")
  );
}


// ============================================================
// 新着投稿ごとに呼ばれる
// ============================================================

function scheduleBotReply(message) {
  if (!message || typeof message.text !== "string") {
    return;
  }

  // チャボ名義の投稿ではAIを起動しない。
  // 表示名だけなので、人が名乗った場合も同じ扱い。
  if (message.senderId === BOT_NAME) {
    console.log(
      "[BOT] チャボ名義の投稿なので判定しません"
    );
    return;
  }

  const now = Date.now();

  // 30分以上投稿がなければ新しい会話。
  if (
    conversationLastMessageAt > 0 &&
    now - conversationLastMessageAt >= CONVERSATION_GAP_MS
  ) {
    conversationMessages = [];
    conversationActive = false;
    conversationGeneration++;

    console.log("[BOT] 30分経過：会話を終了");
  }

  conversationLastMessageAt = now;

  // 呼ばれる前の発言も、同じ会話の流れとして記録する。
  appendConversationMessage(message);

  botRevision++;

  if (!conversationActive) {
    if (!isBotMentioned(message.text)) {
      console.log("[BOT] 呼ばれるまで待機");
      return;
    }

    conversationActive = true;

    console.log("[BOT] 呼ばれたので会話に参加");
  }

  if (!BOT_FUNCTION_URL || !BOT_SHARED_SECRET) {
    console.warn(
      "[BOT] BOT_FUNCTION_URL または BOT_SHARED_SECRET が未設定です"
    );
    return;
  }

  if (botQueue.length >= MAX_BOT_QUEUE) {
    console.error(
      "[BOT] 処理待ちが多すぎるため、この投稿の判定をスキップ"
    );
    return;
  }

  // この投稿時点までの履歴を保存。
  // 後から届いた投稿が、この判定の最新発言にならないようにする。
  botQueue.push({
    generation: conversationGeneration,
    revision: botRevision,
    messages: conversationMessages.map(function (item) {
      return { ...item };
    })
  });

  console.log(
    "[BOT] 判定を予約。待機中:",
    botQueue.length,
    "件"
  );

  processBotQueue();
}


// ============================================================
// 待機中の投稿を順番に判定する
// ============================================================

async function processBotQueue() {
  if (botBusy) return;

  botBusy = true;

  try {
    while (botQueue.length > 0) {
      const job = botQueue.shift();

      if (!job) continue;

      // 別の会話になった古い待機分は処理しない。
      if (job.generation !== conversationGeneration) {
        console.log(
          "[BOT] 古い会話の待機分を破棄"
        );
        continue;
      }

      console.log(
        "[BOT] 会話を読んで考えています...",
        "履歴:",
        job.messages.length,
        "件"
      );

      try {
        const response = await fetch(BOT_FUNCTION_URL, {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "x-bot-secret": BOT_SHARED_SECRET
          },

          body: JSON.stringify({
            messages: job.messages
          }),

          signal: AbortSignal.timeout(35000)
        });

        if (!response.ok) {
          console.error(
            "[BOT] Supabase HTTPエラー:",
            response.status
          );
          continue;
        }

        const decision = await response.json();

        // 判定中に新着が来た場合や会話が変わった場合、
        // 古い返答をチャットに流さない。
        if (
          job.generation !== conversationGeneration ||
          job.revision !== botRevision
        ) {
          console.log(
            "[BOT] 会話が進んだため、古い判定を破棄"
          );
          continue;
        }

        if (
          !decision ||
          decision.should_reply !== true ||
          typeof decision.text !== "string"
        ) {
          console.log("[BOT] 今回は見守ります");
          continue;
        }

        const text = decision.text.trim().slice(0, 300);

        if (!text) continue;

        const botMessage = {
          text: text,
          senderId: BOT_NAME,
          timestamp: new Date().toISOString()
        };

        // 画面用の通常履歴にも追加
        chatHistory.push(botMessage);

        while (chatHistory.length > MAX_HISTORY) {
          chatHistory.shift();
        }

        // AIに渡す会話履歴にも追加
        appendConversationMessage(botMessage);

        // 全クライアントへ配信
        wss.clients.forEach(function (client) {
          if (client.readyState !== WebSocket.OPEN) {
            return;
          }

          const outgoingMessage = {
            type: "message",
            text: botMessage.text,
            senderId: botMessage.senderId,
            timestamp: botMessage.timestamp,
            isSelf: false
          };

          if (typeof client.chatSend === "function") {
            client.chatSend(outgoingMessage);
          } else {
            client.send(JSON.stringify(outgoingMessage));
          }
        });

        console.log("[BOT] 発言:", text);

        // GAS保存は従来の処理を使う
        await saveMessageToGAS(botMessage);

      } catch (error) {
        console.error(
          "[BOT] エラー:",
          error instanceof Error
            ? error.message
            : "unknown"
        );
      }
    }

  } finally {
    botBusy = false;

    // 念のため、終了直前に待機分が増えた場合も再開する。
    if (botQueue.length > 0) {
      processBotQueue();
    }
  }
}
// ============================================================
// 管理者用：GASから履歴を再読み込み
// ============================================================

const crypto = require("crypto");

app.use(express.json({ limit: "10kb" }));


function isCorrectAdminSecret(input) {
  if (
    !BOT_SHARED_SECRET ||
    typeof input !== "string"
  ) {
    return false;
  }

  const expected = Buffer.from(BOT_SHARED_SECRET, "utf8");
  const actual = Buffer.from(input, "utf8");

  if (expected.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, actual);
}


function normalizeGASMessage(message) {
  return {
    text:
      message.text == null
        ? ""
        : String(message.text),

    senderId:
      message.sender_id == null ||
      message.sender_id === ""
        ? "ゲスト"
        : String(message.sender_id),

    timestamp: message.timestamp || null
  };
}


// ISO形式とJST形式など、同じ日時の別表記も比較する
function messagesAreEqual(a, b) {
  const aTime = Date.parse(a.timestamp);
  const bTime = Date.parse(b.timestamp);

  const sameTime =
    Number.isFinite(aTime) && Number.isFinite(bTime)
      ? aTime === bTime
      : a.timestamp === b.timestamp;

  return (
    sameTime &&
    a.text === b.text &&
    a.senderId === b.senderId
  );
}


// GASから読み直した履歴をチャボ用にも反映する。
// 参加状態は復元せず、再度呼ばれるまで待機する。
function rebuildBotConversationFromHistory() {
  conversationMessages = [];
  conversationActive = false;
  conversationLastMessageAt = 0;

  let previousTime = 0;

  for (const message of chatHistory) {
    const time = Date.parse(message.timestamp);

    if (!Number.isFinite(time)) {
      conversationMessages = [];
      previousTime = 0;
      continue;
    }

    if (
      previousTime > 0 &&
      (
        time < previousTime ||
        time - previousTime >= CONVERSATION_GAP_MS
      )
    ) {
      conversationMessages = [];
    }

    appendConversationMessage(message);
    previousTime = time;
  }

  if (
    previousTime > 0 &&
    Date.now() - previousTime < CONVERSATION_GAP_MS &&
    Date.now() >= previousTime
  ) {
    conversationLastMessageAt = previousTime;
  } else {
    conversationMessages = [];
    conversationLastMessageAt = 0;
  }
}


function sendHistoryResetToClients() {
  const payload = {
    type: "history_reset",

    messages: chatHistory.map(function (message) {
      return { ...message };
    })
  };

  wss.clients.forEach(function (client) {
    if (client.readyState !== WebSocket.OPEN) {
      return;
    }

    if (typeof client.chatSend === "function") {
      client.chatSend(payload);
    } else {
      client.send(JSON.stringify(payload));
    }
  });
}


// 管理画面。合言葉はURLに入れない。
app.get("/admin", function (req, res) {
  res.set("Cache-Control", "no-store");

  res.send(`
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>チャット管理</title>

  <style>
    body {
      font-family: sans-serif;
      background: #111;
      color: #fff;
      max-width: 500px;
      margin: 40px auto;
      padding: 0 16px;
    }

    input, button {
      font-size: 16px;
      padding: 10px;
      margin: 8px 0;
    }

    input {
      width: 100%;
      box-sizing: border-box;
    }

    button {
      cursor: pointer;
    }

    #status {
      white-space: pre-wrap;
      line-height: 1.6;
    }
  </style>
</head>

<body>
  <h1>チャット管理</h1>

  <p>
    GASから履歴を読み直します。<br>
    スプレッドシートの内容は削除しません。
  </p>

  <form id="reload-form">
    <label for="secret">いつもの合言葉</label><br>

    <input
      id="secret"
      type="password"
      autocomplete="off"
      required
    ><br>

    <button id="reload-button" type="submit">
      GASから再読み込み
    </button>
  </form>

  <p id="status"></p>

  <script>
    const form = document.getElementById("reload-form");
    const secretInput = document.getElementById("secret");
    const button = document.getElementById("reload-button");
    const status = document.getElementById("status");

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      if (!confirm("GASから履歴を再読み込みしますか？")) {
        return;
      }

      button.disabled = true;
      status.textContent = "再読み込み中...";

      try {
        const response = await fetch("/admin/reload-history", {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            secret: secretInput.value
          })
        });

        const result = await response.json();

        if (!response.ok || !result.ok) {
          status.textContent =
            "失敗: " + (result.error || "不明なエラー");

          return;
        }

        status.textContent =
          "再読み込み完了！ 履歴 " +
          result.count +
          "件。チャボは呼ばれるまで待機します。";

        secretInput.value = "";

      } catch (error) {
        status.textContent =
          "通信に失敗しました。Renderのログも確認してください。";

      } finally {
        button.disabled = false;
      }
    });
  </script>
</body>
</html>
  `);
});


app.post("/admin/reload-history", async function (req, res) {
  res.set("Cache-Control", "no-store");

  // ブラウザからの同一オリジン要求を確認する
  const origin = req.get("origin");
  const host = req.get("host");

  let sameOrigin = false;

  try {
    const parsedOrigin = new URL(origin);

    sameOrigin =
      parsedOrigin.host === host &&
      (
        parsedOrigin.protocol === "https:" ||
        parsedOrigin.protocol === "http:"
      );

  } catch (error) {
    sameOrigin = false;
  }

  if (!sameOrigin) {
    return res.status(403).json({
      ok: false,
      error: "このページからの操作を確認できません"
    });
  }

  if (!isCorrectAdminSecret(req.body && req.body.secret)) {
    return res.status(403).json({
      ok: false,
      error: "合言葉が違います"
    });
  }

  if (adminReloading) {
    return res.status(409).json({
      ok: false,
      error: "すでに再読み込み中です"
    });
  }

  adminReloading = true;
  messagesDuringAdminReload = [];

  // 実行中の古いAI応答と、待機中の判定を無効化する。
  // botBusyは変更しない。
  conversationGeneration++;
  botRevision++;
  botQueue.length = 0;

  try {
    // 起動時の履歴取得が動いていれば先に待つ
    if (historyLoadingPromise) {
      await historyLoadingPromise;
    }

    // 再読み込み開始時点で処理中のGAS保存を待つ
    const writesAtStart = Array.from(pendingGASWrites);

    if (writesAtStart.length > 0) {
      const results = await Promise.all(writesAtStart);

      if (results.some(function (success) {
        return success !== true;
      })) {
        throw new Error(
          "処理中だったメッセージのGAS保存に失敗しました"
        );
      }
    }

    console.log("[ADMIN] GAS履歴の再読み込み開始");

    const result = await callGAS({
      action: "read"
    });

    if (!Array.isArray(result.messages)) {
      throw new Error("GASの履歴形式が不正です");
    }

    const reloadedMessages = result.messages
      .filter(function (message) {
        return message && typeof message === "object";
      })
      .map(normalizeGASMessage);

    // 再読み込み中の新着を可能な範囲で保持する
    for (const message of messagesDuringAdminReload) {
      const exists = reloadedMessages.some(function (item) {
        return messagesAreEqual(item, message);
      });

      if (!exists) {
        reloadedMessages.push(message);
      }
    }

    // GASの取得に成功してから履歴を入れ替える
    chatHistory.length = 0;

    const latestMessages =
      reloadedMessages.slice(-MAX_HISTORY);

    for (const message of latestMessages) {
      chatHistory.push(message);
    }

    historyLoaded = true;

    // 再読み込み中に予約されたAI判定も無効化する
    conversationGeneration++;
    botRevision++;
    botQueue.length = 0;

    rebuildBotConversationFromHistory();
    sendHistoryResetToClients();

    console.log(
      "[ADMIN] GAS履歴の再読み込み成功:",
      chatHistory.length,
      "件"
    );

    return res.json({
      ok: true,
      count: chatHistory.length
    });

  } catch (error) {
    console.error(
      "[ADMIN] GAS履歴の再読み込み失敗:",
      error instanceof Error
        ? error.message
        : "unknown"
    );

    return res.status(500).json({
      ok: false,
      error:
        "GASから履歴を読み込めませんでした。Renderのログを確認してください"
    });

  } finally {
    adminReloading = false;
    messagesDuringAdminReload = [];
  }
});
