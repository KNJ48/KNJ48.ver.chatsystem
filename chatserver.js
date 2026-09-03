```javascript
const express = require('express');
const { WebSocketServer } = require('ws');

const app = express();
const port = process.env.PORT || 3000;

// ============================================================
// Google Apps Script
// ============================================================

const GAS_DEPLOY_URL =
  'https://script.google.com/macros/s/AKfycbz21K8Je-hOVyg6kJ0xcEJtFKvV23gEVTveX3qWwl5JQXlG9vQsvRqmVgbAPqxDcrXDAQ/exec';

const MAX_HISTORY = 30;


// ============================================================
// メイン画面
// ============================================================

app.get('/', (req, res) => {

  res.send(`
<!DOCTYPE html>
<html lang="ja">

<head>

<meta charset="UTF-8">

<title>カスタムチャットシステム Pro</title>

<style>

body, html {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: sans-serif;
  background-color: #111;
  color: #fff;
}

#game-area {
  width: 100%;
  height: 100%;
  border: none;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}

#top-bar-container {
  position: absolute;
  top: 15px;
  left: 15px;
  z-index: 10;

  display: flex;
  gap: 10px;

  background: rgba(0,0,0,0.6);

  padding: 8px;

  border-radius: 6px;

  border: 1px solid rgba(255,255,255,0.1);

  box-shadow: 0 4px 10px rgba(0,0,0,0.4);

  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
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

  background: rgba(255,255,255,0.15);

  border: 1px solid rgba(255,255,255,0.1);

  border-radius: 4px;

  color: #fff;

  padding: 4px 8px;

  font-size: 12px;

  outline: none;
}

#url-btn {
  background: #2196F3;

  color: white;

  border: none;

  padding: 4px 10px;

  border-radius: 4px;

  cursor: pointer;

  font-weight: bold;

  font-size: 12px;
}

#name-input {
  width: 100px;

  background: rgba(255,255,255,0.15);

  border: 1px solid rgba(255,255,255,0.1);

  border-radius: 4px;

  color: #ffca28;

  padding: 4px 8px;

  font-size: 12px;

  outline: none;

  font-weight: bold;
}

#chat-container {
  position: absolute;

  right: 30px;
  bottom: 30px;

  width: 320px;
  height: 240px;

  background: rgba(0,0,0,0.6);

  border-radius: 6px;

  display: flex;
  flex-direction: column;

  z-index: 20;

  box-shadow: 0 4px 15px rgba(0,0,0,0.5);

  pointer-events: auto;

  border: 1px solid rgba(255,255,255,0.1);
}

#messages {
  flex: 1;

  overflow-y: auto;

  padding: 10px;

  margin: 0;

  list-style: none;

  display: flex;

  flex-direction: column;

  gap: 6px;
}

#messages li {
  color: #fff;

  font-size: 13px;

  line-height: 1.4;

  word-break: break-all;

  background: rgba(255,255,255,0.08);

  padding: 6px 10px;

  border-radius: 4px;
}

#messages li span.sender {
  font-weight: bold;

  color: #ffca28;

  margin-right: 6px;
}

#messages li span.timestamp {
  color: #999;

  font-size: 10px;

  margin-right: 6px;
}

#messages li span.message-text {
  color: #fff;
}

#input-area {
  display: flex;

  padding: 8px;

  background: rgba(0,0,0,0.4);

  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;

  border-top: 1px solid rgba(255,255,255,0.1);
}

#chat-input {
  flex: 1;

  background: rgba(255,255,255,0.15);

  border: 1px solid rgba(255,255,255,0.1);

  border-radius: 4px;

  color: #fff;

  padding: 6px 10px;

  font-size: 13px;

  outline: none;
}

#send-btn {
  background: #4caf50;

  color: white;

  border: none;

  padding: 6px 14px;

  margin-left: 8px;

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

    <span class="bar-label">
      URL:
    </span>

    <input
      type="text"
      id="url-input"
      value="https://example.com"
    >

    <button id="url-btn">
      移動
    </button>

  </div>

  <div
    class="bar-group"
    style="
      margin-left: 5px;
      border-left: 1px solid rgba(255,255,255,0.2);
      padding-left: 10px;
    "
  >

    <span class="bar-label">
      NAME:
    </span>

    <input
      type="text"
      id="name-input"
      value="ゲスト"
      maxlength="10"
    >

  </div>

</div>

<iframe
  id="game-area"
  src="https://example.com"
></iframe>

<div id="chat-container">

  <ul id="messages"></ul>

  <div id="input-area">

    <input
      type="text"
      id="chat-input"
      placeholder="チャットを開始..."
      autocomplete="off"
    >

    <button id="send-btn">
      送信
    </button>

  </div>

</div>


<script>

const gameArea =
  document.getElementById("game-area");

const urlInput =
  document.getElementById("url-input");

const urlBtn =
  document.getElementById("url-btn");

const nameInput =
  document.getElementById("name-input");

const topBar =
  document.getElementById("top-bar-container");

const messages =
  document.getElementById("messages");

const chatInput =
  document.getElementById("chat-input");

const sendBtn =
  document.getElementById("send-btn");


// ============================================================
// URL移動
// ============================================================

function changeUrl() {

  let url =
    urlInput.value.trim();

  if (url === "") {
    return;
  }

  if (
    url.indexOf("http://") !== 0 &&
    url.indexOf("https://") !== 0
  ) {

    url =
      "https://" + url;

    urlInput.value =
      url;
  }

  gameArea.src =
    url;

  topBar.style.opacity =
    "0";

  topBar.style.transform =
    "translateY(-20px)";

  setTimeout(() => {

    topBar.style.display =
      "none";

  }, 500);
}


urlBtn.addEventListener(
  "click",
  changeUrl
);


urlInput.addEventListener(
  "keydown",
  (e) => {

    if (e.key === "Enter") {
      changeUrl();
    }

  }
);


// ============================================================
// WebSocket
// ============================================================

const protocol =
  window.location.protocol === "https:"
    ? "wss:"
    : "ws:";

const ws =
  new WebSocket(
    protocol +
    "//" +
    window.location.host
  );


// ============================================================
// 時刻表示
// ============================================================

function formatJapanTime(timestamp) {

  if (!timestamp) {
    return "";
  }

  try {

    const date =
      new Date(timestamp);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    return new Intl.DateTimeFormat(
      "ja-JP",
      {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }
    ).format(date);

  } catch (err) {

    return "";

  }
}


// ============================================================
// メッセージ表示
// ============================================================

function addMessage(data) {

  const li =
    document.createElement("li");


  const sender =
    document.createElement("span");

  sender.className =
    "sender";

  sender.textContent =
    "[" +
    (data.senderId || "ゲスト") +
    "]";


  li.appendChild(
    sender
  );


  if (data.timestamp) {

    const timestamp =
      document.createElement("span");

    timestamp.className =
      "timestamp";

    timestamp.textContent =
      formatJapanTime(
        data.timestamp
      );

    li.appendChild(
      timestamp
    );

  }


  const messageText =
    document.createElement("span");

  messageText.className =
    "message-text";

  messageText.textContent =
    data.text || "";


  li.appendChild(
    messageText
  );


  messages.appendChild(
    li
  );


  while (
    messages.children.length >
    MAX_HISTORY
  ) {

    messages.removeChild(
      messages.firstChild
    );

  }


  messages.scrollTop =
    messages.scrollHeight;
}


// ============================================================
// WebSocket受信
// ============================================================

ws.onmessage = (e) => {

  try {

    const data =
      JSON.parse(e.data);

    addMessage(data);

  } catch (err) {

    console.error(
      "メッセージ表示エラー:",
      err
    );

  }

};


// ============================================================
// メッセージ送信
// ============================================================

function sendMessage() {

  const text =
    chatInput.value.trim();

  let name =
    nameInput.value.trim();


  if (name === "") {
    name = "ゲスト";
  }


  if (
    text !== "" &&
    ws.readyState === WebSocket.OPEN
  ) {

    ws.send(
      JSON.stringify({
        text: text,
        name: name
      })
    );

    chatInput.value =
      "";

  }

}


sendBtn.addEventListener(
  "click",
  sendMessage
);


chatInput.addEventListener(
  "keydown",
  (e) => {

    if (
      e.key === "Enter" &&
      !e.isComposing
    ) {

      sendMessage();

    }

  }
);


window.addEventListener(
  "keydown",
  (e) => {

    if (
      document.activeElement === chatInput ||
      document.activeElement === urlInput ||
      document.activeElement === nameInput
    ) {

      return;
    }


    if (e.key === "/") {

      e.preventDefault();

      chatInput.focus();

    }

  }
);

</script>

</body>

</html>
  `);

});


// ============================================================
// HTTPサーバー起動
// ============================================================

const server =
  app.listen(
    port,
    () => {

      console.log(
        `Server running on port ${port}`
      );

    }
  );


// ============================================================
// WebSocket
// ============================================================

const wss =
  new WebSocketServer({
    server
  });

const chatHistory = [];


// ============================================================
// GASから過去ログを読み込む
// ============================================================

async function loadChatHistory() {

  try {

    console.log(
      "GASからチャット履歴を取得中..."
    );


    const response =
      await fetch(
        GAS_DEPLOY_URL +
        "?action=read"
      );


    if (!response.ok) {

      throw new Error(
        "GAS HTTP " +
        response.status
      );

    }


    const data =
      await response.json();


    if (!Array.isArray(data)) {

      throw new Error(
        "GASから配列が返されませんでした"
      );

    }


    chatHistory.length =
      0;


    data.forEach(
      (msg) => {

        chatHistory.push({

          text:
            msg.text || "",

          senderId:
            msg.sender_id ||
            "ゲスト",

          timestamp:
            msg.timestamp ||
            null

        });

      }
    );


    while (
      chatHistory.length >
      MAX_HISTORY
    ) {

      chatHistory.shift();

    }


    console.log(
      "GASから " +
      chatHistory.length +
      " 件読み込み完了"
    );


  } catch (err) {

    console.error(
      "Googleスプレッドシート初期読み込みエラー:",
      err
    );

  }

}


// ============================================================
// WebSocket接続
// ============================================================

wss.on(
  "connection",
  async (ws) => {

    console.log(
      "WebSocket接続"
    );


    // --------------------------------------------------------
    // 初回接続時だけGASから履歴取得
    // --------------------------------------------------------

    if (
      chatHistory.length === 0
    ) {

      await loadChatHistory();

    }


    // --------------------------------------------------------
    // 過去ログを送信
    // --------------------------------------------------------

    for (
      const msgData
      of chatHistory
    ) {

      if (
        ws.readyState === 1
      ) {

        ws.send(
          JSON.stringify(
            msgData
          )
        );

      }

    }


    // --------------------------------------------------------
    // 新規メッセージ
    // --------------------------------------------------------

    ws.on(
      "message",
      async (message) => {

        try {

          const clientData =
            JSON.parse(
              message.toString()
            );


          if (
            typeof clientData.text !==
              "string"
          ) {

            return;

          }


          const text =
            clientData.text.trim();


          if (text === "") {
            return;
          }


          let senderId =
            clientData.name;


          if (
            typeof senderId !==
              "string" ||
            senderId.trim() === ""
          ) {

            senderId =
              "ゲスト";

          }


          senderId =
            senderId
              .trim()
              .slice(0, 10);


          // --------------------------------------------------
          // Render側でtimestampを確定
          // --------------------------------------------------

          const timestamp =
            new Date().toISOString();


          const msgData = {

            text:
              text,

            senderId:
              senderId,

            timestamp:
              timestamp

          };


          // --------------------------------------------------
          // メモリ保存
          // --------------------------------------------------

          chatHistory.push(
            msgData
          );


          while (
            chatHistory.length >
            MAX_HISTORY
          ) {

            chatHistory.shift();

          }


          // --------------------------------------------------
          // 全クライアントへ即時配信
          // --------------------------------------------------

          wss.clients.forEach(
            (client) => {

              if (
                client.readyState === 1
              ) {

                client.send(
                  JSON.stringify(
                    msgData
                  )
                );

              }

            }
          );


          // --------------------------------------------------
          // GASへ保存
          // --------------------------------------------------

          try {

            const gasResponse =
              await fetch(
                GAS_DEPLOY_URL,
                {

                  method:
                    "POST",

                  headers: {
                    "Content-Type":
                      "application/json"
                  },

                  body:
                    JSON.stringify({

                      action:
                        "write",

                      text:
                        msgData.text,

                      sender_id:
                        msgData.senderId,

                      timestamp:
                        msgData.timestamp

                    })

                }
              );


            if (
              !gasResponse.ok
            ) {

              console.error(
                "GAS保存 HTTPエラー:",
                gasResponse.status
              );

            } else {

              console.log(
                "GAS保存成功:",
                msgData.text
              );

            }


          } catch (gasError) {

            console.error(
              "GASへの保存に失敗:",
              gasError
            );

          }

        } catch (err) {

          console.error(
            "メッセージ処理エラー:",
            err
          );

        }

      }
    );

  }
);
```
