// server.js (Render用・Node.js/Express+ws)
const express = require('express');
const { WebSocketServer } = require('ws');

const app = express();
const port = process.env.PORT || 3000;

// 通常のアクセス時はシンプルな案内画面を返す
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ja">
    <head><meta charset="UTF-8"><title>Chat Server Pro</title></head>
    <body style="background:#111;color:#fff;font-family:sans-serif;text-align:center;padding-top:100px;">
        <h1>Render サーバー稼働中 (knj48 Ver)</h1>
        <p>ブラウザの「チャット召喚」ブックマークを使って、お好きなゲームサイトで召喚してください！</p>
    </body>
    </html>
  `);
});

// サーバーの起動
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// WebSocketサーバーの構築
const wss = new WebSocketServer({ server });
const chatHistory = [];

wss.on('connection', (ws) => {
  // 接続してきた人に過去ログ（最大30件）を正確に送る
  for (const msgData of chatHistory) {
    ws.send(JSON.stringify(msgData));
  }

  ws.on('message', (message) => {
    try {
      const clientData = JSON.parse(message.toString());
      
      // 送信されてきたテキストが空じゃない場合のみ処理
      if (clientData.text && clientData.text.trim() !== "") {
        
        // 💡 【バグ完全解決の盾】
        // フロントから「name」で届いても「senderId」で届いても、
        // どちらでも100%確実に名前を救い上げる自動判別ロジックに強化！
        const finalName = clientData.name || clientData.senderId || "ゲスト";

        const msgData = {
          text: clientData.text,
          senderId: finalName
        };

        // 履歴に保管（最大30件）
        chatHistory.push(msgData);
        if (chatHistory.length > 30) {
          chatHistory.shift();
        }

        // 現在繋がっている全員にリアルタイムでブロードキャスト
        wss.clients.forEach((client) => {
          if (client.readyState === 1) { // WebSocket.OPEN = 1
            client.send(JSON.stringify(msgData));
          }
        });
      }
    } catch (err) {
      console.log("JSON parse error", err);
    }
  });
});
