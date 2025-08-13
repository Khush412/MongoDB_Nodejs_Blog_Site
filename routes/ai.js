const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

router.post('/ai/suggestions', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, message: 'Input text required' });
    }

    // Build request payload for Gemini API according to official docs
    const requestBody = {
      contents: [
        {
          parts: [
            { text: `Suggest blog topic ideas or outlines based on this: ${text}` }
          ]
        }
      ],
      // You can customize generationConfig if needed, e.g. temperature
      // generationConfig: { temperature: 0.7, maxOutputTokens: 150 }
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

    // Extract AI-generated text from the response structure
    const suggestions = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No suggestions found';

    return res.json({ success: true, suggestions });

  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message || error);
    return res.status(500).json({ success: false, message: 'Failed to get suggestions from AI' });
  }
});

module.exports = router;
