/* global fetch */
import TEST_CASES from './test-cases';
import * as Layers from '@deck.gl/layers';

export default self => {
  self.onmessage = evt => {
    const testCase = TEST_CASES[evt.data.id];

    fetchJSON(testCase.data).then(data => {
      const LayerType = Layers[testCase.type] || Layers[`_${testCase.type}`];
      const {props, transferList} = getLayerSnapshot(new LayerType({...testCase, data}));
      self.postMessage(props, transferList);
    });
  };
};

function fetchJSON(url) {
  return fetch(url).then(resp => resp.json());
}

function getLayerSnapshot(layer) {
  // Initialize the layer
  layer.context = {};
  layer._initialize();

  // Extract generated attributes - should move to AttributeManager
  const {attributeManager} = layer.state;
  const {attributes} = attributeManager;
  const props = {};
  const transferList = [];

  for (const attributeName in attributes) {
    const attribute = attributes[attributeName];

    if (!attribute.constant && ArrayBuffer.isView(attribute.value)) {
      props[attributeName] = attribute.value;
      transferList.push(attribute.value.buffer);
    }
  }

  for (const propName in layer.props) {
    if (
      Object.hasOwnProperty.call(layer.props, propName) &&
      propName !== 'type' &&
      propName !== 'data' &&
      typeof layer.props[propName] !== 'function'
    ) {
      props[propName] = layer.props[propName];
    }
  }

  props.type = layer.constructor.name;
  props.numInstances = layer.getNumInstances();
  if ('vertexCount' in layer.state) {
    props.vertexCount = layer.state.vertexCount;
  }

  // Release resources
  layer._finalize();

  return {props, transferList};
}
