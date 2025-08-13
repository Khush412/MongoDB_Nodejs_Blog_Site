document.addEventListener('DOMContentLoaded', () => {
  const genBtn = document.getElementById('generateSuggestionsBtn');
  const titleInput = document.getElementById('blogTitleInput');
  const suggestionsBox = document.getElementById('suggestionsBox');

  if (genBtn && titleInput && suggestionsBox) {
    genBtn.addEventListener('click', async () => {
      const userInput = titleInput.value.trim();
      if (!userInput) {
        alert('Please enter a title or topic first.');
        return;
      }

      suggestionsBox.textContent = 'Generating suggestions...';

      try {
        const res = await fetch('/api/ai/suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text: userInput })
        });

        const data = await res.json();
        if (data.success) {
          suggestionsBox.textContent = data.suggestions;
        } else {
          suggestionsBox.textContent = 'Failed to get suggestions.';
        }
      } catch (err) {
        console.error('AI suggestion error:', err);
        suggestionsBox.textContent = 'Error communicating with AI service.';
      }
    });
  }
});
