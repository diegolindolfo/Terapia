module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const path = process.env.GITHUB_PATH || 'elo/registro.md';

  // Sem variáveis configuradas, não é erro — significa que o backup automático
  // está desligado. O chat continua funcionando normalmente sem isso.
  if (!token || !owner || !repo) {
    res.status(200).json({
      skipped: true,
      reason: 'Backup no GitHub não configurado. Defina GITHUB_TOKEN, GITHUB_OWNER e GITHUB_REPO nas variáveis de ambiente da Vercel.'
    });
    return;
  }

  const { content } = req.body || {};
  if (!content) {
    res.status(400).json({ error: 'content é obrigatório' });
    return;
  }

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;

  try {
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
      res.status(502).json({ error: err.message || `HTTP ${putResp.status}` });
      return;
    }

    const result = await putResp.json().catch(() => ({}));
    res.status(200).json({ ok: true, commit: result.commit ? result.commit.sha : null });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};
