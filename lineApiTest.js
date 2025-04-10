'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '/config/.env') });

const line = require('@line/bot-sdk');
const express = require('express');
const axios = require('axios');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};
const imgurConfig = {
  accessToken: process.env.IMGUR_ACCESS_TOKEN, // ✅ 從 .env 拿 OAuth2 的 Access Token
};

const client = new line.Client(config);
const app = express();

// LINE Webhook
app.post('/callback', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('LINE Callback 錯誤：', err);
      res.status(500).end();
    });
});

app.get('/', (req, res) => {
  res.json('ok');
});

// 處理 LINE 事件
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

          try {
            const res = await axios.post(
              'https://api.imgur.com/3/image',
              {
                image: base64,
                type: 'base64',
              },
              {
                headers: {
                  Authorization: `Bearer ${imgurConfig.accessToken}`,
                },
              }
            );

            const link = res.data.data.link;
            const replyMsg = { type: 'text', text: link };
            return client.replyMessage(event.replyToken, replyMsg);
          } catch (err) {
            console.error('❌ 上傳失敗:', err.response?.data || err.message);
            const failMsg = {
              type: 'text',
              text: 'Send to Imgur Fail.',
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
