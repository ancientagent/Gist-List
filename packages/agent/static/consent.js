const domainEl = document.getElementById('domain');
const urlEl = document.getElementById('url');
const actionsEl = document.getElementById('actions');
const allowBtn = document.getElementById('allow');
const cancelBtn = document.getElementById('cancel');

let currentSessionId = null;

const actionLabels = {
  open: 'Open a page',
  fill: 'Fill form fields',
  upload: 'Upload images',
  click: 'Submit buttons',
};

function render(session) {
  currentSessionId = session.id;
  domainEl.textContent = session.domain;
  urlEl.textContent = session.url;
  actionsEl.innerHTML = '';
  for (const action of session.actions) {
    const li = document.createElement('li');
    li.textContent = actionLabels[action] || action;
    actionsEl.appendChild(li);
  }
}

allowBtn.addEventListener('click', () => {
  if (!currentSessionId) return;
  window.gisterAgent.submitConsent({ sessionId: currentSessionId, allow: true });
});

cancelBtn.addEventListener('click', () => {
  if (!currentSessionId) return;
  window.gisterAgent.submitConsent({ sessionId: currentSessionId, allow: false });
});

window.gisterAgent.onSession(render);
