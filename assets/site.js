// Envoi du formulaire de contact via Web3Forms sans quitter la page.
(function () {
  var form = document.querySelector('.contact-form');
  if (!form || !window.fetch || !window.FormData) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var status = form.querySelector('.form-status');
    var button = form.querySelector('button[type="submit"]');
    var label = button.textContent;
    button.disabled = true;
    button.textContent = form.dataset.sending;
    status.textContent = '';
    status.className = 'form-status';

    fetch(form.action, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(form)
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success) throw new Error(data.message);
        status.textContent = form.dataset.success;
        status.className = 'form-status ok';
        form.reset();
      })
      .catch(function () {
        status.textContent = form.dataset.error;
        status.className = 'form-status err';
      })
      .then(function () {
        button.disabled = false;
        button.textContent = label;
      });
  });
})();
