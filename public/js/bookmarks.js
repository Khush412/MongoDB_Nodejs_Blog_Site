document.addEventListener('DOMContentLoaded', () => {

  // Find all bookmark forms
  document.querySelectorAll('.bookmark-form').forEach(form => {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      e.stopPropagation();

      const btn = this.querySelector('.bookmark-btn');
      const blogCard = this.closest('.card');
      const blogTitle = blogCard ? blogCard.querySelector('.card-title')?.innerText.trim() : 'Blog';
      const url = this.getAttribute('action');

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        const data = await res.json();

        if (data.success) {
          // Toggle icon
          btn.textContent = data.bookmarked ? '🔖' : '📑';

          // Show toast notification if available
          const toastEl = document.getElementById('bookmarkToast');
          const toastBody = document.getElementById('bookmarkToastBody');
          if (toastEl && toastBody) {
            toastBody.textContent = data.bookmarked
              ? `Bookmarked: ${blogTitle}`
              : `Removed bookmark: ${blogTitle}`;
            const toast = bootstrap.Toast.getOrCreateInstance(toastEl);
            toast.show();
          }
        } else {
          console.error('Bookmark failed:', data.message);
        }
      } catch (err) {
        console.error('Error toggling bookmark:', err);
      }
    });
  });

  // Prevent card click when bookmark clicked
  document.querySelectorAll('.bookmark-btn').forEach(btn => {
    btn.addEventListener('click', e => e.stopPropagation());
  });

});
