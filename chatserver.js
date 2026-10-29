// ============================================================
// chatserver.js
// Render + WebSocket + GAS + Spreadsheet
// URLリンク化・画像埋め込み対応版
// ============================================================

const express = require("express");
const { WebSocketServer, WebSocket } = require("ws");

const app = express();
const port = process.env.PORT || 3000;

const GAS_DEPLOY_URL =
  "https://script.google.com/macros/s/AKfycbxvqp1PutymnKwjSzUBnDR3QXz498J2Ba1TrwYrMlBGd-66VmxH_PRoFAfXChDHFfv0Bg/exec";

const chatHistory = [];
const MAX_HISTORY = 30;

let historyLoaded = false;
let historyLoadingPromise = null;


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

    // Googleusercontentの画像
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

    // Imgur直接画像
    if (
      host === "i.imgur.com"
    ) {
      return true;
    }

    return false;

  } catch (error) {
    return false;
  }
}


// ============================================================
// リンク・画像表示
// ============================================================

function appendRichText(container, text) {

  const urlRegex = /https?:\\/\\/[^\\s<>"']+/gi;

  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {

    if (match.index > lastIndex) {
      container.appendChild(
        document.createTextNode(
          text.slice(lastIndex, match.index)
        )
      );
    }

    const url = match[0];

    if (isImageUrl(url)) {

      const imageContainer =
        document.createElement("div");

      imageContainer.className =
        "chat-image-container";

      const link =
        document.createElement("a");

      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      const image =
        document.createElement("img");

      image.src = url;
      image.className = "chat-image";
      image.loading = "lazy";
      image.alt = "チャット画像";

      image.onerror = function () {

        const fallback =
          document.createElement("a");

        fallback.href = url;
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

      const link =
        document.createElement("a");

      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "chat-link";
      link.textContent = url;

      container.appendChild(link);
    }

    lastIndex = urlRegex.lastIndex;
  }

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
// GAS GET
// ============================================================

async function loadHistoryFromGAS() {

  if (historyLoaded) {
    console.log("[GAS GET] 履歴はロード済みです");
    return;
  }

  if (historyLoadingPromise) {
    console.log("[GAS GET] 現在ロード中です");
    return historyLoadingPromise;
  }

  historyLoadingPromise = (async function () {

    try {

      console.log("========================================");
      console.log("[GAS GET] 接続開始");
      console.log("[GAS GET] URL: " + GAS_DEPLOY_URL);

      const response = await fetch(
        GAS_DEPLOY_URL + "?action=read",
        {
          method: "GET",
          redirect: "follow",
          cache: "no-store"
        }
      );

      console.log(
        "[GAS GET] HTTP STATUS: " +
        response.status
      );

      console.log(
        "[GAS GET] FINAL URL: " +
        response.url
      );

      const body = await response.text();

      if (!response.ok) {
        throw new Error(
          "HTTP " + response.status + " / " + body
        );
      }

      let data;

      try {
        data = JSON.parse(body);
      } catch (error) {
        throw new Error(
          "GAS response is not JSON: " + body
        );
      }

      if (!Array.isArray(data)) {
        throw new Error(
          "GAS response is not an array"
        );
      }

      chatHistory.length = 0;

      data.forEach(function (message) {

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

          timestamp:
            message.timestamp || null
        });
      });

      while (chatHistory.length > MAX_HISTORY) {
        chatHistory.shift();
      }

      historyLoaded = true;

      console.log("[GAS GET] 成功");
      console.log(
        "[GAS GET] 履歴件数: " +
        chatHistory.length
      );
      console.log("========================================");

    } catch (error) {

      historyLoaded = false;

      console.error("!!!!!!!! GAS GET ERROR !!!!!!!!");
      console.error(error);
      console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

    } finally {

      historyLoadingPromise = null;
    }
  })();

  return historyLoadingPromise;
}


// ============================================================
// GAS POST
// ============================================================

async function saveMessageToGAS(message) {

  try {

    const payload = {
      action: "write",
      text: message.text,
      sender_id: message.senderId,
      timestamp: message.timestamp
    };

    console.log("[GAS POST] 保存開始");
    console.log(
      "[GAS POST] DATA: " +
      JSON.stringify(payload)
    );

    const response = await fetch(
      GAS_DEPLOY_URL,
      {
        method: "POST",
        redirect: "follow",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    console.log(
      "[GAS POST] HTTP STATUS: " +
      response.status
    );

    console.log(
      "[GAS POST] FINAL URL: " +
      response.url
    );

    const responseBody = await response.text();

    console.log(
      "[GAS POST] RESPONSE: " +
      responseBody
    );

    if (!response.ok) {
      throw new Error(
        "HTTP " + response.status +
        ": " + responseBody
      );
    }

    let result;

    try {
      result = JSON.parse(responseBody);
    } catch (error) {
      throw new Error(
        "GAS POST response is not JSON: " +
        responseBody
      );
    }

    if (!result || result.ok !== true) {
      throw new Error(
        result && result.error
          ? result.error
          : "GAS save failed"
      );
    }

    console.log(
      "[GAS POST] スプレッドシート保存成功"
    );

    return true;

  } catch (error) {

    console.error("!!!!!!!! GAS POST ERROR !!!!!!!!");
    console.error(error);
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

    return false;
  }
}


// ============================================================
// WEBSOCKET CONNECTION
// ============================================================

wss.on("connection", async function (ws) {

  console.log("[WS] Client connected");

  if (!historyLoaded) {
    await loadHistoryFromGAS();
  }

  console.log(
    "[WS] 履歴を送信: " +
    chatHistory.length + "件"
  );

  for (const message of chatHistory) {

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  ws.on("message", async function (rawMessage) {

    try {

      const clientData =
        JSON.parse(rawMessage.toString());

      let text = "";

      if (typeof clientData.text === "string") {
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

      while (chatHistory.length > MAX_HISTORY) {
        chatHistory.shift();
      }

      wss.clients.forEach(function (client) {

        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });

      await saveMessageToGAS(message);

    } catch (error) {

      console.error(
        "[WS] Message error:",
        error
      );
    }
  });

  ws.on("close", function () {
    console.log("[WS] Client disconnected");
  });

  ws.on("error", function (error) {
    console.error("[WS] Error:", error);
  });
});
