'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '/config/.env') });

const line = require('@line/bot-sdk');
const express = require('express');
const axios = require('axios');
const qs = require('qs'); // 重要：imgbb 需要用 x-www-form-urlencoded

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const imgbbKey = process.env.IMGBB_API_KEY;

const client = new line.Client(config);
const app = express();

// webhook endpoint
app.post('/callback', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('LINE Callback 錯誤：', err);
      res.status(500).end();
    });
});

// 簡單測試
app.get('/', (req, res) => {
  res.json('ok');
});

// 處理事件
function handleEvent(event) {
  if (
    event.replyToken === '00000000000000000000000000000000' ||
    event.replyToken === 'ffffffffffffffffffffffffffffffff'
  ) {
    return Promise.resolve(null);
  }

  if (event.type === 'message' && event.message.type === 'image') {
    if (event.message.contentProvider.type === 'line') {
      return client.getMessageContent(event.message.id).then((stream) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', async () => {
          const base64 = Buffer.concat(chunks).toString('base64');
          console.log('圖片 base64 長度:', base64.length);

          try {
            const uploadUrl = `https://api.imgbb.com/1/upload?key=${imgbbKey}`;
            const body = qs.stringify({
              image: base64,
            });

            const response = await axios.post(uploadUrl, body, {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            });

            const link = response.data.data.url;
            console.log('✅ 上傳成功：', link);

            const replyMsg = { type: 'text', text: link };
            return client.replyMessage(event.replyToken, replyMsg);
          } catch (err) {
            console.error('❌ 上傳失敗:', err.response?.data || err.message);
            const failMsg = {
              type: 'text',
              text: 'Send to imgbb Fail.',
            };
            return client.replyMessage(event.replyToken, failMsg);
          }
        });
      });
    }
  }

  return Promise.resolve(null);
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 listening on ${port}`);
});
