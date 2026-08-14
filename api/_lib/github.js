/**
 * Módulo compartilhado de sincronização com GitHub.
 * Usado por chat.js e sync.js para evitar duplicação de lógica.
 */
async function syncToGithub(content) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const path = process.env.GITHUB_PATH || 'elo/registro.md';

  if (!token || !owner || !repo) {
    return { skipped: true };
  }

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;

  let sha = null;
  const getResp = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Elo-App-Backend'
    }
  });
  if (getResp.ok) {
    const d = await getResp.json();
    sha = d.sha;
  }

  const body = {
    message: `Atualiza registro Elo — ${new Date().toISOString()}`,
    content: Buffer.from(content, 'utf-8').toString('base64')
  };
  if (sha) body.sha = sha;

  const putResp = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Elo-App-Backend'
    },
    body: JSON.stringify(body)
  });

  if (!putResp.ok) {
    const err = await putResp.json().catch(() => ({}));
    return { success: false, error: err.message || `HTTP ${putResp.status}` };
  }

  const result = await putResp.json().catch(() => ({}));
  return { success: true, commit: result.commit ? result.commit.sha : null, path };
}

module.exports = { syncToGithub };
