export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract prompt from Gemini-format request body
    const prompt = req.body?.contents?.[0]?.parts?.[0]?.text || '';

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2048,
          temperature: 0.7
        })
      }
    );

    const data = await response.json();

    // Convert Groq response → Gemini format (so frontend needs zero changes)
    const text = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({
      candidates: [{ content: { parts: [{ text }] } }]
    });

  } catch (error) {
    return res.status(500).json({ error: 'Groq request failed' });
  }
}