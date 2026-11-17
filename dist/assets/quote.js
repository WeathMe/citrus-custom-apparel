const form = document.querySelector('#direct-quote');
const status = document.querySelector('#submission-status');
const submit = form.querySelector('button[type="submit"]');


const placements = Array.from(form.querySelectorAll('[name="Print locations"]'));
const otherPlacement = form.querySelector('#other-placement');
function syncPlacements(changed) {
  const unsure = placements[placements.length - 1];
  if (changed === unsure && unsure.checked) placements.slice(0, -1).forEach(input => { input.checked = false; });
  else if (changed && changed.checked) unsure.checked = false;
  const other = placements.find(input => input.value === 'Other placement').checked;
  form.querySelector('#other-placement-field').hidden = !other;
  otherPlacement.disabled = !other;
  otherPlacement.required = other;
  placements[0].setCustomValidity(placements.some(input => input.checked) ? '' : 'Choose a print location or select “Not sure”.');
}
placements.forEach(input => input.addEventListener('change', () => syncPlacements(input)));
form.addEventListener('reset', () => {
  otherPlacement.disabled = true;
  otherPlacement.required = false;
  form.querySelector('#other-placement-field').hidden = true;
  placements[0].setCustomValidity('Choose a print location or select “Not sure”.');
});
syncPlacements();

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
