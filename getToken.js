const fs = require('fs');
const path = require('path');
const request = require('request');
require('dotenv').config({ path: path.join(__dirname, '/config/.env') });

const clientId = process.env.IMGUR_CLIENT_ID;
const clientSecret = process.env.IMGUR_CLIENT_SECRET;
const pin = process.env.IMGUR_PIN; // 👈 請先在 .env 裡貼上你的 PIN

const options = {
  url: 'https://api.imgur.com/oauth2/token',
  form: {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'pin',
    pin: pin,
  },
};

request.post(options, (error, response, body) => {
  if (!error && response.statusCode === 200) {
    const data = JSON.parse(body);
    console.log('✅ Access Token:', data.access_token);
    console.log('🔁 Refresh Token:', data.refresh_token);

    // 更新 .env
    const envPath = path.join(__dirname, '/config/.env');
    const env = fs.readFileSync(envPath, 'utf-8');
    const newEnv = env
      .replace(/IMGUR_ACCESS_TOKEN=.*/g, `IMGUR_ACCESS_TOKEN=${data.access_token}`)
      .replace(/IMGUR_REFRESH_TOKEN=.*/g, `IMGUR_REFRESH_TOKEN=${data.refresh_token}`);
    fs.writeFileSync(envPath, newEnv, 'utf-8');

    console.log('✅ .env 檔已更新');
  } else {
    console.error('❌ 取得 token 失敗：', error || body);
  }
});
