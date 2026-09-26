/* Download/email handoff is independent of the scroll demo and reduced motion. */
(function () {
  'use strict';
  // Add an email endpoint when automatic delivery is available.
  // It must validate/rate-limit requests and return { delivered: true }
  // only after accepting delivery. Never put email-service credentials here.
  const DOWNLOAD_URL = 'https://apps.apple.com/us/app/flow-breakdown/id6813535098';
  const EMAIL_ENDPOINT = '';
  const mobile = matchMedia('(hover: none) and (pointer: coarse)');
  const dialog = document.getElementById('download-dialog');
  const form = document.getElementById('download-email-form');
  const email = document.getElementById('download-email');
  const send = document.getElementById('download-send');
  const feedback = document.getElementById('download-feedback');
  const title = document.getElementById('download-title');
  const description = document.getElementById('download-description');
  const links = document.querySelectorAll('[data-download]');
  let trigger;
  let request;

  function updateLinks() {
    links.forEach(function (link) {
      const label = link.querySelector('[data-download-label]');
      const header = link.hasAttribute('data-store-link');
      const icon = link.querySelector('.store-icon');
      if (label) label.textContent = mobile.matches
        ? 'Send it to me'
        : (header ? 'Mac App Store' : 'Download for Mac');
      if (icon) icon.src = mobile.matches ? 'assets/mail-icon.png' : 'assets/app-store-icon.png';
      link.setAttribute('aria-label', mobile.matches
        ? 'Send me a link to Flow Breakdown for Mac'
        : (header ? 'Mac App Store — download Flow Breakdown' : 'Download for Mac — get Flow Breakdown on the Mac App Store'));
      link.href = DOWNLOAD_URL;
    });
  }

  function openEmail(source) {
    trigger = source;
    form.reset();
    form.hidden = false;
    feedback.textContent = '';
    title.textContent = 'Get Flow Breakdown';
    description.textContent = 'It’s a Mac app. Email yourself a link for when you’re back at your desk.';
    send.textContent = EMAIL_ENDPOINT ? 'Send me the link' : 'Open email draft';
    send.disabled = false;
    document.getElementById('download-help').textContent = EMAIL_ENDPOINT
      ? 'One email with the link. No newsletter.'
      : 'Opens your email app with the link ready to send to yourself.';
    dialog.showModal();
    document.documentElement.classList.add('download-dialog-open');
  }

  links.forEach(function (link) {
    link.addEventListener('click', function (event) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      if (mobile.matches) {
        event.preventDefault();
        openEmail(link);
      }
    });
  });
  const exampleLink = document.getElementById('ctafig');
  if (exampleLink) exampleLink.addEventListener('click', function (event) {
    if (!mobile.matches) return;
    event.preventDefault();
    openEmail(exampleLink);
  });
  dialog.querySelector('.download-close').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (event) {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', function () {
    if (request) request.abort();
    document.documentElement.classList.remove('download-dialog-open');
    if (trigger) trigger.focus({ preventScroll: true });
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (send.disabled || !form.reportValidity()) return;
    feedback.textContent = '';
    const recipient = email.value.trim();
    if (!EMAIL_ENDPOINT) {
      const body = 'Open this on your Mac to get Flow Breakdown:\n\n' + DOWNLOAD_URL + '\n\nRequires macOS 14 or later. Automatic voice notes require macOS 26 and supported speech recognition; key points and feeling suggestions also need Apple Intelligence.';
      window.location.href = 'mailto:' + encodeURIComponent(recipient) + '?subject=' + encodeURIComponent('Flow Breakdown for your Mac') + '&body=' + encodeURIComponent(body);
      feedback.textContent = 'Send the draft from your email app. If it didn’t open, check that an email app is set up on this device.';
      return;
    }
    const controller = new AbortController();
    request = controller;
    const timeout = setTimeout(function () { controller.abort(); }, 15000);
    send.disabled = true;
    send.textContent = 'Sending…';
    try {
      const response = await fetch(EMAIL_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recipient }), signal: controller.signal
      });
      if (!response.ok || (await response.json()).delivered !== true) throw new Error('Delivery not confirmed');
      if (controller.signal.aborted || request !== controller || !dialog.open) return;
      form.hidden = true;
      title.textContent = 'Check your inbox.';
      description.textContent = 'Your link is ready for when you’re back on your Mac.';
      feedback.textContent = 'Sent to ' + recipient;
    } catch (error) {
      if (dialog.open && request === controller) feedback.textContent = 'The email couldn’t be sent. Please try again.';
    } finally {
      clearTimeout(timeout);
      if (request === controller) {
        send.disabled = false;
        send.textContent = 'Send me the link';
        request = null;
      }
    }
  });
  mobile.addEventListener('change', updateLinks);
  updateLinks();
})();
