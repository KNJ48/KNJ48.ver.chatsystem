// chatserver.js
// Render + WebSocket + GAS + Google Spreadsheet
// タイムスタンプ対応 完全版

const express = require("express");
const { WebSocketServer, WebSocket } = require("ws");

const app = express();
const port = process.env.PORT || 3000;


// ============================================================
// GAS 設定
// ============================================================

const SPREADSHEET_ID =
  "1SWn4ibOxdjZlGj-iefxHwvEOH0eS4Q9FCN_s7R-jg7I";

// ★ GASのウェブアプリURL
// 必要なら実際の /exec URLに置き換えてください
const GAS_DEPLOY_URL =
  "https://script.google.com/macros/s/AKfycbz21K8JehOVyg6kJ0xcEJtFKvV23gEVTveX3qWwl5JQXlG9vQsvRqmVgbAPqxDcrXDAQ/exec";


// ============================================================
// メイン画面
// ============================================================

app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ja">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<title>カスタムチャットシステム Pro</title>

<style>

body,
html {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: sans-serif;
  background-color: #111;
  color: #fff;
}


/* =========================================================
   iframe
   ========================================================= */

#game-area {
  width: 100%;
  height: 100%;
  border: none;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}


/* =========================================================
   上部バー
   ========================================================= */

#top-bar-container {
  position: absolute;
  top: 15px;
  left: 15px;
  z-index: 10;

  display: flex;
  gap: 10px;

  background: rgba(0, 0, 0, 0.6);

  padding: 8px;

  border-radius: 6px;

  border:
    1px solid
    rgba(255, 255, 255, 0.1);

  box-shadow:
    0 4px 10px
    rgba(0, 0, 0, 0.4);

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

  background:
    rgba(255, 255, 255, 0.15);

  border:
    1px solid
    rgba(255, 255, 255, 0.1);

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

  background:
    rgba(255, 255, 255, 0.15);

  border:
    1px solid
    rgba(255, 255, 255, 0.1);

  border-radius: 4px;

  color: #ffca28;

  padding: 4px 8px;

  font-size: 12px;

  outline: none;

  font-weight: bold;
}


/* =========================================================
   チャット
   ========================================================= */

#chat-container {
  position: absolute;

  right: 30px;
  bottom: 30px;

  width: 320px;
  height: 240px;

  background:
    rgba(0, 0, 0, 0.6);

  border-radius: 6px;

  display: flex;
  flex-direction: column;

  z-index: 20;

  box-shadow:
    0 4px 15px
    rgba(0, 0, 0, 0.5);

  pointer-events: auto;

  border:
    1px solid
    rgba(255, 255, 255, 0.1);
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

  background:
    rgba(255, 255, 255, 0.08);

  padding: 6px 10px;

  border-radius: 4px;
}


#messages li span.sender {
  font-weight: bold;

  color: #ffca28;

  margin-right: 6px;
}


#messages li span.timestamp {
  color: #aaa;

  font-size: 10px;

  margin-left: 4px;

  margin-right: 6px;
}


/* =========================================================
   入力欄
   ========================================================= */

#input-area {
  display: flex;

  padding: 8px;

  background:
    rgba(0, 0, 0, 0.4);

  border-bottom-left-radius: 6px;

  border-bottom-right-radius: 6px;

  border-top:
    1px solid
    rgba(255, 255, 255, 0.1);
}


#chat-input {
  flex: 1;

  background:
    rgba(255, 255, 255, 0.15);

  border:
    1px solid
    rgba(255, 255, 255, 0.1);

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


<!-- ======================================================
     上部URLバー
     ====================================================== -->

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
      border-left:
        1px solid
        rgba(255,255,255,0.2);
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


<!-- ======================================================
     iframe
     ====================================================== -->

<iframe
  id="game-area"
  src="https://example.com"
></iframe>


<!-- ======================================================
     チャット
     ====================================================== -->

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

// ==========================================================
// DOM
// ==========================================================

const gameArea =
  document.getElementById("game-area");

const urlInput =
  document.getElementById("url-input");

const urlBtn =
  document.getElementById("url-btn");

const nameInput =
  document.getElementById("name-input");

const topBar =
  document.getElementById(
    "top-bar-container"
  );

const messages =
  document.getElementById("messages");

const chatInput =
  document.getElementById("chat-input");

const sendBtn =
  document.getElementById("send-btn");


// ==========================================================
// URL変更
// ==========================================================

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


  setTimeout(
    function () {

      topBar.style.display =
        "none";

    },
    500
  );
}


urlBtn.addEventListener(
  "click",
  changeUrl
);


urlInput.addEventListener(
  "keydown",
  function (e) {

    if (e.key === "Enter") {
      changeUrl();
    }
  }
);


// ==========================================================
// WebSocket接続
// ==========================================================

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


// ==========================================================
// タイムスタンプ表示
// ==========================================================

function formatTimestamp(
  timestamp
) {

  if (!timestamp) {
    return "";
  }


  const date =
    new Date(timestamp);


  if (
    isNaN(date.getTime())
  ) {

    return "";
  }


  try {

    return new Intl.DateTimeFormat(
      "ja-JP",
      {
        timeZone:
          "Asia/Tokyo",

        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",

        hour12:
          false
      }
    ).format(date);

  } catch (err) {

    return "";
  }
}


// ==========================================================
// WebSocket接続
// ==========================================================

ws.onopen =
  function () {

    console.log(
      "WebSocket connected"
    );
  };


ws.onerror =
  function (err) {

    console.error(
      "WebSocket error:",
      err
    );
  };


ws.onclose =
  function () {

    console.log(
      "WebSocket closed"
    );
  };


// ==========================================================
// メッセージ受信
// ==========================================================

ws.onmessage =
  function (e) {

    try {

      const data =
        JSON.parse(e.data);


      const li =
        document.createElement(
          "li"
        );


      // ------------------------------------------------------
      // 送信者
      // ------------------------------------------------------

      const sender =
        document.createElement(
          "span"
        );


      sender.className =
        "sender";


      sender.textContent =
        "[" +
        (data.senderId || "ゲスト") +
        "]";


      li.appendChild(
        sender
      );


      // ------------------------------------------------------
      // 時刻
      // ------------------------------------------------------

      if (data.timestamp) {

        const timestamp =
          document.createElement(
            "span"
          );


        timestamp.className =
          "timestamp";


        timestamp.textContent =
          formatTimestamp(
            data.timestamp
          );


        li.appendChild(
          timestamp
        );
      }


      // ------------------------------------------------------
      // 本文
      // ------------------------------------------------------

      const text =
        document.createTextNode(
          data.text || ""
        );


      li.appendChild(
        text
      );


      messages.appendChild(
        li
      );


      // 最大30件
      while (
        messages.children.length >
        30
      ) {

        messages.removeChild(
          messages.firstChild
        );
      }


      messages.scrollTop =
        messages.scrollHeight;

    } catch (err) {

      console.error(
        "message parse error:",
        err
      );
    }
  };


// ==========================================================
// 送信
// ==========================================================

function sendMessage() {

  const text =
    chatInput.value.trim();


  let name =
    nameInput.value.trim();


  if (name === "") {

    name =
      "ゲスト";
  }


  if (text === "") {
    return;
  }


  if (
    ws.readyState !==
    WebSocket.OPEN
  ) {

    console.error(
      "WebSocket is not connected"
    );

    return;
  }


  ws.send(
    JSON.stringify({
      text: text,
      name: name
    })
  );


  chatInput.value =
    "";
}


sendBtn.addEventListener(
  "click",
  sendMessage
);


chatInput.addEventListener(
  "keydown",
  function (e) {

    if (
      e.key === "Enter" &&
      !e.isComposing
    ) {

      sendMessage();
    }
  }
);


// ==========================================================
// "/" キーでチャット入力
// ==========================================================

window.addEventListener(
  "keydown",
  function (e) {

    if (
      document.activeElement ===
        chatInput ||
      document.activeElement ===
        urlInput ||
      document.activeElement ===
        nameInput
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
    function () {

      console.log(
        "Server running on port " +
        port
      );
    }
  );


// ============================================================
// WebSocketサーバー
// ============================================================

const wss =
  new WebSocketServer({
    server: server
  });


// ============================================================
// チャット履歴
// ============================================================

const chatHistory = [];

let historyLoadPromise =
  null;


// ============================================================
// GASから履歴を取得
// ============================================================

async function loadHistoryFromGAS() {

  // すでにロード済み
  if (
    chatHistory.length > 0
  ) {

    return;
  }


  // ロード中
  if (historyLoadPromise) {

    return historyLoadPromise;
  }


  historyLoadPromise =
    (async function () {

      try {

        console.log(
          "GASから履歴を読み込みます"
        );


        const url =
          GAS_DEPLOY_URL +
          "?action=read";


        const response =
          await fetch(url);


        const responseText =
          await response.text();


        if (!response.ok) {

          throw new Error(
            "GAS HTTP " +
            response.status +
            ": " +
            responseText
          );
        }


        let data;


        try {

          data =
            JSON.parse(
              responseText
            );

        } catch (parseError) {

          throw new Error(
            "GASからJSON以外のデータが返されました: " +
            responseText
          );
        }


        if (
          !Array.isArray(data)
        ) {

          throw new Error(
            "GAS履歴データが配列ではありません: " +
            responseText
          );
        }


        chatHistory.length =
          0;


        data.forEach(
          function (msg) {

            if (!msg) {
              return;
            }


            chatHistory.push({

              text:
                msg.text
                  ? String(msg.text)
                  : "",

              senderId:
                msg.sender_id
                  ? String(
                      msg.sender_id
                    )
                  : "ゲスト",

              timestamp:
                msg.timestamp ||
                null

            });
          }
        );


        while (
          chatHistory.length >
          30
        ) {

          chatHistory.shift();
        }


        console.log(
          "GAS履歴読み込み成功: " +
          chatHistory.length +
          "件"
        );

      } catch (err) {

        console.error(
          "Google スプレッドシート初期読み込みエラー:",
          err
        );

      } finally {

        historyLoadPromise =
          null;
      }
    })();


  return historyLoadPromise;
}


// ============================================================
// GASへ保存
// ============================================================

async function saveMessageToGAS(
  msgData
) {

  try {

    const payload = {

      action:
        "write",

      text:
        msgData.text,

      sender_id:
        msgData.senderId,

      // Renderで生成した時刻をそのまま送信
      timestamp:
        msgData.timestamp
    };


    console.log(
      "GASへ保存開始:",
      JSON.stringify(payload)
    );


    const response =
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
            JSON.stringify(
              payload
            )
        }
      );


    const responseText =
      await response.text();


    if (!response.ok) {

      throw new Error(
        "GAS HTTP " +
        response.status +
        ": " +
        responseText
      );
    }


    let result;


    try {

      result =
        JSON.parse(
          responseText
        );

    } catch (parseError) {

      throw new Error(
        "GASからJSON以外のレスポンスが返されました: " +
        responseText
      );
    }


    if (
      !result ||
      result.ok !== true
    ) {

      throw new Error(
        result &&
        result.error
          ? result.error
          : "GAS save failed"
      );
    }


    console.log(
      "スプレッドシート保存成功:",
      JSON.stringify(result)
    );


    return true;

  } catch (err) {

    console.error(
      "スプレッドシートへの保存に失敗しました:",
      err
    );


    return false;
  }
}


// ============================================================
// WebSocket接続
// ============================================================

wss.on(
  "connection",
  async function (ws) {

    console.log(
      "WebSocket client connected"
    );


    // ========================================================
    // 履歴ロード
    // ========================================================

    await loadHistoryFromGAS();


    // ========================================================
    // 接続ユーザーへ履歴を送信
    // ========================================================

    for (
      const msgData
      of chatHistory
    ) {

      if (
        ws.readyState ===
        WebSocket.OPEN
      ) {

        ws.send(
          JSON.stringify(
            msgData
          )
        );
      }
    }


    // ========================================================
    // 新規メッセージ
    // ========================================================

    ws.on(
      "message",
      async function (message) {

        try {

          const clientData =
            JSON.parse(
              message.toString()
            );


          // --------------------------------------------------
          // 本文
          // --------------------------------------------------

          let text = "";


          if (
            typeof clientData.text ===
            "string"
          ) {

            text =
              clientData.text.trim();
          }


          if (text === "") {

            return;
          }


          // --------------------------------------------------
          // 名前
          // --------------------------------------------------

          let senderId =
            "ゲスト";


          if (
            typeof clientData.name ===
              "string" &&
            clientData.name.trim() !==
              ""
          ) {

            senderId =
              clientData.name
                .trim()
                .slice(
                  0,
                  10
                );
          }


          // ==================================================
          // ★ タイムスタンプ
          //
          // ここで一度だけ生成する
          // ==================================================

          const timestamp =
            new Date()
              .toISOString();


          const msgData = {

            text:
              text,

            senderId:
              senderId,

            timestamp:
              timestamp
          };


          console.log(
            "新規メッセージ:",
            JSON.stringify(
              msgData
            )
          );


          // ==================================================
          // メモリへ保存
          // ==================================================

          chatHistory.push(
            msgData
          );


          while (
            chatHistory.length >
            30
          ) {

            chatHistory.shift();
          }


          // ==================================================
          // 全クライアントへ送信
          // ==================================================

          wss.clients.forEach(
            function (client) {

              if (
                client.readyState ===
                WebSocket.OPEN
              ) {

                client.send(
                  JSON.stringify(
                    msgData
                  )
                );
              }
            }
          );


          // ==================================================
          // GASへ保存
          //
          // 画面へ送ったものと全く同じtimestampを使用
          // ==================================================

          await saveMessageToGAS(
            msgData
          );


        } catch (err) {

          console.error(
            "WebSocket message error:",
            err
          );
        }
      }
    );


    // ========================================================
    // 切断
    // ========================================================

    ws.on(
      "close",
      function () {

        console.log(
          "WebSocket client disconnected"
        );
      }
    );


    // ========================================================
    // エラー
    // ========================================================

    ws.on(
      "error",
      function (err) {

        console.error(
          "WebSocket client error:",
          err
        );
      }
    );
  }
);
