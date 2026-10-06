// ============================================================
// chatserver.js
// Render + WebSocket + GAS + Spreadsheet
//
// タイムスタンプ:
//   今日       → 21:34
//   今年の過去 → 09/22 21:34
//   前年以前   → 2025/12/31 21:34
//
// チャット:
//   上部ドラッグバーで移動可能
// ============================================================

const express = require("express");
const { WebSocketServer, WebSocket } = require("ws");

const app = express();
const port = process.env.PORT || 3000;


// ============================================================
// GAS
// ============================================================

const GAS_DEPLOY_URL =
  "https://script.google.com/macros/s/AKfycbxvqp1PutymnKwjSzUBnDR3QXz498J2Ba1TrwYrMlBGd-66VmxH_PRoFAfXChDHFfv0Bg/exec";


// ============================================================
// HISTORY
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


/* =========================================================
   iframe
   ========================================================= */

#game-area {

  position: absolute;

  top: 0;
  left: 0;

  width: 100%;
  height: 100%;

  border: none;

  z-index: 1;
}


/* =========================================================
   TOP BAR
   ========================================================= */

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
    rgba(255,255,255,0.1);

  border-radius: 6px;

  box-shadow:
    0 4px 10px
    rgba(0,0,0,0.4);

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

  padding: 4px 8px;

  font-size: 12px;

  color: #fff;

  background:
    rgba(255,255,255,0.15);

  border:
    1px solid
    rgba(255,255,255,0.1);

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

  background:
    rgba(255,255,255,0.15);

  border:
    1px solid
    rgba(255,255,255,0.1);

  border-radius: 4px;

  outline: none;

  font-weight: bold;
}


/* =========================================================
   CHAT
   ========================================================= */

#chat-container {

  position: absolute;

  right: 30px;
  bottom: 30px;

  width: 320px;
  height: 260px;

  z-index: 20;

  display: flex;

  flex-direction: column;

  background:
    rgba(0,0,0,0.6);

  border:
    1px solid
    rgba(255,255,255,0.1);

  border-radius: 6px;

  box-shadow:
    0 4px 15px
    rgba(0,0,0,0.5);

  overflow: hidden;
}


/* =========================================================
   DRAG BAR
   ========================================================= */

#chat-drag-bar {

  flex: 0 0 20px;

  height: 20px;

  display: flex;

  align-items: center;

  justify-content: center;

  background:
    rgba(255,255,255,0.05);

  border-bottom:
    1px solid
    rgba(255,255,255,0.08);

  color: rgba(255,255,255,0.45);

  font-size: 14px;

  line-height: 20px;

  cursor: grab;

  user-select: none;

  -webkit-user-select: none;

  touch-action: none;
}


#chat-drag-bar:hover {

  background:
    rgba(255,255,255,0.10);

  color:
    rgba(255,255,255,0.75);
}


#chat-drag-bar.dragging {

  cursor: grabbing;

  background:
    rgba(255,255,255,0.12);

  color: #fff;
}


/* =========================================================
   MESSAGES
   ========================================================= */

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

  background:
    rgba(255,255,255,0.08);

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


/* =========================================================
   INPUT
   ========================================================= */

#input-area {

  display: flex;

  flex: 0 0 auto;

  padding: 8px;

  background:
    rgba(0,0,0,0.4);

  border-top:
    1px solid
    rgba(255,255,255,0.1);
}


#chat-input {

  flex: 1;

  min-width: 0;

  padding: 6px 10px;

  font-size: 13px;

  color: #fff;

  background:
    rgba(255,255,255,0.15);

  border:
    1px solid
    rgba(255,255,255,0.1);

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


<!-- ======================================================
     TOP BAR
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
      margin-left:5px;
      border-left:1px solid rgba(255,255,255,0.2);
      padding-left:10px;
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
     CHAT
     ====================================================== -->

<div id="chat-container">

  <div
    id="chat-drag-bar"
    title="ドラッグして移動"
  >
    ⋮⋮⋮
  </div>

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

const chatContainer =
  document.getElementById(
    "chat-container"
  );

const chatDragBar =
  document.getElementById(
    "chat-drag-bar"
  );

const messages =
  document.getElementById(
    "messages"
  );

const chatInput =
  document.getElementById(
    "chat-input"
  );

const sendBtn =
  document.getElementById(
    "send-btn"
  );


// ==========================================================
// CHAT DRAG
// ==========================================================

let isDragging =
  false;

let dragOffsetX =
  0;

let dragOffsetY =
  0;


// ----------------------------------------------------------
// ドラッグ開始
// ----------------------------------------------------------

chatDragBar.addEventListener(
  "pointerdown",
  function (event) {

    if (
      event.pointerType === "mouse" &&
      event.button !== 0
    ) {

      return;
    }


    event.preventDefault();


    const rect =
      chatContainer
        .getBoundingClientRect();


    dragOffsetX =
      event.clientX -
      rect.left;


    dragOffsetY =
      event.clientY -
      rect.top;


    // 初回ドラッグ時に
    // right/bottom配置から
    // left/top配置へ変換
    chatContainer.style.left =
      rect.left + "px";


    chatContainer.style.top =
      rect.top + "px";


    chatContainer.style.right =
      "auto";


    chatContainer.style.bottom =
      "auto";


    isDragging =
      true;


    chatDragBar.classList.add(
      "dragging"
    );


    try {

      chatDragBar.setPointerCapture(
        event.pointerId
      );

    } catch (error) {

      // Pointer Capture非対応時は無視
    }
  }
);


// ----------------------------------------------------------
// 移動
// ----------------------------------------------------------

chatDragBar.addEventListener(
  "pointermove",
  function (event) {

    if (!isDragging) {

      return;
    }


    event.preventDefault();


    const width =
      chatContainer.offsetWidth;


    const height =
      chatContainer.offsetHeight;


    let x =
      event.clientX -
      dragOffsetX;


    let y =
      event.clientY -
      dragOffsetY;


    // --------------------------------------------------------
    // 画面外へ出ないよう制限
    // --------------------------------------------------------

    const maxX =
      Math.max(
        0,
        window.innerWidth -
        width
      );


    const maxY =
      Math.max(
        0,
        window.innerHeight -
        height
      );


    x =
      Math.max(
        0,
        Math.min(
          x,
          maxX
        )
      );


    y =
      Math.max(
        0,
        Math.min(
          y,
          maxY
        )
      );


    chatContainer.style.left =
      x + "px";


    chatContainer.style.top =
      y + "px";
  }
);


// ----------------------------------------------------------
// ドラッグ終了
// ----------------------------------------------------------

function finishDragging(
  event
) {

  if (!isDragging) {

    return;
  }


  isDragging =
    false;


  chatDragBar.classList.remove(
    "dragging"
  );


  if (event) {

    try {

      chatDragBar.releasePointerCapture(
        event.pointerId
      );

    } catch (error) {

      // 無視
    }
  }
}


chatDragBar.addEventListener(
  "pointerup",
  finishDragging
);


chatDragBar.addEventListener(
  "pointercancel",
  finishDragging
);


// ==========================================================
// ウィンドウリサイズ
// ==========================================================

window.addEventListener(
  "resize",
  function () {

    // 一度も移動していない場合は
    // right/bottom配置を維持
    if (
      chatContainer.style.left === ""
    ) {

      return;
    }


    const rect =
      chatContainer
        .getBoundingClientRect();


    const maxX =
      Math.max(
        0,
        window.innerWidth -
        rect.width
      );


    const maxY =
      Math.max(
        0,
        window.innerHeight -
        rect.height
      );


    const x =
      Math.max(
        0,
        Math.min(
          rect.left,
          maxX
        )
      );


    const y =
      Math.max(
        0,
        Math.min(
          rect.top,
          maxY
        )
      );


    chatContainer.style.left =
      x + "px";


    chatContainer.style.top =
      y + "px";
  }
);


// ==========================================================
// URL変更
// ==========================================================

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


// ==========================================================
// WEBSOCKET
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
// TIMESTAMP
// ==========================================================

function getJapanDateParts(
  date
) {

  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "Asia/Tokyo",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        hourCycle:
          "h23"
      }
    ).formatToParts(
      date
    );


  const result = {};


  for (
    const part
    of parts
  ) {

    if (
      part.type !==
      "literal"
    ) {

      result[
        part.type
      ] =
        part.value;
    }
  }


  return result;
}


function formatTimestamp(
  value
) {

  if (!value) {

    return "";
  }


  const date =
    new Date(value);


  if (
    isNaN(
      date.getTime()
    )
  ) {

    return "";
  }


  const target =
    getJapanDateParts(
      date
    );


  const now =
    getJapanDateParts(
      new Date()
    );


  // 今日
  if (
    target.year === now.year &&
    target.month === now.month &&
    target.day === now.day
  ) {

    return (
      target.hour +
      ":" +
      target.minute
    );
  }


  // 今年
  if (
    target.year === now.year
  ) {

    return (
      target.month +
      "/" +
      target.day +
      " " +
      target.hour +
      ":" +
      target.minute
    );
  }


  // 前年以前
  return (
    target.year +
    "/" +
    target.month +
    "/" +
    target.day +
    " " +
    target.hour +
    ":" +
    target.minute
  );
}


// ==========================================================
// MESSAGE RECEIVE
// ==========================================================

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


      // ------------------------------------------------------
      // Sender
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
      // Timestamp
      // ------------------------------------------------------

      if (
        data.timestamp
      ) {

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
      // Text
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


      while (
        messages.children.length >
        MAX_HISTORY_CLIENT
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


const MAX_HISTORY_CLIENT =
  30;


// ==========================================================
// WEBSOCKET STATUS
// ==========================================================

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


ws.onclose =
  function () {

    console.log(
      "WebSocket closed"
    );
  };


// ==========================================================
// SEND MESSAGE
// ==========================================================

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


// ==========================================================
// "/" shortcut
// ==========================================================

window.addEventListener(
  "keydown",
  function (event) {

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
        "PORT: " +
        port
      );

      console.log(
        "========================================"
      );


      loadHistoryFromGAS();
    }
  );


// ============================================================
// WEBSOCKET SERVER
// ============================================================

const wss =
  new WebSocketServer({
    server:
      server
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

          throw new Error(
            "GAS response is not JSON: " +
            body
          );
        }


        if (
          !Array.isArray(
            data
          )
        ) {

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
    // MESSAGE
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
          // timestamp
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
          // Memory
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
          // Broadcast
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
          // Spreadsheet
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


    // ========================================================
    // CLOSE
    // ========================================================

    ws.on(
      "close",
      function () {

        console.log(
          "[WS] Client disconnected"
        );
      }
    );


    // ========================================================
    // ERROR
    // ========================================================

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
