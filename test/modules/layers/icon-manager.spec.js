/* eslint-disable */
import test from 'tape';
import {gl} from '@deck.gl/test-utils';
import {IconManager} from '@deck.gl/layers';

test('IconManager', t => {
  const data = [
    {
      icon: {
        width: 12,
        height: 12,
        anchorY: 12,
        url: '/icon/0'
      }
    },
    {
      icon: {
        width: 24,
        height: 24,
        anchorY: 24,
        url: '/icon/1'
      }
    },
    {
      icon: {
        width: 36,
        height: 36,
        anchorY: 36,
        url: '/icon/2'
      }
    },
    {
      icon: {
        width: 16,
        height: 16,
        anchorY: 16,
        url: '/icon/3'
      }
    },
    {
      icon: {
        width: 28,
        height: 28,
        anchorY: 28,
        url: '/icon/4'
      }
    },
    {
      icon: {
        width: 48,
        height: 48,
        anchorY: 48,
        url: '/icon/5'
      }
    },
    {
      icon: {
        width: 24,
        height: 24,
        anchorY: 24,
        url: '/icon/6'
      }
    },
    {
      icon: {
        width: 12,
        height: 12,
        anchorY: 12,
        url: '/icon/7'
      }
    }
  ];

  const getIcon = d => d.icon;

  const expected = {
    '/icon/0': Object.assign({}, data[0].icon, {x: 0, y: 0}),
    '/icon/1': Object.assign({}, data[1].icon, {x: 16, y: 0}),
    '/icon/2': Object.assign({}, data[2].icon, {x: 0, y: 28}),
    '/icon/3': Object.assign({}, data[3].icon, {x: 40, y: 28}),
    '/icon/4': Object.assign({}, data[4].icon, {x: 0, y: 68}),
    '/icon/5': Object.assign({}, data[5].icon, {x: 0, y: 100}),
    '/icon/6': Object.assign({}, data[6].icon, {x: 0, y: 152}),
    '/icon/7': Object.assign({}, data[7].icon, {x: 28, y: 152})
  };

  const iconManager = new IconManager(gl, {data, getIcon, maxCanvasWidth: 64});

  t.deepEqual(iconManager.mapping, expected, 'Should generate mapping as expectation.');

  t.end();
});
