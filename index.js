/*!
 * Koa captcha
 * xiewulong <xiewulong@vip.qq.com>
 * create: 2018/02/11
 * since: 0.0.1
 */
'use strict';

const fs = require('fs');
const path = require('path');
const Canvas = require('canvas');

const DEFAULT_OPTIONS = {
  background: '#fff',       // Background color, default: white
  background_image: null,   // Background image, default: null
  case_sensitivity: false,  // Case sensitivity, default: false
  char_pool: '0123456789',  // Char pool, like: abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789, default: 0123456789
  char_length: 6,           // Char length, default: 6
  color: '#000',            // Color, String or Array, default: black
  font_family: 'SpicyRice', // Font family, default SpicyRice
  font_size: '30px',        // Font size, default: 30px
  font_style: 'normal',     // Font style, default: normal
  font_weight: 'normal',    // Font weight, default: normal
  fonts: {},                // Custom font files path
  height: 60,               // Height, default: 60
  prefix: 'captcha_',       // Session key prefix, default: `captcha_${key}`
  rotate: 30,               // Rotation amplitude, default: 30, then the angle range is -30 to 30
  timeout_in: 60 * 1000,    // Timeout, default: 1 minute
  type: 'character',        // Captcha type, default: random character
  width: 160,               // Width, default: 160
};

const ACTIVE_TYPES = ['character'];

Canvas.registerFont(path.join(__dirname, 'fonts', 'SpicyRice.ttf'), {
  family: DEFAULT_OPTIONS.font_family,
  style: DEFAULT_OPTIONS.font_style,
  weight: DEFAULT_OPTIONS.font_weight,
});

class Captcha {

  constructor(ctx, options = {}) {
    if(!ctx || !ctx.session) {
      this.error = 'Koa app context and session is required';
    }

    this.ctx = ctx;
    this.options = Object.assign({}, DEFAULT_OPTIONS, options);

    if(ACTIVE_TYPES.indexOf(this.options.type) < 0) {
      this.error = 'Invalid captcha type';
    }

    if(typeof this.options.color == 'string') {
      this.options.color = [this.options.color];
    }

    this.register_fonts();
  }

  verify(key, code) {
    if(this.error || !key || !code) {
      return false;
    }

    let key_session = this.ctx.session[`${this.options.prefix}${key}`];
    if(!key_session || !key_session.code || !key_session.expired_at) {
      return false;
    }

    let _code = key_session.code;
    if(!this.options.case_sensitivity) {
      code = code.toLowerCase();
      _code = _code.toLowerCase();
    }

    return (+ new Date()) < key_session.expired_at && code == _code;
  }

  refresh(key, timeout_in = this.options.timeout_in) {
    if(this.error) {
      return {error: true, message: this.error};
    }
    if(!key) {
      return {error: true, message: 'Session key is required'};
    }

    this[`generate_${this.options.type}`]();
    this.ctx.session[`${this.options.prefix}${key}`] = {code: this.code, expired_at: (+ new Date()) + timeout_in};
    return this[`draw_${this.options.type}`]();
  }

  get type() {
    if(!this._type) {
      switch(this.options.type) {
        case 'character':
        default:
          this._type = 'png';
      }
    }

    return this._type;
  }

  register_fonts() {
    let files = Object.keys(this.options.fonts);
    let len = files.length;
    if(!len) {
      return;
    }

    for(let file, i = 0; i < len; i++) {
      file = files[i];
      Canvas.registerFont(file, this.options.fonts[file]);
    }
  }

  draw_character() {
    let canvas = new Canvas.createCanvas(this.options.width, this.options.height);
    let c = canvas.getContext('2d');

    if(this.options.background_image) {
      let image = new Canvas.Image;
      image.src = fs.readFileSync(this.options.background_image);
      c.drawImage(image, Math.random() * (image.width - canvas.width) + (canvas.width - image.width), Math.random() * (image.height - canvas.height) + (canvas.height - image.height));
    }

    c.font = `${this.options.font_style} ${this.options.font_weight} ${this.options.font_size} ${this.options.font_family}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';

    if(this.options.color.length == 1) {
      c.fillStyle = this.options.color[0];
    }

    let left = Math.random() * canvas.width * .1 + canvas.width * .2;
    for(let angle, char, color, mt, colors = [], i = 0, len = this.code.length; i < len; i++) {
      char = this.code[i];
      angle = (Math.random() * this.options.rotate * 2 - this.options.rotate) * Math.PI / 180;

      c.save();
      if(this.options.color.length > 1) {
        if(!colors.length) {
          colors = [].concat(this.options.color);
        }
        c.fillStyle = colors.splice(colors.length == 1 ? 0 : Math.floor(Math.random() * colors.length), 1)[0];
      }
      c.transform(Math.cos(angle), Math.sin(angle), - Math.sin(angle), Math.cos(angle), left -= Math.random() * 2, canvas.height / 2);
      c.fillText(char, 0, 0);
      c.restore();

      mt = c.measureText(char);
      left += mt.width;
    }

    c.save();

    return canvas.toBuffer();
  }

  generate_character() {
    let chars = [];
    for(let i = 0; i < this.options.char_length; i++) {
      chars.push(this.options.char_pool[Math.floor(Math.random() * this.options.char_pool.length)]);
    }

    this.code = chars.join('');
  }

}

module.exports = (options = {}) => {
  return async (ctx, next) => {
    let captcha = new Captcha(ctx, options);

    Object.defineProperties(ctx, {
      captcha: {
        configurable: true,
        enumerable: true,
        get() {
          return captcha;
        },
      },
    });

    await next();
  };
};
