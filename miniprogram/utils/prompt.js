const api = require('./api');

function getName(list, id) {
  const item = (list || []).find((option) => option.id === id);
  return item ? item.name : '';
}

function optimizePrompt(scene, text, context) {
  return api.request('/api/v1/prompt/optimize', {
    method: 'POST',
    data: {
      scene,
      text: (text || '').trim(),
      context: context || {}
    }
  });
}

module.exports = {
  getName,
  optimizePrompt
};
