const inbox = 'hello@citruscustomapparel.com';
const maxFile = 5 * 1024 * 1024;
const support = 'We couldn’t send your request. Please email ' + inbox + '.';

function reply(status, message, request) {
  if (request.headers.get('Accept') === 'application/json') {
    return Response.json({ ok: status === 200, message }, { status });
  }
  return new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

export async function onRequestPost({ request, env }) {
  const send = (status, message) => reply(status, message, request);
  if (request.headers.get('Origin') !== new URL(request.url).origin) {
    return send(403, 'Please submit the form from the quote page.');
  }
  if (!env.RESEND_API_KEY || !env.QUOTE_FROM_EMAIL) return send(503, support);
  const length = Number(request.headers.get('Content-Length'));
  if (!length || length > maxFile + 65536) return send(413, 'The request is too large. Artwork can be up to 5 MB.');
  let fields;
  try {
    fields = await request.formData();
  } catch {
    return send(400, 'Please submit the quote form again.');
  }
  const value = (name) => String(fields.get(name) || '').trim();
  const name = value('Name');
  const email = value('Email');
  const details = value('Project details');
  const quantity = Number(value('Quantity'));
  if (value('Website')) return send(400, 'Please check the form and try again.');
  if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      !details || details.length > 4000 || !Number.isSafeInteger(quantity) || quantity < 1 ||
      !/^[0-9]{5}$/.test(value('Delivery ZIP')) ||
      !['T-Shirts','Hoodies & Sweatshirts','Hats','Business & Workwear','Mixed / Other'].includes(value('Apparel'))) {
    return send(400, 'Check your name, email, apparel type, quantity, ZIP code, and project details.');
  }

  const artwork = fields.get('Artwork');
  const attachments = [];
  if (artwork instanceof File && artwork.size) {
    if (artwork.size > maxFile) return send(413, 'Please choose artwork up to 5 MB.');
    const bytes = new Uint8Array(await artwork.arrayBuffer());
    const start = Array.from(bytes.subarray(0, 8)).join(',');
    const extension = artwork.name.split('.').pop().toLowerCase();
    const valid = (extension === 'png' && start === '137,80,78,71,13,10,26,10') ||
      (['jpg','jpeg'].includes(extension) && start.startsWith('255,216,255,')) ||
      (extension === 'pdf' && start.startsWith('37,80,68,70,45,'));
    if (!valid) return send(400, 'Choose a valid PNG, JPG, or PDF file.');
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 8192) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    }
    attachments.push({ filename: 'quote-artwork.' + extension, content: btoa(binary) });
  }

  const labels = ['Name','Email','Phone','Business or group','Apparel','Quantity','Preferred deadline','Delivery ZIP','Project details'];
  const text = labels.map((label) => label + ': ' + value(label).slice(0, label === 'Project details' ? 4000 : 254)).join('\n');
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.QUOTE_FROM_EMAIL, to: [inbox], reply_to: email,
        subject: 'New Citrus Custom Apparel quote request', text, attachments }),
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok || !(await response.json()).id) return send(502, support);
    return send(200, 'Thanks! We received your request and will reply by email.');
  } catch {
    return send(502, support);
  }
}
