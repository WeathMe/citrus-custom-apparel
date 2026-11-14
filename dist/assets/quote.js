const form = document.querySelector('#direct-quote');
const status = document.querySelector('#submission-status');
const submit = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submit.disabled) return;
  const artwork = form.elements.Artwork.files[0];
  if (artwork && artwork.size > 5 * 1024 * 1024) {
    status.textContent = 'Please choose artwork under 5 MB.';
    status.focus();
    return;
  }
  submit.disabled = true;
  status.textContent = 'Sending your request…';
  try {
    const response = await fetch(form.action, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(form)
    });
    const result = await response.json();
    if (response.ok && result.ok) {
      form.reset();
      status.textContent = 'Thanks! We received your request and will reply by email.';
    } else {
      status.textContent = result.message || 'Please try again or email hello@citruscustomapparel.com.';
    }
  } catch {
    status.textContent = 'We couldn’t confirm delivery. Please email hello@citruscustomapparel.com if the problem continues.';
  } finally {
    submit.disabled = false;
    status.focus();
  }
});
