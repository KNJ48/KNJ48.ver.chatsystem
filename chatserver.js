// server.js (Deno版と100%同じ仕組みで動くNode.js/Expressコード)
const express = require('express');
const { WebSocketServer } = require('ws');

const app = express();
const port = process.env.PORT || 3000;

// 通常のアクセス時はシンプルな案内を返す
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ja">
    <head><meta charset="UTF-8"><title>Chat Server Pro</title></head>
    <body style="background:#111;color:#fff;font-family:sans-serif;text-align:center;padding-top:100px;">
        <h1>Render サーバー稼働中 (knj48 バックアップVer)</h1>
        <p>ブラウザの「チャット召喚」ブックマークを使って、お好きなゲームサイトで召喚してください！</p>
    </body>
    </html>
  `);
});

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// 💡 【美学の完全同期】Deno版と全く同じメモリ保持、同じ中継ロジック
const wss = new WebSocketServer({ server });
const chatHistory = [];

wss.on('connection', (ws) => {
  // ① 繋がった瞬間に、Deno版と全く同じ形のまま過去ログ（最大30件）を送信
  for (const msgData of chatHistory) {
    ws.send(JSON.stringify(msgData));
  }

  ws.on('message', (message) => {
    try {
      // ② 届いたメッセージをDeno版と1ミリも変えずにパース
      const clientData = JSON.parse(message.toString());
      
      const msgData = {
        text: clientData.text || "",
        senderId: clientData.name || "ゲスト", // Deno版と全く同じ名前の紐付け
      };

      // ③ 配列に蓄積（最大30件）
      chatHistory.push(msgData);
      if (chatHistory.length > 30) {
        chatHistory.shift();
      }

      // ④ 繋がっている全員に、Deno版と寸分違わぬJSONデータでブロードキャスト
      wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN = 1
          client.send(JSON.stringify(msgData));
        }
      });
    } catch (err) {
      console.log("JSON parse error", err);
    }
  });
});
