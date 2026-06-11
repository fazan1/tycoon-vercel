// api/trade-search.js
// Standalone endpoint for the Lanka Trade Finder deep web search.
// Does NOT touch your existing chat.js. Reads the Anthropic key from env.

export default async function handler(req, res) {
  // --- CORS: allow the trade finder (any origin) to call this ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight request from the browser
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Vercel may give req.body as object or string
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    const prompt = (body && body.prompt) ? body.prompt : '';
    if (!prompt) {
      res.status(400).json({ error: 'Missing prompt' });
      return;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Server missing ANTHROPIC_API_KEY' });
      return;
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
      })
    });

    const data = await anthropicRes.json();

    // Pull the text out of the content blocks
    let text = '';
    if (Array.isArray(data.content)) {
      text = data.content.map(b => (b && b.text) ? b.text : '').join('\n');
    }
    res.status(200).json({ text: text, raw: data });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
