const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

router.post('/ai/chat', async (req, res) => {
  try {
    const { messages } = req.body; // Expect array of chat messages [{role: 'user|system|bot', content: 'text'}, ...]

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'Messages array required' });
    }

    // Construct request for Gemini API (adjust per official docs)
    const requestBody = {
      contents: messages.map(msg => ({
        parts: [{ text: msg.content }]
      })),
      // Optional generation config like temperature, maxOutputTokens etc.
    };

    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY,
        }
      }
    );

    // Extract response text
    const aiResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, no response from AI';

    res.json({ success: true, message: aiResponse });

  } catch (error) {
    console.error('AI chat error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Failed to get AI response' });
  }
});

module.exports = router;
