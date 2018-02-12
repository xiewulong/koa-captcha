/*!
 * App
 * xiewulong <xiewulong@vip.qq.com>
 * create: 2018/02/11
 * since: 0.0.1
 */
'use strict';

const Koa = require('koa');
const bodyparser = require('koa-bodyparser');
const session = require('koa-session');
const captcha = require('../');

const app = module.exports = new Koa();
const development = app.env === 'development';
const production = app.env === 'production';

app.keys = ['APP COOKIE SECRET KEY'];
app
  .use(session(app))
  .use(bodyparser())
  .use(captcha({
    // background: '#fff',       // Background color, default: white
    // background_image: false,  // Background image, default: false
    // case_sensitivity: false,  // Case sensitivity, default: false
    // char_pool: '0123456789',  // Char pool, default: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    // char_length: 6,           // Char length, default: 6
    // color: '#000',            // Color, default: black
    // font: 'Arial',            // Font family, default arial
    // font_size: '30px',        // Font size, default: 30px
    // height: 60,               // Height, default: 60
    // prefix: 'captcha_',       // Session key prefix, default: `captcha_${key}`
    // rotate: 30,               // Rotation amplitude, default: 30, then the angle range is -30 to 30
    // timeout_in: 60 * 1000,    // Timeout, default: 1 minute
    // type: 'character',        // Captcha type, default: random character
    // width: 160,               // Width, default: 160
  }))
  .use(async(ctx, next) => {
    if(ctx.path == '/captcha') {
      ctx.type = ctx.captcha.type;
      ctx.body = ctx.captcha.refresh('test', 5 * 60 * 1000);
      return;
    } else if(ctx.path == '/captcha/verify' && ctx.method == 'POST') {
      ctx.body = ctx.captcha.verify('test', ctx.request.body.code);
      return;
    }

    ctx.type = 'html';
    ctx.body = `
      <form action="/captcha/verify" method="post">
        <input type="text" name="code" />
        <img src="/captcha" />
        <button type="submit">Verify</button>
      </form>
    `;
  })
  ;

!module.parent && app.listen(3000);
