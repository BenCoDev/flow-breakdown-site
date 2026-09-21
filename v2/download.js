/* Download/email handoff is independent of the scroll demo and reduced motion. */
(function () {
  'use strict';
  // Set these when the release and an email delivery endpoint are available.
  // The endpoint must validate/rate-limit requests and return { delivered: true }
  // only after accepting delivery. Never put email-service credentials here.
  const DOWNLOAD_URL = ''; // Set the real release URL when the installer is available.
  const EMAIL_ENDPOINT = '';
  const PAGE_URL = 'https://bencodev.github.io/flow-breakdown-site/v2/';
  const mobile = matchMedia('(max-width: 1023px) and (hover: none) and (pointer: coarse)');
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
      if (link.hasAttribute('data-store-badge')) {
        link.setAttribute('aria-label', mobile.matches
          ? 'Send yourself a Mac App Store link'
          : 'Download Flow Breakdown on the Mac App Store');
      } else {
        link.textContent = mobile.matches ? 'Send it to me' : 'Get it on the Mac App Store';
      }
      link.href = DOWNLOAD_URL || '#download';
    });
  }

  function openEmail(source, unavailable) {
    trigger = source;
    form.reset();
    form.hidden = false;
    feedback.textContent = '';
    title.textContent = unavailable ? 'the download link is coming.' : 'a little reminder for your Mac.';
    description.textContent = unavailable
      ? 'The download isn’t available on this page yet. Send yourself the page to come back later.'
      : 'Flow Breakdown is a Mac app. Email yourself a link to open when you’re back at your desk.';
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
      if (mobile.matches || !DOWNLOAD_URL) {
        event.preventDefault();
        openEmail(link, !mobile.matches && !DOWNLOAD_URL);
      }
    });
  });
  document.querySelectorAll('[data-email-link]').forEach(function (button) {
    button.addEventListener('click', function () {
      openEmail(mobile.matches ? document.getElementById('ctafig') : button, false);
    });
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
      const body = 'Open this on your Mac to get Flow Breakdown:\n\n' + (DOWNLOAD_URL || PAGE_URL) + '\n\nRequires macOS 26 or later.';
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
      title.textContent = 'check your inbox.';
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
