/* global document, navigator */
/* eslint-disable max-params, sort-vars */
const INF = 1e20;

export default class TinySDF {
  constructor({fontSize, buffer, radius, cutoff, fontFamily, fontWeight}) {
    this.fontSize = fontSize || 24;
    this.buffer = buffer === undefined ? 3 : buffer;
    this.cutoff = cutoff || 0.25;
    this.fontFamily = fontFamily || 'sans-serif';
    this.fontWeight = fontWeight || 'normal';
    this.radius = radius || 8;
    this.size = this.fontSize + this.buffer * 2;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = this.size;

    this.ctx = this.canvas.getContext('2d');
    this.ctx.font = `${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = 'black';

    // temporary arrays for the distance transform
    this.gridOuter = new Float64Array(this.size * this.size);
    this.gridInner = new Float64Array(this.size * this.size);
    this.f = new Float64Array(this.size);
    this.d = new Float64Array(this.size);
    this.z = new Float64Array(this.size + 1);
    this.v = new Int16Array(this.size);

    // hack around https://bugzilla.mozilla.org/show_bug.cgi?id=737852
    this.middle = Math.round(
      (this.size / 2) * (navigator.userAgent.indexOf('Gecko/') >= 0 ? 1.2 : 1)
    );
  }

  draw(char) {
    this.ctx.clearRect(0, 0, this.size, this.size);
    this.ctx.fillText(char, this.buffer, this.middle);

    const imgData = this.ctx.getImageData(0, 0, this.size, this.size);
    const alphaChannel = new Uint8ClampedArray(this.size * this.size);

    for (let i = 0; i < this.size * this.size; i++) {
      const a = imgData.data[i * 4 + 3] / 255; // alpha value
      this.gridOuter[i] = a === 1 ? 0 : a === 0 ? Number(INF) : Math.pow(Math.max(0, 0.5 - a), 2);
      this.gridInner[i] = a === 1 ? Number(INF) : a === 0 ? 0 : Math.pow(Math.max(0, a - 0.5), 2);
    }

    edt(this.gridOuter, this.size, this.size, this.f, this.d, this.v, this.z);
    edt(this.gridInner, this.size, this.size, this.f, this.d, this.v, this.z);

    for (let i = 0; i < this.size * this.size; i++) {
      const d = this.gridOuter[i] - this.gridInner[i];
      alphaChannel[i] = Math.max(
        0,
        Math.min(255, Math.round(255 - 255 * (d / this.radius + this.cutoff)))
      );
    }

    return alphaChannel;
  }
}

// 2D Euclidean distance transform by Felzenszwalb & Huttenlocher https://cs.brown.edu/~pff/papers/dt-final.pdf
function edt(data, width, height, f, d, v, z) {
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      f[y] = data[y * width + x];
    }
    edt1d(f, d, v, z, height);
    for (let y = 0; y < height; y++) {
      data[y * width + x] = d[y];
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      f[x] = data[y * width + x];
    }
    edt1d(f, d, v, z, width);
    for (let x = 0; x < width; x++) {
      data[y * width + x] = Math.sqrt(d[x]);
    }
  }
}

// 1D squared distance transform
function edt1d(f, d, v, z, n) {
  v[0] = 0;
  z[0] = -Number(INF);
  z[1] = +Number(INF);

  for (let q = 1, k = 0; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = +Number(INF);
  }

  for (let q = 0, k = 0; q < n; q++) {
    while (z[k + 1] < q) {
      k++;
    }
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}
