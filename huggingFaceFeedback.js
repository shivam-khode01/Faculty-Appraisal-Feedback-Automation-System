const axios = require('axios');
const dedent = require('dedent');
const GROQ_API_KEY = process.env.GROQ_API_KEY;

function cleanFeedback(text) {
  const unwantedMarker = 'Some additional guidelines:';
  let cleanedText = text;
  const index = cleanedText.indexOf(unwantedMarker);
  if (index !== -1) {
    cleanedText = cleanedText.slice(0, index).trim();
  }
  cleanedText = cleanedText.replace(/\[Your Name\]\s*$/i, '').trim();
  return cleanedText;
}

async function generateFeedback(prompt, teacherName) {
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama3-70b-8192',
        messages: [
          { role: 'system', content: 'You are an academic performance feedback generator for faculty.' },
          { role: 'user', content: prompt }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const message = response.data.choices?.[0]?.message?.content || '';
    const normalizedTeacherName = teacherName.trim();
    const startPhrase = `Dear ${normalizedTeacherName},`;
    const match = message.match(new RegExp(startPhrase, 'i'));

    let feedback = match ? message.substring(match.index).trim() : message;
    return cleanFeedback(feedback);
  } catch (err) {
    console.error('GROQ API error:', err.response?.data || err.message);
    return `❌ Error from GROQ: ${err.message}`;
  }
}

module.exports = { generateFeedback, dedent };
