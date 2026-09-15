```javascript
// chatserver.js
// Render用・Googleスプレッドシート永久保存・タイムスタンプ追加版
// 履歴取得デバッグログ追加版

const express = require('express');
const { WebSocketServer } = require('ws');

const app = express();
const port = process.env.PORT || 3000;

// スプレッドシートIDとGASのURL
const SPREADSHEET_ID =
  '1SWn4ibOxdjZlGj-iefxHwvEOH0eS4Q9FCN_s7R-jg7I';

const GAS_DEPLOY_URL =
  'https://script.google.com/macros/s/AKfycbz21K8Je-hOVyg6kJ0xcEJtFKvV23gEVTveX3qWwl5JQXlG9vQsvRqmVgbAPqxDcrXDAQ/exec';


// 通常アクセス時は本家画面を返す
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
                background: rgba(0, 0, 0, 0.6);
                border-radius: 6px;
                display: flex;
                flex-direction: column;
                z-index: 20;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
                pointer-events: auto;
                border: 1px solid rgba(255, 255, 255, 0.1);
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
                background: rgba(255, 255, 255, 0.08);
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
                margin-left: 6px;
            }

            #input-area {
                display: flex;
                padding: 8px;
                background: rgba(0, 0, 0, 0.4);
                border-bottom-left-radius: 6px;
                border-bottom-right-radius: 6px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }

            #chat-input {
                flex: 1;
                background: rgba(255, 255, 255, 0.15);
                border: 1px solid rgba(255, 255, 255, 0.1);
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
                <span class="bar-label">URL:</span>

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


            function changeUrl() {

                let url =
                    urlInput.value.trim();

                if (url !== "") {

                    if (
                        url.indexOf("http://") !== 0 &&
                        url.indexOf("https://") !== 0
                    ) {

                        url = "https://" + url;

                        urlInput.value = url;
                    }


                    gameArea.src = url;


                    topBar.style.opacity = "0";

                    topBar.style.transform =
                        "translateY(-20px)";


                    setTimeout(() => {

                        topBar.style.display =
                            "none";

                    }, 500);
                }
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


            const messages =
                document.getElementById("messages");

            const chatInput =
                document.getElementById("chat-input");

            const sendBtn =
                document.getElementById("send-btn");


            function formatTimestamp(timestamp) {

                if (!timestamp) {
                    return "";
                }


                const date =
                    new Date(timestamp);


                if (isNaN(date.getTime())) {
                    return "";
                }


                return new Intl.DateTimeFormat(
                    "ja-JP",
                    {
                        timeZone: "Asia/Tokyo",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                    }
                ).format(date);
            }


            ws.onmessage = (e) => {

                const data =
                    JSON.parse(e.data);


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


                li.appendChild(sender);


                if (data.timestamp) {

                    const timestamp =
                        document.createElement("span");

                    timestamp.className =
                        "timestamp";


                    timestamp.textContent =
                        formatTimestamp(
                            data.timestamp
                        );


                    li.appendChild(timestamp);
                }


                const text =
                    document.createTextNode(
                        data.text || ""
                    );


                li.appendChild(text);


                messages.appendChild(li);


                if (
                    messages.children.length > 30
                ) {

                    messages.removeChild(
                        messages.firstChild
                    );
                }


                messages.scrollTop =
                    messages.scrollHeight;
            };


            function sendMessage() {

                const text =
                    chatInput.value.trim();


                let name =
                    nameInput.value.trim();


                if (name === "") {
                    name = "ゲスト";
                }


                if (text !== "") {

                    ws.send(
                        JSON.stringify({
                            text: text,
                            name: name
                        })
                    );


                    chatInput.value = "";
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


// ========================================
// HTTPサーバー起動
// ========================================

const server =
    app.listen(
        port,
        () => {
            console.log(
                `Server running on port ${port}`
            );
        }
    );


// ========================================
// WebSocket
// ========================================

const wss =
    new WebSocketServer({
        server
    });


// メモリ上のチャット履歴
const chatHistory = [];


// ========================================
// WebSocket接続
// ========================================

wss.on(
    'connection',
    async (ws) => {

        const historyStartTime =
            Date.now();


        console.log(
            "[HISTORY] ============================="
        );

        console.log(
            "[HISTORY] WebSocket接続開始"
        );

        console.log(
            "[HISTORY] 現在のchatHistory件数:",
            chatHistory.length
        );


        // ====================================
        // 起動時にGASから最新30件を読み込む
        // ====================================

        try {

            if (chatHistory.length === 0) {

                console.log(
                    "[HISTORY] chatHistoryが空"
                );

                console.log(
                    "[HISTORY] GAS fetch開始"
                );


                const fetchStartTime =
                    Date.now();


                const res =
                    await fetch(
                        `${GAS_DEPLOY_URL}?action=read`
                    );


                console.log(
                    "[HISTORY] GAS fetch完了:",
                    Date.now() - fetchStartTime,
                    "ms"
                );


                console.log(
                    "[HISTORY] HTTPステータス:",
                    res.status
                );


                console.log(
                    "[HISTORY] res.ok:",
                    res.ok
                );


                if (res.ok) {

                    console.log(
                        "[HISTORY] res.json()開始"
                    );


                    const jsonStartTime =
                        Date.now();


                    const data =
                        await res.json();


                    console.log(
                        "[HISTORY] res.json()完了:",
                        Date.now() - jsonStartTime,
                        "ms"
                    );


                    console.log(
                        "[HISTORY] 受信データ:",
                        Array.isArray(data)
                            ? `配列 ${data.length}件`
                            : typeof data
                    );


                    if (
                        data &&
                        Array.isArray(data)
                    ) {

                        console.log(
                            "[HISTORY] chatHistoryへの格納開始"
                        );


                        const pushStartTime =
                            Date.now();


                        data.forEach(
                            msg => {

                                chatHistory.push({
                                    text:
                                        msg.text,

                                    senderId:
                                        msg.sender_id,

                                    timestamp:
                                        msg.timestamp ||
                                        null
                                });

                            }
                        );


                        console.log(
                            "[HISTORY] chatHistoryへの格納完了:",
                            Date.now() - pushStartTime,
                            "ms"
                        );


                        console.log(
                            "[HISTORY] 現在のchatHistory件数:",
                            chatHistory.length
                        );

                    }

                } else {

                    console.error(
                        "[HISTORY] GAS HTTPエラー:",
                        res.status
                    );
                }

            } else {

                console.log(
                    "[HISTORY] chatHistoryに既存データあり"
                );

                console.log(
                    "[HISTORY] GAS取得をスキップ"
                );
            }

        } catch (err) {

            console.error(
                "[HISTORY] Googleスプレッドシート初期読み込みエラー:",
                err
            );

        }


        // ====================================
        // 画面にログを高速復元
        // ====================================

        console.log(
            "[HISTORY] ブラウザへの履歴送信開始"
        );


        console.log(
            "[HISTORY] 送信予定件数:",
            chatHistory.length
        );


        const sendStartTime =
            Date.now();


        let sentCount = 0;


        for (
            const msgData of chatHistory
        ) {

            try {

                ws.send(
                    JSON.stringify(msgData)
                );


                sentCount++;

            } catch (err) {

                console.error(
                    "[HISTORY] 履歴送信エラー:",
                    err
                );

                break;
            }
        }


        console.log(
            "[HISTORY] ブラウザへの履歴送信完了:",
            Date.now() - sendStartTime,
            "ms"
        );


        console.log(
            "[HISTORY] 実際の送信件数:",
            sentCount
        );


        console.log(
            "[HISTORY] 接続処理全体:",
            Date.now() - historyStartTime,
            "ms"
        );


        console.log(
            "[HISTORY] ============================="
        );


        // ====================================
        // 新規メッセージ受信
        // ====================================

        ws.on(
            'message',
            async (message) => {

                try {

                    const clientData =
                        JSON.parse(
                            message.toString()
                        );


                    if (
                        clientData.text &&
                        clientData.text.trim() !== ""
                    ) {

                        // サーバー側でタイムスタンプを1回だけ生成
                        const msgData = {

                            text:
                                clientData.text,

                            senderId:
                                clientData.name ||
                                "ゲスト",

                            timestamp:
                                new Date().toISOString()
                        };


                        // メモリ配列への保存
                        chatHistory.push(
                            msgData
                        );


                        if (
                            chatHistory.length > 30
                        ) {

                            chatHistory.shift();
                        }


                        // 全クライアントへ送信
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


                        // ====================================
                        // GASへ保存
                        // ====================================

                        fetch(
                            GAS_DEPLOY_URL,
                            {
                                method: 'POST',

                                headers: {
                                    'Content-Type':
                                        'application/json'
                                },

                                body:
                                    JSON.stringify({

                                        action:
                                            'write',

                                        text:
                                            msgData.text,

                                        sender_id:
                                            msgData.senderId,

                                        timestamp:
                                            msgData.timestamp
                                    })
                            }
                        ).catch(
                            err => {

                                console.error(
                                    "スプレッドシートへの保存に失敗しました:",
                                    err
                                );

                            }
                        );

                    }

                } catch (err) {

                    console.log(
                        "JSON parse error",
                        err
                    );

                }

            }
        );

    }
);
```
