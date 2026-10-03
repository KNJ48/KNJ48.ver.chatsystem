// ============================================================
// chatserver.js
//
// Render + Express + WebSocket
// + Google Apps Script + Spreadsheet
//
// ・最大履歴30件
// ・GASから履歴復元
// ・GASへメッセージ保存
// ・WebSocketリアルタイム配信
//
// history:
//   true  = 接続時の過去ログ
//   false = 新着
//
// Desktop版は
// history === false
// のメッセージだけ読み上げる。
// ============================================================


const express =
  require("express");


const {
  WebSocketServer,
  WebSocket
} =
  require("ws");


// ============================================================
// EXPRESS
// ============================================================

const app =
  express();


const port =
  process.env.PORT ||
  3000;


// ============================================================
// GAS
// ============================================================

const GAS_DEPLOY_URL =
  "https://script.google.com/macros/s/AKfycbxvqp1PutymnKwjSzUBnDR3QXz498J2Ba1TrwYrMlBGd-66VmxH_PRoFAfXChDHFfv0Bg/exec";


// ============================================================
// CHAT HISTORY
// ============================================================

const chatHistory =
  [];


const MAX_HISTORY =
  30;


let historyLoaded =
  false;


let historyLoadingPromise =
  null;


// ============================================================
// LIMITS
// ============================================================

const MAX_TEXT_LENGTH =
  500;


const MAX_NAME_LENGTH =
  30;


// ============================================================
// HTML
// ============================================================

app.get(
  "/",
  function (
    req,
    res
  ) {

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

  font-family:
    sans-serif;

  background:
    #111;

  color:
    #fff;
}


/* ============================================================
   IFRAME
   ============================================================ */

#game-area {

  position:
    absolute;

  top:
    0;

  left:
    0;

  width:
    100%;

  height:
    100%;

  border:
    none;

  z-index:
    1;
}


/* ============================================================
   TOP BAR
   ============================================================ */

#top-bar-container {

  position:
    absolute;

  top:
    15px;

  left:
    15px;

  z-index:
    10;

  display:
    flex;

  gap:
    10px;

  padding:
    8px;

  background:
    rgba(
      0,
      0,
      0,
      0.6
    );

  border:
    1px solid
    rgba(
      255,
      255,
      255,
      0.1
    );

  border-radius:
    6px;

  box-shadow:
    0 4px 10px
    rgba(
      0,
      0,
      0,
      0.4
    );

  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
}


.bar-group {

  display:
    flex;

  align-items:
    center;

  gap:
    4px;
}


.bar-label {

  color:
    #ccc;

  font-size:
    11px;

  font-weight:
    bold;
}


#url-input {

  width:
    220px;

  padding:
    4px 8px;

  color:
    white;

  font-size:
    12px;

  background:
    rgba(
      255,
      255,
      255,
      0.15
    );

  border:
    1px solid
    rgba(
      255,
      255,
      255,
      0.1
    );

  border-radius:
    4px;

  outline:
    none;
}


#url-btn {

  padding:
    4px 10px;

  border:
    none;

  border-radius:
    4px;

  background:
    #2196f3;

  color:
    white;

  font-size:
    12px;

  font-weight:
    bold;

  cursor:
    pointer;
}


#name-input {

  width:
    130px;

  padding:
    4px 8px;

  color:
    #ffca28;

  background:
    rgba(
      255,
      255,
      255,
      0.15
    );

  border:
    1px solid
    rgba(
      255,
      255,
      255,
      0.1
    );

  border-radius:
    4px;

  outline:
    none;

  font-size:
    12px;

  font-weight:
    bold;
}


/* ============================================================
   CHAT
   ============================================================ */

#chat-container {

  position:
    absolute;

  right:
    30px;

  bottom:
    30px;

  width:
    320px;

  height:
    240px;

  z-index:
    20;

  display:
    flex;

  flex-direction:
    column;

  background:
    rgba(
      0,
      0,
      0,
      0.6
    );

  border:
    1px solid
    rgba(
      255,
      255,
      255,
      0.1
    );

  border-radius:
    6px;

  box-shadow:
    0 4px 15px
    rgba(
      0,
      0,
      0,
      0.5
    );
}


/* ============================================================
   MESSAGES
   ============================================================ */

#messages {

  flex:
    1;

  min-height:
    0;

  overflow-y:
    auto;

  margin:
    0;

  padding:
    10px;

  list-style:
    none;

  display:
    flex;

  flex-direction:
    column;

  gap:
    6px;
}


#messages li {

  padding:
    6px 10px;

  color:
    white;

  font-size:
    13px;

  line-height:
    1.4;

  overflow-wrap:
    anywhere;

  background:
    rgba(
      255,
      255,
      255,
      0.08
    );

  border-radius:
    4px;
}


.sender {

  color:
    #ffca28;

  font-weight:
    bold;

  margin-right:
    6px;
}


.timestamp {

  color:
    #aaa;

  font-size:
    10px;

  margin-right:
    6px;
}


/* ============================================================
   INPUT
   ============================================================ */

#input-area {

  display:
    flex;

  flex-shrink:
    0;

  padding:
    8px;

  background:
    rgba(
      0,
      0,
      0,
      0.4
    );

  border-top:
    1px solid
    rgba(
      255,
      255,
      255,
      0.1
    );
}


#chat-input {

  flex:
    1;

  min-width:
    0;

  padding:
    6px 10px;

  color:
    white;

  background:
    rgba(
      255,
      255,
      255,
      0.15
    );

  border:
    1px solid
    rgba(
      255,
      255,
      255,
      0.1
    );

  border-radius:
    4px;

  outline:
    none;

  font-size:
    13px;
}


#send-btn {

  margin-left:
    8px;

  padding:
    6px 14px;

  color:
    white;

  background:
    #4caf50;

  border:
    none;

  border-radius:
    4px;

  cursor:
    pointer;

  font-weight:
    bold;
}

</style>

</head>


<body>


<!-- =========================================================
     TOP BAR
     ========================================================= -->

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


    <button
      id="url-btn"
      type="button"
    >
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
      maxlength="30"
      autocomplete="off"
    >


  </div>


</div>


<!-- =========================================================
     IFRAME
     ========================================================= -->

<iframe
  id="game-area"
  src="https://example.com"
></iframe>


<!-- =========================================================
     CHAT
     ========================================================= -->

<div id="chat-container">


  <ul id="messages"></ul>


  <div id="input-area">


    <input
      id="chat-input"
      type="text"
      maxlength="500"
      placeholder="チャットを開始..."
      autocomplete="off"
    >


    <button
      id="send-btn"
      type="button"
    >
      送信
    </button>


  </div>


</div>


<script>

// ============================================================
// DOM
// ============================================================

const gameArea =
  document.getElementById(
    "game-area"
  );


const urlInput =
  document.getElementById(
    "url-input"
  );


const urlBtn =
  document.getElementById(
    "url-btn"
  );


const nameInput =
  document.getElementById(
    "name-input"
  );


const topBar =
  document.getElementById(
    "top-bar-container"
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


// ============================================================
// NAME SAVE
// ============================================================

nameInput.value =
  localStorage.getItem(
    "knj-web-chat-name"
  ) ||
  "ゲスト";


nameInput.addEventListener(
  "input",
  function () {

    localStorage.setItem(
      "knj-web-chat-name",
      nameInput.value
    );
  }
);


// ============================================================
// URL
// ============================================================

function changeUrl() {

  let url =
    urlInput.value
      .trim();


  if (
    !url
  ) {

    return;
  }


  if (
    !url.startsWith(
      "http://"
    ) &&
    !url.startsWith(
      "https://"
    )
  ) {

    url =
      "https://" +
      url;


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
  function (
    event
  ) {

    if (
      event.key ===
      "Enter"
    ) {

      changeUrl();
    }
  }
);


// ============================================================
// WEBSOCKET
// ============================================================

const wsProtocol =
  window.location.protocol ===
  "https:"
    ? "wss:"
    : "ws:";


const ws =
  new WebSocket(
    wsProtocol +
    "//" +
    window.location.host
  );


// ============================================================
// JAPAN DATE PARTS
// ============================================================

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
    )
    .formatToParts(
      date
    );


  const result =
    {};


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


// ============================================================
// TIMESTAMP
// ============================================================

function formatTimestamp(
  value
) {

  if (
    !value
  ) {

    return "";
  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
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
    target.year ===
      now.year &&
    target.month ===
      now.month &&
    target.day ===
      now.day
  ) {

    return (
      target.hour +
      ":" +
      target.minute
    );
  }


  // 今年
  if (
    target.year ===
    now.year
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


// ============================================================
// ADD MESSAGE
// ============================================================

function addMessage(
  data
) {

  const li =
    document.createElement(
      "li"
    );


  // ==========================================================
  // SENDER
  // ==========================================================

  const sender =
    document.createElement(
      "span"
    );


  sender.className =
    "sender";


  sender.textContent =
    "[" +
    (
      data.senderId ||
      "ゲスト"
    ) +
    "]";


  li.appendChild(
    sender
  );


  // ==========================================================
  // TIMESTAMP
  // ==========================================================

  if (
    data.timestamp
  ) {

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


  // ==========================================================
  // TEXT
  //
  // createTextNodeなのでHTMLとして解釈しない。
  // ==========================================================

  li.appendChild(
    document.createTextNode(
      data.text ||
      ""
    )
  );


  messages.appendChild(
    li
  );


  // ==========================================================
  // MAX 30
  // ==========================================================

  while (
    messages.children.length >
    30
  ) {

    messages
      .firstChild
      .remove();
  }


  // ==========================================================
  // SCROLL
  // ==========================================================

  messages.scrollTop =
    messages.scrollHeight;
}


// ============================================================
// WS RECEIVE
// ============================================================

ws.onmessage =
  function (
    event
  ) {

    try {

      const data =
        JSON.parse(
          event.data
        );


      /*
        historyはWeb版では表示上の違いはない。

        Desktop版では、

          history:true
          → 表示のみ

          history:false
          → 表示 + 読み上げ

        に使用する。
      */

      addMessage(
        data
      );


    } catch (
      error
    ) {

      console.error(
        "受信エラー:",
        error
      );
    }
  };


// ============================================================
// WS STATUS
// ============================================================

ws.onopen =
  function () {

    console.log(
      "WebSocket connected"
    );
  };


ws.onerror =
  function (
    error
  ) {

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


// ============================================================
// SEND
// ============================================================

function sendMessage() {

  let text =
    chatInput.value
      .trim();


  let name =
    nameInput.value
      .trim();


  if (
    !name
  ) {

    name =
      "ゲスト";
  }


  if (
    !text
  ) {

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


  // ==========================================================
  // CLIENT SIDE LIMIT
  // ==========================================================

  text =
    text.slice(
      0,
      500
    );


  name =
    name.slice(
      0,
      30
    );


  localStorage.setItem(
    "knj-web-chat-name",
    name
  );


  // ==========================================================
  // SEND
  //
  // historyはクライアントから指定させない。
  // サーバー側で決定する。
  // ==========================================================

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


// ============================================================
// BUTTON
// ============================================================

sendBtn.addEventListener(
  "click",
  sendMessage
);


// ============================================================
// ENTER
// ============================================================

chatInput.addEventListener(
  "keydown",
  function (
    event
  ) {

    if (
      event.key ===
        "Enter" &&
      !event.isComposing
    ) {

      event.preventDefault();


      sendMessage();
    }
  }
);


// ============================================================
// "/" SHORTCUT
// ============================================================

window.addEventListener(
  "keydown",
  function (
    event
  ) {

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
      event.key ===
      "/"
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
  }
);


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


      // 起動直後にGAS履歴取得
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
// LOAD HISTORY FROM GAS
// ============================================================

async function loadHistoryFromGAS() {

  // ==========================================================
  // ALREADY LOADED
  // ==========================================================

  if (
    historyLoaded
  ) {

    return;
  }


  // ==========================================================
  // CURRENTLY LOADING
  // ==========================================================

  if (
    historyLoadingPromise
  ) {

    return historyLoadingPromise;
  }


  // ==========================================================
  // LOAD
  // ==========================================================

  historyLoadingPromise =
    (async function () {

      try {

        console.log(
          "[GAS GET] 接続開始"
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
          "[GAS GET] STATUS:",
          response.status
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


        // ====================================================
        // JSON
        // ====================================================

        let data;


        try {

          data =
            JSON.parse(
              body
            );


        } catch (
          error
        ) {

          console.error(
            "[GAS GET] RESPONSE:",
            body
          );


          throw new Error(
            "GAS response is not JSON"
          );
        }


        // ====================================================
        // ARRAY
        // ====================================================

        if (
          !Array.isArray(
            data
          )
        ) {

          throw new Error(
            "GAS response is not an array"
          );
        }


        // ====================================================
        // CLEAR
        // ====================================================

        chatHistory.length =
          0;


        // ====================================================
        // IMPORT
        //
        // historyフラグは保存しない。
        // ====================================================

        for (
          const item
          of data
        ) {

          if (
            !item
          ) {

            continue;
          }


          const text =
            item.text == null
              ? ""
              : String(
                  item.text
                );


          const senderId =
            item.sender_id == null ||
            item.sender_id === ""
              ? "ゲスト"
              : String(
                  item.sender_id
                );


          const timestamp =
            item.timestamp ||
            null;


          chatHistory.push({

            text:
              text,

            senderId:
              senderId,

            timestamp:
              timestamp
          });
        }


        // ====================================================
        // MAX 30
        // ====================================================

        while (
          chatHistory.length >
          MAX_HISTORY
        ) {

          chatHistory.shift();
        }


        historyLoaded =
          true;


        console.log(
          "[GAS GET] 履歴:",
          chatHistory.length,
          "件"
        );


      } catch (
        error
      ) {

        historyLoaded =
          false;


        console.error(
          "[GAS GET] ERROR:",
          error
        );


      } finally {

        historyLoadingPromise =
          null;
      }
    })();


  return historyLoadingPromise;
}


// ============================================================
// SAVE MESSAGE TO GAS
// ============================================================

async function saveMessageToGAS(
  message
) {

  try {

    // ========================================================
    // historyはGASへ保存しない
    // ========================================================

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


    const body =
      await response.text();


    if (
      !response.ok
    ) {

      throw new Error(
        "HTTP " +
        response.status +
        ": " +
        body
      );
    }


    let result;


    try {

      result =
        JSON.parse(
          body
        );


    } catch (
      error
    ) {

      throw new Error(
        "GAS response is not JSON: " +
        body
      );
    }


    if (
      !result ||
      result.ok !==
        true
    ) {

      throw new Error(
        result?.error ||
        "GAS save failed"
      );
    }


    console.log(
      "[GAS POST] 保存成功"
    );


    return true;


  } catch (
    error
  ) {

    console.error(
      "[GAS POST] ERROR:",
      error
    );


    return false;
  }
}


// ============================================================
// SEND HISTORY TO CLIENT
// ============================================================

function sendHistory(
  ws
) {

  console.log(
    "[WS] 履歴送信:",
    chatHistory.length,
    "件"
  );


  for (
    const message
    of chatHistory
  ) {

    if (
      ws.readyState !==
      WebSocket.OPEN
    ) {

      break;
    }


    // ========================================================
    // IMPORTANT
    //
    // 接続時の過去ログだけ
    // history:true
    // ========================================================

    const historyMessage = {

      text:
        message.text,

      senderId:
        message.senderId,

      timestamp:
        message.timestamp,

      history:
        true
    };


    ws.send(
      JSON.stringify(
        historyMessage
      )
    );
  }
}


// ============================================================
// BROADCAST NEW MESSAGE
// ============================================================

function broadcastNewMessage(
  message
) {

  // ==========================================================
  // IMPORTANT
  //
  // 新着は必ず history:false
  // ==========================================================

  const outgoing = {

    text:
      message.text,

    senderId:
      message.senderId,

    timestamp:
      message.timestamp,

    history:
      false
  };


  const serialized =
    JSON.stringify(
      outgoing
    );


  wss.clients.forEach(
    function (
      client
    ) {

      if (
        client.readyState ===
        WebSocket.OPEN
      ) {

        client.send(
          serialized
        );
      }
    }
  );
}


// ============================================================
// WEBSOCKET CONNECTION
// ============================================================

wss.on(
  "connection",
  async function (
    ws,
    request
  ) {

    console.log(
      "[WS] Client connected"
    );


    // ========================================================
    // LOAD HISTORY
    // ========================================================

    if (
      !historyLoaded
    ) {

      await loadHistoryFromGAS();
    }


    // ========================================================
    // SEND HISTORY
    // ========================================================

    sendHistory(
      ws
    );


    // ========================================================
    // RATE LIMIT
    //
    // 1接続につき
    // 最短300ms間隔。
    // ========================================================

    let lastMessageAt =
      0;


    // ========================================================
    // MESSAGE
    // ========================================================

    ws.on(
      "message",
      async function (
        rawMessage
      ) {

        try {

          // ==================================================
          // BASIC RATE LIMIT
          // ==================================================

          const now =
            Date.now();


          if (
            now -
              lastMessageAt <
            300
          ) {

            console.warn(
              "[WS] rate limit"
            );


            return;
          }


          lastMessageAt =
            now;


          // ==================================================
          // PARSE
          // ==================================================

          let clientData;


          try {

            clientData =
              JSON.parse(
                rawMessage.toString()
              );


          } catch (
            error
          ) {

            console.warn(
              "[WS] invalid JSON"
            );


            return;
          }


          if (
            !clientData ||
            typeof clientData !==
              "object"
          ) {

            return;
          }


          // ==================================================
          // TEXT
          // ==================================================

          let text =
            "";


          if (
            typeof clientData.text ===
            "string"
          ) {

            text =
              clientData.text
                .trim()
                .slice(
                  0,
                  MAX_TEXT_LENGTH
                );
          }


          if (
            !text
          ) {

            return;
          }


          // ==================================================
          // NAME
          //
          // history等はクライアントから信用しない。
          // ==================================================

          let senderId =
            "ゲスト";


          if (
            typeof clientData.name ===
              "string"
          ) {

            const name =
              clientData.name
                .trim();


            if (
              name
            ) {

              senderId =
                name.slice(
                  0,
                  MAX_NAME_LENGTH
                );
            }
          }


          // ==================================================
          // TIMESTAMP
          // ==================================================

          const timestamp =
            new Date()
              .toISOString();


          // ==================================================
          // INTERNAL MESSAGE
          //
          // historyは内部データへ保存しない。
          // ==================================================

          const message = {

            text:
              text,

            senderId:
              senderId,

            timestamp:
              timestamp
          };


          console.log(
            "[CHAT] NEW:",
            JSON.stringify(
              message
            )
          );


          // ==================================================
          // MEMORY HISTORY
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
          // BROADCAST
          //
          // history:false
          // ==================================================

          broadcastNewMessage(
            message
          );


          // ==================================================
          // GAS
          //
          // WebSocket配信はGAS保存完了を待たせない。
          // ==================================================

          saveMessageToGAS(
            message
          )
          .catch(
            function (
              error
            ) {

              console.error(
                "[GAS POST] Unexpected:",
                error
              );
            }
          );


        } catch (
          error
        ) {

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
      function (
        error
      ) {

        console.error(
          "[WS] ERROR:",
          error
        );
      }
    );
  }
);
