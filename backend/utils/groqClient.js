const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const chatCompletion = async (messages, options = {}) => {
  const response = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages,
    temperature: options.temperature || 0.2,
    max_tokens: options.max_tokens || 2000,
    response_format: { type: 'json_object' },
  });
  return JSON.parse(response.choices[0].message.content);
};

module.exports = { chatCompletion };