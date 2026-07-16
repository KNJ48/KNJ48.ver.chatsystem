// chatserver.js (Render用・Googleスプレッドシート永久保存・真の完成版)
const express = require('express');
const { WebSocketServer } = require('ws');

const app = express();
const port = process.env.PORT || 3000;

// 💡 あなたの本物のスプレッドシートIDと、共有していただいた本物のGASのウェブアプリURLを完全に焼き付け！
const SPREADSHEET_ID = '1SWn4ibOxdjZlGj-iefxHwvEOH0eS4Q9FCN_s7R-jg7I'; 
const GAS_DEPLOY_URL = 'https://script.google.com/macros/s/AKfycbz21K8Je-hOVyg6kJ0xcEJtFKvV23gEVTveX3qWwl5JQXlG9vQsvRqmVgbAPqxDcrXDAQ/exec'; 

// 通常アクセス時は本家画面を返す
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8"><title>カスタムゲームチャット Pro</title>
        <style>
            body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; font-family: sans-serif; background-color: #111; color: #fff; }
            #game-area { width: 100%; height: 100%; border: none; position: absolute; top: 0; left: 0; z-index: 1; }
            #top-bar-container { position: absolute; top: 15px; left: 15px; z-index: 10; display: flex; gap: 10px; background: rgba(0,0,0,0.6); padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 10px rgba(0,0,0,0.4); transition: opacity 0.5s ease, transform 0.5s ease; }
            .bar-group { display: flex; gap: 4px; align-items: center; }
            .bar-label { color: #ccc; font-size: 11px; font-weight: bold; }
            #url-input { width: 220px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: #fff; padding: 4px 8px; font-size: 12px; outline: none; }
            #url-btn { background: #2196F3; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px; }
            #name-input { width: 100px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: #ffca28; padding: 4px 8px; font-size: 12px; outline: none; font-weight: bold; }
            #chat-container { position: absolute; right: 30px; bottom: 30px; width: 320px; height: 240px; background: rgba(0, 0, 0, 0.6); border-radius: 6px; display: flex; flex-direction: column; z-index: 20; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5); pointer-events: auto; border: 1px solid rgba(255, 255, 255, 0.1); }
            #messages { flex: 1; overflow-y: auto; padding: 10px; margin: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
            #messages li { color: #fff; font-size: 13px; line-height: 1.4; word-break: break-all; background: rgba(255, 255, 255, 0.08); padding: 6px 10px; border-radius: 4px; }
            #messages li span.sender { font-weight: bold; color: #ffca28; margin-right: 6px; }
            #input-area { display: flex; padding: 8px; background: rgba(0, 0, 0, 0.4); border-bottom-left-radius: 6px; border-bottom-right-radius: 6px; border-top: 1px solid rgba(255, 255, 255, 0.1); }
            #chat-input { flex: 1; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; color: #fff; padding: 6px 10px; font-size: 13px; outline: none; }
            #send-btn { background: #4caf50; color: white; border: none; padding: 6px 14px; margin-left: 8px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px; }
        </style>
    </head>
    <body>
        <div id="top-bar-container">
            <div class="bar-group"><span class="bar-label">URL:</span><input type="text" id="url-input" value="https://example.com"><button id="url-btn">移動</button></div>
            <div class="bar-group" style="margin-left: 5px; border-left: 1px solid rgba(255,255,255,0.2); padding-left: 10px;"><span class="bar-label">NAME:</span><input type="text" id="name-input" value="ゲスト" maxlength="10"></div>
        </div>
        <iframe id="game-area" src="https://example.com"></iframe>
        <div id="chat-container"><ul id="messages"></ul><div id="input-area"><input type="text" id="chat-input" placeholder="[/]キーでチャット開始..." autocomplete="off"><button id="send-btn">送信</button></div></div>
        <script>
            const gameArea = document.getElementById("game-area"); const urlInput = document.getElementById("url-input"); const urlBtn = document.getElementById("url-btn"); const nameInput = document.getElementById("name-input"); const topBar = document.getElementById("top-bar-container");
            function changeUrl() { let url = urlInput.value.trim(); if (url !== "") { if (url.indexOf("http://") !== 0 && url.indexOf("https://") !== 0) { url = "https://" + url; urlInput.value = url; } gameArea.src = url; topBar.style.opacity = "0"; topBar.style.transform = "translateY(-20px)"; setTimeout(() => { topBar.style.display = "none"; }, 500); } }
            urlBtn.addEventListener("click", changeUrl); urlInput.addEventListener("keydown", (e) => { if (e.key === "Enter") changeUrl(); });
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"; const ws = new WebSocket(protocol + "//" + window.location.host); const messages = document.getElementById("messages"); const chatInput = document.getElementById("chat-input"); const sendBtn = document.getElementById("send-btn");
            ws.onmessage = (e) => { const data = JSON.parse(e.data); const li = document.createElement("li"); li.innerHTML = "<span class='sender'>[" + (data.senderId || "ゲスト") + "]</span>" + data.text; messages.appendChild(li); if (messages.children.length > 30) messages.removeChild(messages.firstChild); messages.scrollTop = messages.scrollHeight; };
            function sendMessage() { const text = chatInput.value.trim(); let name = nameInput.value.trim(); if (name === "") name = "ゲスト"; if (text !== "") { ws.send(JSON.stringify({ text: text, name: name })); chatInput.value = ""; } }
            sendBtn.addEventListener("click", sendMessage); chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) sendMessage(); });
            window.addEventListener("keydown", (e) => { if (document.activeElement === chatInput || document.activeElement === urlInput || document.activeElement === nameInput) return; if (e.key === "/") { e.preventDefault(); chatInput.focus(); } });
        </script>
    </body>
    </html>
  `);
});

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const wss = new WebSocketServer({ server });
const chatHistory = [];

wss.on('connection', async (ws) => {
  // 💡 【開通】Renderが起動したド頭で、焼き付けたGAS_DEPLOY_URLから最新30件を自動ロード！
  try {
    if (chatHistory.length === 0) {
      const res = await fetch(`${GAS_DEPLOY_URL}?action=read`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data)) {
          data.forEach(msg => {
            chatHistory.push({ text: msg.text, senderId: msg.sender_id });
          });
        }
      }
    }
  } catch (err) {
    console.error("Googleスプレッドシート初期読み込みエラー:", err);
  }
  
  // 画面にログを高速復元
  for (const msgData of chatHistory) {
    ws.send(JSON.stringify(msgData));
  }

  ws.on('message', async (message) => {
    try {
      const clientData = JSON.parse(message.toString());
      if (clientData.text && clientData.text.trim() !== "") {
        
        const msgData = {
          text: clientData.text,
          senderId: clientData.name || "ゲスト"
        };

        // メモリ配列への保存と画面中継を最優先（超低遅延）で回す
        chatHistory.push(msgData);
        if (chatHistory.length > 30) chatHistory.shift();

        wss.clients.forEach((client) => {
          if (client.readyState === 1) client.send(JSON.stringify(msgData));
        });

        // 💡 【完全合体】チャットが届いた瞬間、焼き付けたURLへ直行してスプレッドシートに保存！
        fetch(GAS_DEPLOY_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'write',
            text: msgData.text,
            sender_id: msgData.senderId
          })
        }).catch(err => console.error("スプレッドシートへの保存に失敗しました:", err));
      }
    } catch (err) {
      console.log("JSON parse error", err);
    }
  });
});
