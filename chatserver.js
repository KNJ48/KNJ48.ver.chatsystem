// ============================================================
// chatserver.js
// Render + WebSocket + Google Apps Script + Spreadsheet
// ============================================================

const express = require("express");
const { WebSocketServer, WebSocket } = require("ws");

const app = express();

const port =
  process.env.PORT || 3000;


// ============================================================
// GAS WEB APP URL
// ============================================================

const GAS_DEPLOY_URL =
  "https://script.google.com/macros/s/AKfycbxvqp1PutymnKwjSzUBnDR3QXz498J2Ba1TrwYrMlBGd-66VmxH_PRoFAfXChDHFfv0Bg/exec";


// ============================================================
// チャット履歴
// ============================================================

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

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<title>カスタムチャットシステム Pro</title>

<style>

html,
body {
  margin: 0;
  padding: 0;

  width: 100%;
  height: 100%;

  overflow: hidden;

  font-family: sans-serif;

  background: #111;
  color: #fff;
}


/* ==========================================================
   iframe
   ========================================================== */

#game-area {

  position: absolute;

  top: 0;
  left: 0;

  width: 100%;
  height: 100%;

  border: none;

  z-index: 1;
}


/* ==========================================================
   TOP BAR
   ========================================================== */

#top-bar-container {

  position: absolute;

  top: 15px;
  left: 15px;

  z-index: 10;

  display: flex;

  gap: 10px;

  padding: 8px;

  background:
    rgba(0, 0, 0, 0.6);

  border:
    1px solid
    rgba(255, 255, 255, 0.1);

  border-radius: 6px;

  box-shadow:
    0 4px 10px
    rgba(0, 0, 0, 0.4);

  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
}


.bar-group {

  display: flex;

  align-items: center;

  gap: 4px;
}


.bar-label {

  color: #ccc;

  font-size: 11px;

  font-weight: bold;
}


#url-input {

  width: 220px;

  padding: 4px 8px;

  color: white;

  font-size: 12px;

  background:
    rgba(255, 255, 255, 0.15);

  border:
    1px solid
    rgba(255, 255, 255, 0.1);

  border-radius: 4px;

  outline: none;
}


#url-btn {

  padding: 4px 10px;

  border: none;

  border-radius: 4px;

  background: #2196f3;

  color: white;

  font-size: 12px;

  font-weight: bold;

  cursor: pointer;
}


#name-input {

  width: 100px;

  padding: 4px 8px;

  color: #ffca28;

  background:
    rgba(255, 255, 255, 0.15);

  border:
    1px solid
    rgba(255, 255, 255, 0.1);

  border-radius: 4px;

  outline: none;

  font-size: 12px;

  font-weight: bold;
}


/* ==========================================================
   CHAT
   ========================================================== */

#chat-container {

  position: absolute;

  right: 30px;
  bottom: 30px;

  width: 320px;
  height: 240px;

  z-index: 20;

  display: flex;

  flex-direction: column;

  background:
    rgba(0, 0, 0, 0.6);

  border:
    1px solid
    rgba(255, 255, 255, 0.1);

  border-radius: 6px;

  box-shadow:
    0 4px 15px
    rgba(0, 0, 0, 0.5);
}


#messages {

  flex: 1;

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

  color: white;

  font-size: 13px;

  line-height: 1.4;

  word-break: break-all;

  background:
    rgba(255, 255, 255, 0.08);

  border-radius: 4px;
}


.sender {

  color: #ffca28;

  font-weight: bold;

  margin-right: 6px;
}


.timestamp {

  color: #aaa;

  font-size: 10px;

  margin-right: 6px;
}


/* ==========================================================
   INPUT
   ========================================================== */

#input-area {

  display: flex;

  padding: 8px;

  background:
    rgba(0, 0, 0, 0.4);

  border-top:
    1px solid
    rgba(255, 255, 255, 0.1);
}


#chat-input {

  flex: 1;

  padding: 6px 10px;

  color: white;

  background:
    rgba(255, 255, 255, 0.15);

  border:
    1px solid
    rgba(255, 255, 255, 0.1);

  border-radius: 4px;

  outline: none;

  font-size: 13px;
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
}

</style>

</head>


<body>


<!-- TOP BAR -->

<div id="top-bar-container">

  <div class="bar-group">

    <span class="bar-label">
      URL:
    </span>

    <input
      id="url-input"
      type="text"
      value="https://example.com"
    >

    <button id="url-btn">
      移動
    </button>

  </div>


  <div
    class="bar-group"
    style="
      margin-left:5px;
      padding-left:10px;
      border-left:
        1px solid
        rgba(255,255,255,0.2);
    "
  >

    <span class="bar-label">
      NAME:
    </span>

    <input
      id="name-input"
      type="text"
      value="ゲスト"
      maxlength="10"
    >

  </div>

</div>


<!-- iframe -->

<iframe
  id="game-area"
  src="https://example.com"
></iframe>


<!-- CHAT -->

<div id="chat-container">

  <ul id="messages"></ul>

  <div id="input-area">

    <input
      id="chat-input"
      type="text"
      placeholder="チャットを開始..."
      autocomplete="off"
    >

    <button id="send-btn">
      送信
    </button>

  </div>

</div>


<script>

// ============================================================
// DOM
// ============================================================

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
// URL
// ============================================================

function changeUrl() {

  let url =
    urlInput.value.trim();


  if (!url) {
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
  function (event) {

    if (
      event.key === "Enter"
    ) {

      changeUrl();
    }
  }
);


// ============================================================
// WebSocket
// ============================================================

const wsProtocol =
  window.location.protocol === "https:"
    ? "wss:"
    : "ws:";


const ws =
  new WebSocket(
    wsProtocol +
    "//" +
    window.location.host
  );


// ============================================================
// TIME
// ============================================================

function formatTimestamp(value) {

  if (!value) {
    return "";
  }


  const date =
    new Date(value);


  if (
    isNaN(date.getTime())
  ) {

    return "";
  }


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
}


// ============================================================
// 受信
// ============================================================

ws.onmessage =
  function (event) {

    try {

      const data =
        JSON.parse(
          event.data
        );


      const li =
        document.createElement(
          "li"
        );


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


      if (data.timestamp) {

        const time =
          document.createElement(
            "span"
          );


        time.className =
          "timestamp";


        time.textContent =
          formatTimestamp(
            data.timestamp
          );


        li.appendChild(
          time
        );
      }


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

    } catch (error) {

      console.error(
        "受信エラー:",
        error
      );
    }
  };


ws.onopen =
  function () {

    console.log(
      "WebSocket connected"
    );
  };


ws.onerror =
  function (error) {

    console.error(
      "WebSocket error:",
      error
    );
  };


// ============================================================
// SEND
// ============================================================

function sendMessage() {

  const text =
    chatInput.value.trim();


  let name =
    nameInput.value.trim();


  if (!name) {

    name =
      "ゲスト";
  }


  if (!text) {
    return;
  }


  if (
    ws.readyState !==
    WebSocket.OPEN
  ) {

    console.error(
      "WebSocket未接続"
    );

    return;
  }


  ws.send(
    JSON.stringify({
      text:
        text,

      name:
        name
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
  function (event) {

    if (
      event.key === "Enter" &&
      !event.isComposing
    ) {

      sendMessage();
    }
  }
);


// ============================================================
// "/" shortcut
// ============================================================

window.addEventListener(
  "keydown",
  function (event) {

    if (
      document.activeElement === chatInput ||
      document.activeElement === urlInput ||
      document.activeElement === nameInput
    ) {

      return;
    }


    if (
      event.key === "/"
    ) {

      event.preventDefault();

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
// HTTP SERVER
// ============================================================

const server =
  app.listen(
    port,
    function () {

      console.log(
        "========================================"
      );

      console.log(
        "ChatServer 起動"
      );

      console.log(
        "PORT: " + port
      );

      console.log(
        "========================================"
      );


      // 起動直後にGASへ接続
      loadHistoryFromGAS();
    }
  );


// ============================================================
// WEBSOCKET SERVER
// ============================================================

const wss =
  new WebSocketServer({
    server: server
  });


// ============================================================
// GAS GET
// ============================================================

async function loadHistoryFromGAS() {

  if (
    historyLoaded
  ) {

    console.log(
      "[GAS GET] 履歴はロード済みです"
    );

    return;
  }


  if (
    historyLoadingPromise
  ) {

    console.log(
      "[GAS GET] 現在ロード中です"
    );

    return historyLoadingPromise;
  }


  historyLoadingPromise =
    (async function () {

      try {

        console.log(
          "========================================"
        );

        console.log(
          "[GAS GET] 接続開始"
        );

        console.log(
          "[GAS GET] URL: " +
          GAS_DEPLOY_URL
        );


        const response =
          await fetch(
            GAS_DEPLOY_URL +
            "?action=read",
            {
              method:
                "GET",

              redirect:
                "follow",

              cache:
                "no-store"
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


        const body =
          await response.text();


        if (
          !response.ok
        ) {

          throw new Error(
            "HTTP " +
            response.status +
            " / " +
            body
          );
        }


        let data;


        try {

          data =
            JSON.parse(
              body
            );

        } catch (error) {

          console.error(
            "[GAS GET] JSONではありません"
          );

          console.error(
            "[GAS GET] RESPONSE:",
            body
          );

          throw new Error(
            "GAS response is not JSON"
          );
        }


        if (
          !Array.isArray(data)
        ) {

          console.error(
            "[GAS GET] 配列ではありません:",
            data
          );

          throw new Error(
            "GAS response is not an array"
          );
        }


        chatHistory.length =
          0;


        data.forEach(
          function (message) {

            if (!message) {
              return;
            }


            chatHistory.push({

              text:
                message.text == null
                  ? ""
                  : String(
                      message.text
                    ),

              senderId:
                message.sender_id == null ||
                message.sender_id === ""
                  ? "ゲスト"
                  : String(
                      message.sender_id
                    ),

              timestamp:
                message.timestamp ||
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


        historyLoaded =
          true;


        console.log(
          "[GAS GET] 成功"
        );


        console.log(
          "[GAS GET] 履歴件数: " +
          chatHistory.length
        );


        console.log(
          "========================================"
        );


      } catch (error) {

        historyLoaded =
          false;


        console.error(
          "!!!!!!!! GAS GET ERROR !!!!!!!!"
        );


        console.error(
          error
        );


        console.error(
          "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
        );


      } finally {

        historyLoadingPromise =
          null;
      }
    })();


  return historyLoadingPromise;
}


// ============================================================
// GAS POST
// ============================================================

async function saveMessageToGAS(
  message
) {

  try {

    const payload = {

      action:
        "write",

      text:
        message.text,

      sender_id:
        message.senderId,

      timestamp:
        message.timestamp
    };


    console.log(
      "[GAS POST] 保存開始"
    );


    console.log(
      "[GAS POST] DATA: " +
      JSON.stringify(
        payload
      )
    );


    const response =
      await fetch(
        GAS_DEPLOY_URL,
        {
          method:
            "POST",

          redirect:
            "follow",

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


    console.log(
      "[GAS POST] HTTP STATUS: " +
      response.status
    );


    console.log(
      "[GAS POST] FINAL URL: " +
      response.url
    );


    const responseBody =
      await response.text();


    console.log(
      "[GAS POST] RESPONSE: " +
      responseBody
    );


    if (
      !response.ok
    ) {

      throw new Error(
        "HTTP " +
        response.status +
        ": " +
        responseBody
      );
    }


    let result;


    try {

      result =
        JSON.parse(
          responseBody
        );

    } catch (error) {

      throw new Error(
        "GAS POST response is not JSON: " +
        responseBody
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
      "[GAS POST] スプレッドシート保存成功"
    );


    return true;


  } catch (error) {

    console.error(
      "!!!!!!!! GAS POST ERROR !!!!!!!!"
    );


    console.error(
      error
    );


    console.error(
      "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
    );


    return false;
  }
}


// ============================================================
// WEBSOCKET CONNECTION
// ============================================================

wss.on(
  "connection",
  async function (ws) {

    console.log(
      "[WS] Client connected"
    );


    // 起動時ロードがまだなら待つ
    if (
      !historyLoaded
    ) {

      await loadHistoryFromGAS();
    }


    // ========================================================
    // 履歴送信
    // ========================================================

    console.log(
      "[WS] 履歴を送信: " +
      chatHistory.length +
      "件"
    );


    for (
      const message
      of chatHistory
    ) {

      if (
        ws.readyState ===
        WebSocket.OPEN
      ) {

        ws.send(
          JSON.stringify(
            message
          )
        );
      }
    }


    // ========================================================
    // NEW MESSAGE
    // ========================================================

    ws.on(
      "message",
      async function (
        rawMessage
      ) {

        try {

          const clientData =
            JSON.parse(
              rawMessage.toString()
            );


          let text =
            "";


          if (
            typeof clientData.text ===
            "string"
          ) {

            text =
              clientData.text.trim();
          }


          if (!text) {

            return;
          }


          let senderId =
            "ゲスト";


          if (
            typeof clientData.name ===
              "string" &&
            clientData.name.trim()
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
          // タイムスタンプはここで一度だけ生成
          // ==================================================

          const timestamp =
            new Date()
              .toISOString();


          const message = {

            text:
              text,

            senderId:
              senderId,

            timestamp:
              timestamp
          };


          console.log(
            "[CHAT] NEW: " +
            JSON.stringify(
              message
            )
          );


          // ==================================================
          // メモリ履歴
          // ==================================================

          chatHistory.push(
            message
          );


          while (
            chatHistory.length >
            MAX_HISTORY
          ) {

            chatHistory.shift();
          }


          // ==================================================
          // 全員に送信
          // ==================================================

          wss.clients.forEach(
            function (client) {

              if (
                client.readyState ===
                WebSocket.OPEN
              ) {

                client.send(
                  JSON.stringify(
                    message
                  )
                );
              }
            }
          );


          // ==================================================
          // GAS保存
          // ==================================================

          await saveMessageToGAS(
            message
          );


        } catch (error) {

          console.error(
            "[WS] Message error:",
            error
          );
        }
      }
    );


    ws.on(
      "close",
      function () {

        console.log(
          "[WS] Client disconnected"
        );
      }
    );


    ws.on(
      "error",
      function (error) {

        console.error(
          "[WS] Error:",
          error
        );
      }
    );
  }
);
