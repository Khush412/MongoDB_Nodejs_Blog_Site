document.addEventListener('DOMContentLoaded', () => {
  const likeForms = document.querySelectorAll('.like-form');
  if (likeForms.length) {
    likeForms.forEach(form => {
      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopPropagation();

        const btn = this.querySelector('.like-btn');
        const url = this.getAttribute('action');

        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
          });
          const data = await res.json();

          if (data.success) {
            btn.innerHTML = (data.liked ? '❤️' : '🤍') + ` <span>${data.likesCount}</span>`;
          }
        } catch (err) {
          console.error('Like request failed', err);
        }
      });
    });
  }

  // Prevent bookmark/like clicks from opening the card
  const actionBtns = document.querySelectorAll('.like-btn, .bookmark-btn');
  if (actionBtns.length) {
    actionBtns.forEach(btn => {
      btn.addEventListener('click', e => e.stopPropagation());
    });
  }
});
