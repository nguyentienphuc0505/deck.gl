/* eslint-disable */
import GL from 'luma.gl/constants';
import {Texture2D, loadImages} from 'luma.gl';

const MAX_CANVAS_WIDTH = 1024;
const MAX_CANVAS_HEIGHT = 768;

const DEFAULT_TEXTURE_MIN_FILTER = GL.LINEAR_MIPMAP_LINEAR;
// GL.LINEAR is the default value but explicitly set it here
const DEFAULT_TEXTURE_MAG_FILTER = GL.LINEAR;

const noop = () => {};

function nextPowOfTwo(number) {
  return Math.pow(2, Math.ceil(Math.log2(number)));
}

// traverse icons in a row of icon atlas
// extend each icon with left-top coordinates
function buildRowMapping(mapping, columns, yOffset) {
  for (let i = 0; i < columns.length; i++) {
    const {icon, xOffset} = columns[i];
    mapping[icon.url] = Object.assign({}, icon, {
      x: xOffset,
      y: yOffset
    });
  }
}

/**
 * Generate coordinate mapping to retrieve icon left-top position from an icon atlas
 * @param icons {Array<Object>} list of icons, each icon requires url, width, height
 * @param maxCanvasWidth {Number}
 * @param maxCanvasHeight {Number}
 * @returns {{mapping: {'/icon/1': {url, width, height, ...}},, canvasHeight: {Number}}}
 */
function buildMapping({icons, maxCanvasWidth, maxCanvasHeight}) {
  // x position till current column
  let xOffset = 0;
  // y position till current row
  let yOffset = 0;
  // height of current row
  let rowHeight = 0;

  let columns = [];
  const mapping = {};

  // Traverse the icons one by one
  // Calculate the left-top coordinates of each icon in row by row
  // row width is equal to maxCanvasWidth
  // row height is decided by the max height of the icons in that row
  for (let i = 0; i < icons.length; i++) {
    const icon = icons[i];
    if (!mapping[icon.url]) {
      const {height, width} = icon;

      // fill one row
      if (xOffset + width > maxCanvasWidth) {
        if (rowHeight + yOffset > maxCanvasHeight) {
          // TODO
        }

        buildRowMapping(mapping, columns, yOffset);

        xOffset = 0;
        yOffset = rowHeight + yOffset;
        rowHeight = 0;
        columns = [];
      }

      columns.push({
        icon,
        xOffset
      });

      xOffset = xOffset + width;
      rowHeight = Math.max(rowHeight, height);
    }
  }

  if (columns.length > 0) {
    buildRowMapping(mapping, columns, yOffset);
  }

  const canvasHeight = nextPowOfTwo(rowHeight + yOffset);
  return {
    mapping,
    canvasHeight // yOffset + height of last row
  };
}

export default class IconManager {
  constructor(
    gl,
    {
      data,
      getIcon,
      onTextureUpdate = noop,
      maxCanvasWidth = MAX_CANVAS_WIDTH,
      maxCanvasHeight = MAX_CANVAS_HEIGHT
    }
  ) {
    this.gl = gl;
    this.getIcon = getIcon;
    this.data = data;
    this.onTextureUpdate = onTextureUpdate;
    this.maxCanvasWidth = maxCanvasWidth;
    this.maxCanvasHeight = maxCanvasHeight;

    // extract icons from data
    this._generateTexture();
  }

  needUpdate(nextData) {
    const icons = this._getIcons(this.data) || {};
    const nextIcons = this._getIcons(nextData) || {};
    return Object.keys(nextIcons).every(icon => icons[icon.url]);
  }

  setData(data) {
    if (this.needUpdate(data)) {
      this._generateTexture();
    }
    this.data = data;
  }

  // getters
  get mapping() {
    return this._mapping;
  }

  get texture() {
    return this._texture;
  }

  _getIcons(data) {
    if (!data) {
      return null;
    }

    return data.reduce((resMap, point) => {
      const icon = this.getIcon(point);
      if (!resMap[icon.url]) {
        resMap[icon.url] = icon;
      }
      return resMap;
    }, {});
  }

  _generateTexture() {
    const {data, maxCanvasWidth, maxCanvasHeight} = this;
    if (this.data) {
      // generate icon mapping
      const {mapping, canvasHeight} = buildMapping({
        icons: Object.values(this._getIcons(data)),
        maxCanvasWidth,
        maxCanvasHeight
      });

      this._mapping = mapping;

      // create new texture
      this._texture = new Texture2D(this.gl, {
        width: this.maxCanvasWidth,
        height: canvasHeight
      });

      // load images
      this._loadImages();
    }
  }

  _loadImages() {
    for (let i = 0; i < this.data.length; i++) {
      const icon = this.getIcon(this.data[i]);
      if (icon.url) {
        loadImages({urls: [icon.url]}).then(([data]) => {
          const mapping = this._mapping[icon.url];
          const {x, y, width, height} = mapping;

          // update texture
          this._texture.setSubImageData({
            data,
            x,
            y,
            width,
            height,
            parameters: {
              [GL.TEXTURE_MIN_FILTER]: DEFAULT_TEXTURE_MIN_FILTER,
              [GL.TEXTURE_MAG_FILTER]: DEFAULT_TEXTURE_MAG_FILTER,
              [GL.UNPACK_FLIP_Y_WEBGL]: true
            }
          });
          // Call to regenerate mipmaps after modifying texture(s)
          this._texture.generateMipmap();

          this.onTextureUpdate(this._texture);
        });
      }
    }
  }
}
