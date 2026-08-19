'use strict';
/* ---------------- Asking for something ----------------
   A <dialog> rather than window.prompt/confirm, and not for taste: a page
   served inside a sandboxed frame is refused the native ones outright, so every
   feature built on prompt() — adding a link, naming an arrival point, making up
   an object — silently did nothing anywhere but a local tab. This works
   everywhere the editor does.

   It also asks better. prompt() takes one string at a time, so adding a way out
   was three questions in a row with no way back if you got the second one
   wrong; this is one form with all three on it, a real <select> where the
   answer is one of a known set, and Escape to abandon the lot. */

const Ask = {
  el: null, resolve: null,

  init() {
    this.el = document.createElement('dialog');
    this.el.id = 'edAsk';
    document.body.appendChild(this.el);
    /* Escape closes a <dialog> by itself; make that a cancel rather than a
       resolve-with-whatever-was-typed. */
    this.el.addEventListener('cancel', () => this.done(null));
    this.el.addEventListener('close', () => this.done(null));
  },

  done(v) {
    const r = this.resolve;
    this.resolve = null;
    if (r) r(v);
  },
  close() {
    if (this.el.open) this.el.close();
  },

  /* fields: [{ k, label, value, hint, options }]. `options` makes it a select,
     which is the whole reason "which level does this go to" stops being a
     spelling test. Resolves with { k: value } or null if cancelled. */
  form(title, fields, okLabel) {
    return new Promise(resolve => {
      this.close();
      this.resolve = resolve;
      this.el.innerHTML = '<form method="dialog"><h3>' + esc(title) + '</h3>'
        + fields.map(f => '<label class="frow"><span>' + esc(f.label) + '</span><span>'
          + (f.options
            ? '<select data-k="' + esc(f.k) + '">' + f.options.map(o =>
              '<option value="' + esc(o) + '"' + (o === f.value ? ' selected' : '') + '>'
              + esc(o) + '</option>').join('') + '</select>'
            : '<input data-k="' + esc(f.k) + '" value="' + esc(f.value == null ? '' : f.value) + '"'
              + (f.hint ? ' placeholder="' + esc(f.hint) + '"' : '') + '>')
          + '</span></label>').join('')
        + '<div class="btns"><button value="ok">' + esc(okLabel || 'OK') + '</button>'
        + '<button value="cancel" class="ghost">Cancel</button></div></form>';

      const form = this.el.querySelector('form');
      form.addEventListener('submit', e => {
        /* The submitter tells you which button; a form submitted with Enter has
           none, and Enter means OK. */
        if (e.submitter && e.submitter.value === 'cancel') return;
        const out = {};
        this.el.querySelectorAll('[data-k]').forEach(i => out[i.dataset.k] = i.value.trim());
        e.preventDefault();
        this.el.close();
        this.done(out);
      });
      this.el.showModal();
      const first = this.el.querySelector('input,select');
      if (first) { first.focus(); if (first.select) first.select(); }
    });
  },

  /* A question with a real verb on the button. "Continue" tells you nothing
     about what is about to happen to your afternoon's work. */
  confirm(title, body, okLabel) {
    return new Promise(resolve => {
      this.close();
      this.resolve = resolve;
      this.el.innerHTML = '<form method="dialog"><h3>' + esc(title) + '</h3>'
        + '<p>' + esc(body) + '</p>'
        + '<div class="btns"><button value="ok" class="warn">' + esc(okLabel || 'Yes') + '</button>'
        + '<button value="cancel" class="ghost">Cancel</button></div></form>';
      this.el.querySelector('form').addEventListener('submit', e => {
        if (e.submitter && e.submitter.value === 'cancel') return;
        e.preventDefault();
        this.el.close();
        this.done(true);
      });
      this.el.showModal();
      this.el.querySelector('button').focus();
    });
  }
};
