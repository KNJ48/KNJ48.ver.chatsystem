const express = require("express");
const { WebSocketServer, WebSocket } = require("ws");

const app = express();
const port = process.env.PORT || 3000;

// ========================================
// GAS設定
// ========================================

const GAS_DEPLOY_URL =
  "https://script.google.com/macros/s/AKfycbxvqp1PutymnKwjSzUBnDR3QXz498J2Ba1TrwYrMlBGd-66VmxH_PRoFAfXChDHFfv0Bg/exec";

// ========================================
// チャット履歴
// ========================================

const chatHistory = [];
const MAX_HISTORY = 30;

let historyLoaded = false;
let historyLoadingPromise = null;

// ========================================
// GASから履歴を取得
// ========================================

async function loadHistoryFromGAS() {
  if (historyLoaded) {
    return;
  }

  if (historyLoadingPromise) {
    return historyLoadingPromise;
  }

  historyLoadingPromise = (async () => {
    try {
      console.log("[GAS GET] 接続開始");

      const response = await fetch(GAS_DEPLOY_URL, {
        method: "GET",
        redirect: "follow"
      });

      console.log("[GAS GET] HTTP STATUS:", response.status);

      if (!response.ok) {
        throw new Error("GAS GET HTTP " + response.status);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("GASから配列が返されませんでした");
      }

      const loadedMessages = data
        .filter((item) => {
          return (
            item &&
            typeof item.text === "string" &&
            item.text.trim() !== ""
          );
        })
        .map((item) => {
          return {
            text: item.text,
            senderId: String(
              item.sender_id !== undefined
                ? item.sender_id
                : item.senderId || "ゲスト"
            ),
            timestamp: item.timestamp || new Date().toISOString()
          };
        })
        .slice(-MAX_HISTORY);

      chatHistory.length = 0;
      chatHistory.push(...loadedMessages);

      historyLoaded = true;

      console.log("[GAS GET] 成功");
      console.log("[GAS GET] 履歴件数:", chatHistory.length);

    } catch (error) {
      console.error("[GAS GET] エラー:", error.message);

    } finally {
      historyLoadingPromise = null;
    }
  })();

  return historyLoadingPromise;
}

// ========================================
// GASへメッセージ保存
// ========================================

async function saveMessageToGAS(message) {
  try {
    const payload = {
      action: "write",
      text: message.text,
      sender_id: message.senderId,
      timestamp: message.timestamp
    };

    const response = await fetch(GAS_DEPLOY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload),
      redirect: "follow"
    });

    if (!response.ok) {
      throw new Error("GAS POST HTTP " + response.status);
    }

    const result = await response.json();

    if (result && result.ok === false) {
      throw new Error("GASが保存失敗を返しました");
    }

    console.log("[GAS POST] 保存成功");

  } catch (error) {
    console.error("[GAS POST] 保存エラー:", error.message);
  }
}

// ========================================
// HTML
// ========================================

app.get("/", (req, res) => {
  res.send(String.raw`
<!DOCTYPE html>
<html lang="ja">

<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>カスタムチャットシステム Pro</title>

<style>

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: Arial, sans-serif;
}

body {
  background: #111;
}

/* ========================================
   ゲーム表示エリア
======================================== */

#game-area {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

/* ========================================
   URL入力エリア
======================================== */

#url-controls {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;

  display: flex;
  gap: 5px;

  max-width: calc(100% - 20px);
}

#url-input {
  width: 300px;
  max-width: 60vw;
  padding: 6px;
  font-size: 13px;
}

#url-btn {
  padding: 6px 12px;
  cursor: pointer;
}

/* ========================================
   チャット全体
======================================== */

#chat-container {
  position: absolute;

  right: 30px;
  bottom: 30px;

  width: 320px;
  height: 260px;

  z-index: 20;

  display: flex;
  flex-direction: column;

  background: rgba(20, 20, 20, 0.92);

  border: 1px solid #555;
  border-radius: 6px;

  color: white;

  overflow: hidden;

  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
}

/* ========================================
   ドラッグバー
======================================== */

#chat-drag-bar {
  height: 20px;
  min-height: 20px;

  background: #333;

  display: flex;
  align-items: center;
  justify-content: center;

  position: relative;

  cursor: move;
  touch-action: none;

  user-select: none;
}

#drag-handle {
  color: #aaa;
  font-size: 15px;
  line-height: 20px;
  pointer-events: none;
}

/* ========================================
   通知ボタン
======================================== */

#notification-btn {
  position: absolute;

  right: 5px;
  top: 0;

  height: 20px;
  min-width: 24px;

  padding: 0 3px;

  border: none;
  background: transparent;

  color: white;
  font-size: 14px;

  cursor: pointer;

  line-height: 20px;
}

#notification-btn:hover {
  background: #555;
  border-radius: 3px;
}

#notification-btn.enabled {
  color: #8aff8a;
}

#notification-btn.denied {
  opacity: 0.45;
}

/* ========================================
   名前入力
======================================== */

#name-area {
  padding: 5px;

  display: flex;
  align-items: center;
  gap: 5px;

  background: #252525;
}

#name-area label {
  font-size: 12px;
  white-space: nowrap;
}

#name-input {
  width: 100%;
  min-width: 0;

  padding: 5px;

  border: 1px solid #555;
  border-radius: 3px;

  background: #fff;
  color: #111;
}

/* ========================================
   メッセージ一覧
======================================== */

#messages {
  flex: 1;

  min-height: 0;

  overflow-y: auto;
  overflow-x: hidden;

  padding: 8px;

  font-size: 13px;
  line-height: 1.5;

  user-select: text;

  overflow-wrap: anywhere;
}

.chat-message {
  margin-bottom: 7px;
}

.chat-message-header {
  color: #aaa;
  font-size: 11px;
  margin-bottom: 2px;
}

.chat-message-name {
  color: #8fcaff;
  font-weight: bold;
}

.chat-message-body {
  color: white;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.chat-message-body a {
  color: #80c7ff;
  text-decoration: underline;
}

.chat-message-body a:hover {
  color: #b5e0ff;
}

.chat-image-link {
  display: block;
  width: fit-content;
  max-width: 100%;

  margin-top: 4px;
  margin-bottom: 4px;
}

.chat-image {
  display: block;

  max-width: 100%;
  max-height: 250px;

  width: auto;
  height: auto;

  border-radius: 4px;

  cursor: pointer;
}

/* ========================================
   送信エリア
======================================== */

#chat-input-area {
  display: flex;
  gap: 5px;

  padding: 5px;

  background: #252525;
}

#chat-input {
  flex: 1;
  min-width: 0;

  padding: 6px;

  border: 1px solid #555;
  border-radius: 3px;

  font-size: 13px;
}

#send-btn {
  padding: 6px 10px;

  border: none;
  border-radius: 3px;

  background: #1684d8;
  color: white;

  cursor: pointer;
}

#send-btn:hover {
  background: #329fea;
}

</style>
</head>

<body>

<!-- ========================================
     ゲームエリア
======================================== -->

<iframe
  id="game-area"
  title="ゲームエリア"
></iframe>

<div id="url-controls">

  <input
    id="url-input"
    type="text"
    placeholder="表示するURLを入力"
  >

  <button id="url-btn">
    移動
  </button>

</div>

<!-- ========================================
     チャット
======================================== -->

<div id="chat-container">

  <div id="chat-drag-bar">

    <span id="drag-handle">⋮⋮⋮</span>

    <button
      id="notification-btn"
      type="button"
      title="通知設定"
    >🔔</button>

  </div>

  <div id="name-area">

    <label for="name-input">名前</label>

    <input
      id="name-input"
      type="text"
      placeholder="ゲスト"
      maxlength="30"
    >

  </div>

  <div id="messages"></div>

  <div id="chat-input-area">

    <input
      id="chat-input"
      type="text"
      placeholder="メッセージを入力"
    >

    <button id="send-btn">
      送信
    </button>

  </div>

</div>

<script>

// ========================================
// 基本設定
// ========================================

const BASE_TITLE = "カスタムチャットシステム Pro";

const STORAGE_NAME_KEY = "chatserver_saved_name";

const STORAGE_POSITION_KEY = "chatserver_saved_position";

const chatContainer = document.getElementById("chat-container");

const dragBar = document.getElementById("chat-drag-bar");

const nameInput = document.getElementById("name-input");

const messagesElement = document.getElementById("messages");

const chatInput = document.getElementById("chat-input");

const sendButton = document.getElementById("send-btn");

const notificationButton = document.getElementById("notification-btn");

const gameArea = document.getElementById("game-area");

const urlInput = document.getElementById("url-input");

const urlButton = document.getElementById("url-btn");

// ========================================
// 名前の保存と復元
// ========================================

try {
  const savedName = localStorage.getItem(STORAGE_NAME_KEY);

  if (savedName !== null) {
    nameInput.value = savedName;
  }
} catch (error) {
  console.warn("名前の復元に失敗:", error);
}

nameInput.addEventListener("input", () => {
  try {
    localStorage.setItem(STORAGE_NAME_KEY, nameInput.value);
  } catch (error) {
    console.warn("名前の保存に失敗:", error);
  }
});

// ========================================
// チャット位置の復元
// ========================================

function restoreChatPosition() {
  try {
    const saved = localStorage.getItem(STORAGE_POSITION_KEY);

    if (!saved) {
      return;
    }

    const position = JSON.parse(saved);

    if (
      typeof position.left !== "number" ||
      typeof position.top !== "number" ||
      !Number.isFinite(position.left) ||
      !Number.isFinite(position.top)
    ) {
      return;
    }

    const maxLeft = Math.max(
      0,
      window.innerWidth - chatContainer.offsetWidth
    );

    const maxTop = Math.max(
      0,
      window.innerHeight - chatContainer.offsetHeight
    );

    const left = Math.max(
      0,
      Math.min(position.left, maxLeft)
    );

    const top = Math.max(
      0,
      Math.min(position.top, maxTop)
    );

    chatContainer.style.left = left + "px";
    chatContainer.style.top = top + "px";

    chatContainer.style.right = "auto";
    chatContainer.style.bottom = "auto";

  } catch (error) {
    console.warn("チャット位置の復元に失敗:", error);
  }
}

restoreChatPosition();

// ========================================
// ドラッグ移動
// ========================================

let dragging = false;

let dragStartX = 0;
let dragStartY = 0;

let containerStartX = 0;
let containerStartY = 0;

dragBar.addEventListener("pointerdown", (event) => {

  if (event.target.closest("#notification-btn")) {
    return;
  }

  if (event.button !== 0) {
    return;
  }

  dragging = true;

  const rect = chatContainer.getBoundingClientRect();

  dragStartX = event.clientX;
  dragStartY = event.clientY;

  containerStartX = rect.left;
  containerStartY = rect.top;

  chatContainer.style.left = rect.left + "px";
  chatContainer.style.top = rect.top + "px";

  chatContainer.style.right = "auto";
  chatContainer.style.bottom = "auto";

  dragBar.setPointerCapture(event.pointerId);
});

dragBar.addEventListener("pointermove", (event) => {

  if (!dragging) {
    return;
  }

  const dx = event.clientX - dragStartX;
  const dy = event.clientY - dragStartY;

  let left = containerStartX + dx;
  let top = containerStartY + dy;

  const maxLeft = Math.max(
    0,
    window.innerWidth - chatContainer.offsetWidth
  );

  const maxTop = Math.max(
    0,
    window.innerHeight - chatContainer.offsetHeight
  );

  left = Math.max(0, Math.min(left, maxLeft));

  top = Math.max(0, Math.min(top, maxTop));

  chatContainer.style.left = left + "px";
  chatContainer.style.top = top + "px";
});

function finishDragging() {

  if (!dragging) {
    return;
  }

  dragging = false;

  const rect = chatContainer.getBoundingClientRect();

  try {
    localStorage.setItem(
      STORAGE_POSITION_KEY,
      JSON.stringify({
        left: rect.left,
        top: rect.top
      })
    );
  } catch (error) {
    console.warn("チャット位置の保存に失敗:", error);
  }
}

dragBar.addEventListener("pointerup", finishDragging);

dragBar.addEventListener("pointercancel", finishDragging);

dragBar.addEventListener("lostpointercapture", finishDragging);

// ========================================
// URL移動
// ========================================

function changeGameUrl() {

  let url = urlInput.value.trim();

  if (!url) {
    return;
  }

  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  try {
    const parsed = new URL(url);

    if (
      parsed.protocol !== "http:" &&
      parsed.protocol !== "https:"
    ) {
      return;
    }

    gameArea.src = parsed.href;

  } catch (error) {
    alert("正しいURLを入力してください");
  }
}

urlButton.addEventListener("click", changeGameUrl);

urlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    changeGameUrl();
  }
});

// ========================================
// 日本時間表示
// ========================================

function getJapanDateParts(value) {

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });

  const parts = formatter.formatToParts(date);

  const result = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      result[part.type] = part.value;
    }
  }

  return result;
}

function formatTimestamp(value) {

  const target = getJapanDateParts(value);

  if (!target) {
    return "";
  }

  const now = getJapanDateParts(new Date());

  const time = target.hour + ":" + target.minute;

  if (
    target.year === now.year &&
    target.month === now.month &&
    target.day === now.day
  ) {
    return time;
  }

  const monthDay =
    target.month + "/" + target.day;

  if (target.year === now.year) {
    return monthDay + " " + time;
  }

  return target.year + "/" + monthDay + " " + time;
}

// ========================================
// 画像URL判定
// ========================================

function isImageUrl(url) {

  try {

    const parsed = new URL(url);

    if (
      parsed.protocol !== "http:" &&
      parsed.protocol !== "https:"
    ) {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    // 通常の画像拡張子
    if (/\.(png|jpg|jpeg|gif|webp|avif|bmp|svg|apng|jfif|tif|tiff)$/i.test(pathname)) {
      return true;
    }

    // Bing画像
    if (
      hostname === "th.bing.com" &&
      pathname.startsWith("/th/id/")
    ) {
      return true;
    }

    // Google画像サムネイル
    if (
      hostname === "encrypted-tbn0.gstatic.com" ||
      hostname === "encrypted-tbn1.gstatic.com" ||
      hostname === "encrypted-tbn2.gstatic.com" ||
      hostname === "encrypted-tbn3.gstatic.com"
    ) {
      return true;
    }

    // Google画像配信
    if (
      hostname === "lh3.googleusercontent.com" ||
      hostname === "lh4.googleusercontent.com" ||
      hostname === "lh5.googleusercontent.com" ||
      hostname === "lh6.googleusercontent.com"
    ) {
      return true;
    }

    // Discord画像
    if (
      hostname === "cdn.discordapp.com" ||
      hostname === "media.discordapp.net"
    ) {
      return true;
    }

    // Imgur直接画像
    if (hostname === "i.imgur.com") {
      return true;
    }

    return false;

  } catch (error) {
    return false;
  }
}

// ========================================
// リンクと画像の表示
// ========================================

function appendRichText(container, text) {

  const urlRegex = /https?:\/\/[^\s<>"']+/gi;

  let lastIndex = 0;

  let match;

  while ((match = urlRegex.exec(text)) !== null) {

    const start = match.index;

    const matchedUrl = match[0];

    // URLの前にある文章
    if (start > lastIndex) {
      container.appendChild(
        document.createTextNode(
          text.slice(lastIndex, start)
        )
      );
    }

    // 文末の句読点などをURLから除外
    let url = matchedUrl;

    let trailing = "";

    while (/[.,!?。、，．！？]$/.test(url)) {
      trailing = url.slice(-1) + trailing;
      url = url.slice(0, -1);
    }

    if (isImageUrl(url)) {

      // 画像リンク
      const link = document.createElement("a");

      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      link.className = "chat-image-link";

      // 画像
      const image = document.createElement("img");

      image.src = url;
      image.alt = "投稿画像";

      image.className = "chat-image";

      image.loading = "lazy";

      image.referrerPolicy = "no-referrer";

      link.appendChild(image);

      // 読み込み失敗時
      image.addEventListener("error", () => {

        link.textContent = "画像を開く";

        link.className = "";

      });

      container.appendChild(link);

    } else {

      // 通常URL
      const link = document.createElement("a");

      link.href = url;

      link.target = "_blank";

      link.rel = "noopener noreferrer";

      link.textContent = url;

      container.appendChild(link);
    }

    if (trailing) {
      container.appendChild(
        document.createTextNode(trailing)
      );
    }

    lastIndex = start + matchedUrl.length;
  }

  // 最後のURLより後ろの文章
  if (lastIndex < text.length) {

    container.appendChild(
      document.createTextNode(
        text.slice(lastIndex)
      )
    );

  }
}

// ========================================
// メッセージ表示
// ========================================

function addMessage(message) {

  const wrapper = document.createElement("div");

  wrapper.className = "chat-message";

  const header = document.createElement("div");

  header.className = "chat-message-header";

  const name = document.createElement("span");

  name.className = "chat-message-name";

  name.textContent = String(
    message.senderId || "ゲスト"
  );

  const timestamp = document.createElement("span");

  timestamp.textContent =
    " " + formatTimestamp(message.timestamp);

  header.appendChild(name);

  header.appendChild(timestamp);

  const body = document.createElement("div");

  body.className = "chat-message-body";

  appendRichText(
    body,
    String(message.text || "")
  );

  wrapper.appendChild(header);

  wrapper.appendChild(body);

  messagesElement.appendChild(wrapper);

  messagesElement.scrollTop =
    messagesElement.scrollHeight;
}

// ========================================
// 未読通知機能
// ========================================

let unreadCount = 0;

// 現在表示している通知
let activeNotification = null;

// 通知に対応しているか
function notificationSupported() {
  return "Notification" in window;
}

// 通知ボタンの状態更新
function updateNotificationButton() {

  notificationButton.classList.remove(
    "enabled",
    "denied"
  );

  if (!notificationSupported()) {

    notificationButton.title =
      "このブラウザは通知に対応していません";

    return;
  }

  if (Notification.permission === "granted") {

    notificationButton.classList.add("enabled");

    notificationButton.title =
      "通知は許可されています";

  } else if (Notification.permission === "denied") {

    notificationButton.classList.add("denied");

    notificationButton.title =
      "通知がブロックされています";

  } else {

    notificationButton.title =
      "クリックして通知を許可";
  }
}

// ========================================
// 通知許可ボタン
// ========================================

notificationButton.addEventListener("click", async () => {

  if (!notificationSupported()) {

    alert(
      "このブラウザはデスクトップ通知に対応していません。"
    );

    return;
  }

  if (Notification.permission === "granted") {

    alert("通知はすでに許可されています。");

    return;
  }

  if (Notification.permission === "denied") {

    alert(
      "通知がブラウザでブロックされています。\n" +
      "ブラウザのサイト設定から通知を許可してください。"
    );

    return;
  }

  try {

    const permission =
      await Notification.requestPermission();

    updateNotificationButton();

    if (permission === "granted") {

      alert(
        "通知を許可しました！\n" +
        "別のタブを見ている間に新着メッセージを通知します。"
      );

    } else {

      alert("通知は許可されませんでした。");

    }

  } catch (error) {

    console.error("通知許可エラー:", error);

  }
});

// ========================================
// タブタイトル更新
// ========================================

function updatePageTitle() {

  if (unreadCount > 0) {

    document.title =
      "(" + unreadCount + ") " + BASE_TITLE;

  } else {

    document.title = BASE_TITLE;

  }
}

// ========================================
// 通知を閉じる
// ========================================

function closeActiveNotification() {

  if (activeNotification) {

    try {
      activeNotification.close();
    } catch (error) {
      console.warn("通知を閉じられませんでした:", error);
    }

    activeNotification = null;
  }
}

// ========================================
// 未読件数リセット
// ========================================

function clearUnreadCount() {

  unreadCount = 0;

  updatePageTitle();

  closeActiveNotification();
}

// ========================================
// デスクトップ通知
// ========================================

function showUnreadNotification() {

  if (!notificationSupported()) {
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  if (unreadCount <= 0) {
    return;
  }

  // 前回の通知を閉じて件数を更新
  closeActiveNotification();

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

    // 通知クリックでチャット画面へ
    notification.onclick = () => {

      window.focus();

      clearUnreadCount();

      notification.close();
    };

    notification.onclose = () => {

      if (activeNotification === notification) {
        activeNotification = null;
      }

    };

  } catch (error) {

    console.error("通知表示エラー:", error);

  }
}

// ========================================
// 新着メッセージの未読処理
// ========================================

function handleNewMessage(message) {

  // 自分の投稿は未読にしない
  if (message.isSelf === true) {
    return;
  }

  // チャットタブを表示中なら未読にしない
  if (!document.hidden) {
    return;
  }

  unreadCount++;

  updatePageTitle();

  showUnreadNotification();
}

// ========================================
// チャットタブへ戻ったとき
// ========================================

document.addEventListener("visibilitychange", () => {

  if (!document.hidden) {

    clearUnreadCount();

  }
});

window.addEventListener("focus", () => {

  if (!document.hidden) {

    clearUnreadCount();

  }
});

// 初期化
updateNotificationButton();

updatePageTitle();

// ========================================
// WebSocket接続
// ========================================

let socket = null;

function connectWebSocket() {

  const protocol =
    location.protocol === "https:"
      ? "wss:"
      : "ws:";

  const wsUrl =
    protocol + "//" + location.host;

  socket = new WebSocket(wsUrl);

  socket.addEventListener("open", () => {

    console.log("[WS] 接続成功");

  });

  socket.addEventListener("message", (event) => {

    try {

      const data = JSON.parse(event.data);

      // ====================================
      // 初期履歴
      // ====================================

      if (data.type === "history") {

        addMessage(data);

        // 過去の履歴では通知しない
        return;
      }

      // ====================================
      // 新規メッセージ
      // ====================================

      if (data.type === "message") {

        addMessage(data);

        handleNewMessage(data);

        return;
      }

      // ====================================
      // 旧形式との互換性
      // ====================================

      if (
        typeof data.text === "string" &&
        data.senderId !== undefined
      ) {

        addMessage(data);

        // 種別が不明な旧形式では誤通知を防ぐ
        return;
      }

    } catch (error) {

      console.error(
        "[WS] メッセージ解析エラー:",
        error
      );

    }
  });

  socket.addEventListener("close", () => {

    console.log("[WS] 接続終了");

    // 接続が切れた場合は再接続
    setTimeout(() => {

      connectWebSocket();

    }, 3000);

  });

  socket.addEventListener("error", (error) => {

    console.error("[WS] 接続エラー:", error);

  });
}

connectWebSocket();

// ========================================
// メッセージ送信
// ========================================

function sendMessage() {

  const text = chatInput.value.trim();

  if (!text) {
    return;
  }

  if (
    !socket ||
    socket.readyState !== WebSocket.OPEN
  ) {

    alert(
      "チャットサーバーに接続されていません。\n" +
      "少し待ってから再度送信してください。"
    );

    return;
  }

  const name =
    nameInput.value.trim() || "ゲスト";

  const payload = {
    text: text,
    name: name
  };

  socket.send(
    JSON.stringify(payload)
  );

  chatInput.value = "";

  chatInput.focus();
}

sendButton.addEventListener(
  "click",
  sendMessage
);

chatInput.addEventListener("keydown", (event) => {

  if (event.key === "Enter") {

    event.preventDefault();

    sendMessage();

  }
});

</script>

</body>
</html>
  `);
});

// ========================================
// サーバー起動
// ========================================

const server = app.listen(port, () => {

  console.log("ChatServer 起動");
  console.log("Server running on port " + port);

  // 起動時に履歴取得
  loadHistoryFromGAS();

});

// ========================================
// WebSocketサーバー
// ========================================

const wss = new WebSocketServer({
  server: server
});

// ========================================
// WebSocket送信
// ========================================

function sendJSON(ws, data) {

  if (ws.readyState !== WebSocket.OPEN) {
    return;
  }

  try {

    ws.send(
      JSON.stringify(data)
    );

  } catch (error) {

    console.error("[WS] 送信エラー:", error.message);

  }
}

// ========================================
// メッセージ受信
// ========================================

wss.on("connection", async (ws) => {

  console.log("[WS] Client connected");

  // この接続の履歴送信が終わるまで、
  // 新着メッセージを一時的に保留する。
  // これにより履歴と新着を区別しやすくする。
  let initialHistorySent = false;

  const pendingMessages = [];

  function sendOrQueue(data) {

    if (!initialHistorySent) {

      pendingMessages.push(data);

    } else {

      sendJSON(ws, data);

    }
  }

  // ======================================
  // メッセージ受信
  // ======================================

  ws.on("message", (rawData) => {

    try {

      const data = JSON.parse(
        rawData.toString()
      );

      if (
        !data ||
        typeof data.text !== "string"
      ) {
        return;
      }

      const text = data.text.trim();

      if (!text) {
        return;
      }

      const senderId =
        typeof data.name === "string"
          ? data.name.trim().slice(0, 30) || "ゲスト"
          : "ゲスト";

      // タイムスタンプは一度だけ生成
      const timestamp =
        new Date().toISOString();

      const message = {
        text: text,
        senderId: senderId,
        timestamp: timestamp
      };

      // ====================================
      // 履歴に追加
      // ====================================

      chatHistory.push(message);

      if (chatHistory.length > MAX_HISTORY) {
        chatHistory.shift();
      }

      // ====================================
      // 全ユーザーに配信
      // ====================================

      wss.clients.forEach((client) => {

        if (client.readyState !== WebSocket.OPEN) {
          return;
        }

        sendToClient(client, {
          type: "message",
          text: message.text,
          senderId: message.senderId,
          timestamp: message.timestamp,

          // 名前ではなく送信元の接続で判定
          isSelf: client === ws
        });

      });

      // ====================================
      // GASへ永久保存
      // ====================================

      saveMessageToGAS(message);

    } catch (error) {

      console.error(
        "[WS] 受信エラー:",
        error.message
      );

    }
  });

  // ======================================
  // この接続への送信
  // ======================================

  function sendToClient(client, data) {

    // 自分の接続なら初期履歴完了まで保留
    if (client === ws) {

      sendOrQueue(data);

    } else {

      // 他の接続も初期化中の可能性があるため、
      // 各接続に登録した送信関数を使う
      if (typeof client.chatSend === "function") {

        client.chatSend(data);

      } else {

        sendJSON(client, data);

      }
    }
  }

  ws.chatSend = sendOrQueue;

  // ======================================
  // 初期履歴送信
  // ======================================

  try {

    await loadHistoryFromGAS();

    // 接続がすでに閉じていたら終了
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // 履歴読み込み中に届いた新着との重複を
    // 避けるため、保留した新着を確認する
    const pendingTimestamps = new Set(
      pendingMessages
        .filter((item) => item.type === "message")
        .map((item) => item.timestamp)
    );

    const initialMessages = chatHistory.filter(
      (message) => {
        return !pendingTimestamps.has(
          message.timestamp
        );
      }
    );

    // 過去30件を通知対象外として送る
    for (const message of initialMessages) {

      sendJSON(ws, {
        type: "history",
        text: message.text,
        senderId: message.senderId,
        timestamp: message.timestamp
      });

    }

    console.log(
      "[WS] 履歴を送信:",
      initialMessages.length + "件"
    );

    // 初期履歴完了
    initialHistorySent = true;

    // 初期化中に届いた新着を送信
    for (const message of pendingMessages) {

      sendJSON(ws, message);

    }

    pendingMessages.length = 0;

  } catch (error) {

    console.error(
      "[WS] 履歴送信エラー:",
      error.message
    );

    initialHistorySent = true;

    for (const message of pendingMessages) {

      sendJSON(ws, message);

    }

    pendingMessages.length = 0;
  }

});
