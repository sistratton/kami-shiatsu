#!/usr/bin/env node
/*
 * Kami Shiatsu – générateur du site (aucune dépendance).
 * Lit content/*.json et écrit le site statique dans _site/.
 * Usage : node build.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, '_site');

const LANGS = {
  fr: { name: 'Français', short: 'FR', locale: 'fr_FR', prefix: '' },
  en: { name: 'English', short: 'EN', locale: 'en_GB', prefix: '/en' },
  es: { name: 'Español', short: 'ES', locale: 'es_ES', prefix: '/es' },
};
const DEFAULT_LANG = 'fr';

// Adresse de chaque page, par langue.
const PAGES = {
  home: { fr: '/', en: '/', es: '/' },
  shiatsu: { fr: '/shiatsu/', en: '/shiatsu/', es: '/shiatsu/' },
  about: { fr: '/a-propos/', en: '/about/', es: '/sobre-mi/' },
  legal: { fr: '/mentions-legales/', en: '/legal-notice/', es: '/aviso-legal/' },
};

/* ---------- Lecture du contenu ---------- */

function readJson(file) {
  const full = path.join(ROOT, 'content', file);
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (err) {
    console.error('\n✖ Erreur dans le fichier content/' + file + ' :\n  ' + err.message + '\n');
    process.exit(1);
  }
}

const S = readJson('settings.json');
const T = {};
Object.keys(LANGS).forEach(function (l) { T[l] = readJson(l + '.json'); });
const SITE = String(S.siteUrl || '').replace(/\/+$/, '');

/* ---------- Petits utilitaires ---------- */

let lang = DEFAULT_LANG; // langue en cours de génération

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function phoneDisplay() { return lang === 'fr' ? S.phone : S.phoneInternational; }
function telHref() { return 'tel:' + String(S.phoneInternational).replace(/[^\d+]/g, ''); }
function smsHref() { return 'sms:' + String(S.phoneInternational).replace(/[^\d+]/g, ''); }

// Remplace {phone}, {email}… dans les textes.
function fill(s) {
  return String(s == null ? '' : s)
    .replace(/\{phone\}/g, phoneDisplay())
    .replace(/\{email\}/g, S.email)
    .replace(/\{name\}/g, S.practitioner)
    .replace(/\{siret\}/g, S.siret)
    .replace(/\{address\}/g, S.legalAddress);
}
// Texte sur une ligne : **gras** autorisé.
function inline(s) { return esc(fill(s)).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }
// Texte long : une ligne vide = nouveau paragraphe.
function paras(s) {
  return String(s || '').split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean)
    .map(function (p) { return '<p>' + inline(p).replace(/\n/g, '<br>') + '</p>'; }).join('\n');
}
function list(items, cls) {
  return '<ul class="' + (cls || 'leaf-list') + '">' +
    (items || []).map(function (i) { return '<li>' + inline(i) + '</li>'; }).join('') + '</ul>';
}
function pageUrl(l, page) { return LANGS[l].prefix + PAGES[page][l]; }
function abs(p) { return SITE + p; }
function priceNumber(p) { const m = String(p).replace(',', '.').match(/[\d.]+/); return m ? m[0] : undefined; }

/* ---------- Éléments réutilisés ---------- */

const ENSO = '<svg class="enso" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 8c23 0 42 18 42 41 0 24-19 43-43 43C26 92 8 74 8 51 8 33 19 18 35 11" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>';
const ICON_PHONE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2Z" fill="currentColor"/></svg>';
const ICON_SMS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8l-4 4V5a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
const ICON_MAIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v14H3zM3 6l9 7 9-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';

function ctaButtons(t, mainLabel) {
  return '<div class="cta-row">' +
    '<a class="btn btn-primary" href="' + telHref() + '">' + ICON_PHONE + '<span>' + esc(fill(mainLabel || t.common.call)) + '</span></a>' +
    '<a class="btn btn-ghost" href="' + smsHref() + '">' + ICON_SMS + '<span>' + esc(t.common.sms) + '</span></a>' +
    '</div>';
}

function ctaBand(t, question, label) {
  return '<section class="cta-band"><div class="wrap">' +
    '<p class="cta-question">' + inline(question) + '</p>' +
    ctaButtons(t, label) +
    '<p class="cta-small"><a href="' + pageUrl(lang, 'home') + '#contact">' + esc(t.common.writeMe) + '</a> · ' + esc(t.common.freeBooking) + '</p>' +
    '</div></section>';
}

function img(src, alt, w, h, cls, eager) {
  return '<img class="' + (cls || '') + '" src="' + src + '" alt="' + esc(alt) + '" width="' + w + '" height="' + h + '"' +
    (eager ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async">';
}

/* ---------- Gabarit général ---------- */

function layout(opts) {
  const t = T[lang];
  const page = opts.page;
  const canonical = page ? abs(pageUrl(lang, page)) : null;
  const navItems = [
    ['home', pageUrl(lang, 'home'), t.nav.home],
    ['shiatsu', pageUrl(lang, 'shiatsu'), t.nav.shiatsu],
    ['about', pageUrl(lang, 'about'), t.nav.about],
    ['prices', pageUrl(lang, 'home') + '#tarifs', t.nav.prices],
  ];

  let head = '';
  if (page) {
    head += '<link rel="canonical" href="' + canonical + '">\n';
    Object.keys(LANGS).forEach(function (l) {
      head += '<link rel="alternate" hreflang="' + l + '" href="' + abs(pageUrl(l, page)) + '">\n';
    });
    head += '<link rel="alternate" hreflang="x-default" href="' + abs(pageUrl(DEFAULT_LANG, page)) + '">\n';
    head += '<meta property="og:url" content="' + canonical + '">\n';
  } else {
    head += '<meta name="robots" content="noindex">\n';
  }
  Object.keys(LANGS).forEach(function (l) {
    if (l !== lang) head += '<meta property="og:locale:alternate" content="' + LANGS[l].locale + '">\n';
  });
  if (opts.jsonLd) head += '<script type="application/ld+json">' + JSON.stringify(opts.jsonLd).replace(/</g, '\\u003c') + '</script>\n';
  if (opts.preload) head += '<link rel="preload" as="image" href="' + opts.preload + '" fetchpriority="high">\n';

  const langSwitch = Object.keys(LANGS).map(function (l) {
    const href = page ? pageUrl(l, page) : pageUrl(l, 'home');
    const current = l === lang ? ' aria-current="true"' : '';
    return '<li><a href="' + href + '" hreflang="' + l + '" lang="' + l + '" title="' + LANGS[l].name + '"' + current + '>' + LANGS[l].short + '</a></li>';
  }).join('');

  return '<!doctype html>\n<html lang="' + lang + '">\n<head>\n' +
    '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>' + esc(fill(opts.title)) + '</title>\n' +
    '<meta name="description" content="' + esc(fill(opts.description)) + '">\n' +
    head +
    '<meta property="og:type" content="website">\n' +
    '<meta property="og:site_name" content="' + esc(S.businessName) + '">\n' +
    '<meta property="og:title" content="' + esc(fill(opts.title)) + '">\n' +
    '<meta property="og:description" content="' + esc(fill(opts.description)) + '">\n' +
    '<meta property="og:image" content="' + abs('/assets/img/og-image.jpg') + '">\n' +
    '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n' +
    '<meta property="og:locale" content="' + LANGS[lang].locale + '">\n' +
    '<meta name="twitter:card" content="summary_large_image">\n' +
    '<meta name="theme-color" content="#2f5d3a">\n' +
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n' +
    '<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">\n' +
    '<link rel="stylesheet" href="/assets/style.css?v=' + BUILD_ID + '">\n' +
    '</head>\n<body class="page-' + (page || 'error') + '">\n' +
    '<a class="skip-link" href="#main">' + esc(t.common.skipLink) + '</a>\n' +
    '<header class="site-header"><div class="wrap header-inner">' +
    '<a class="brand" href="' + pageUrl(lang, 'home') + '"><img src="/assets/img/logo.webp" alt="' + esc(t.common.logoAlt) + '" width="640" height="389"></a>' +
    '<nav class="main-nav" aria-label="Navigation"><ul>' +
    navItems.map(function (n) {
      return '<li><a href="' + n[1] + '"' + (n[0] === page ? ' aria-current="page"' : '') + '>' + esc(n[2]) + '</a></li>';
    }).join('') +
    '<li><a class="nav-contact" href="' + pageUrl(lang, 'home') + '#contact">' + esc(t.nav.contact) + '</a></li>' +
    '</ul></nav>' +
    '<ul class="lang-switch" aria-label="' + esc(t.common.languageLabel) + '">' + langSwitch + '</ul>' +
    '</div></header>\n' +
    '<main id="main">\n' + opts.body + '\n</main>\n' +
    footer(t) +
    '<div class="mobile-cta">' +
    '<a href="' + telHref() + '">' + ICON_PHONE + '<span>' + esc(t.common.call) + '</span></a>' +
    '<a href="' + smsHref() + '">' + ICON_SMS + '<span>SMS</span></a>' +
    '<a href="' + pageUrl(lang, 'home') + '#contact">' + ICON_MAIL + '<span>' + esc(t.nav.contact) + '</span></a>' +
    '</div>\n' +
    (opts.script ? '<script src="/assets/site.js?v=' + BUILD_ID + '" defer></script>\n' : '') +
    '</body>\n</html>\n';
}

function footer(t) {
  return '<footer class="site-footer"><div class="wrap footer-grid">' +
    '<div><p class="footer-name">' + esc(S.businessName) + ' <span lang="ja" aria-hidden="true">神</span></p>' +
    '<p class="footer-tagline">' + esc(t.common.footerTagline) + '</p>' +
    '<p>' + esc(t.common.footerArea) + '</p></div>' +
    '<div><p><a href="' + telHref() + '">' + esc(phoneDisplay()) + '</a><br>' +
    '<a href="mailto:' + esc(S.email) + '">' + esc(S.email) + '</a></p></div>' +
    '<div><ul class="footer-links">' +
    '<li><a href="' + pageUrl(lang, 'shiatsu') + '">' + esc(t.nav.shiatsu) + '</a></li>' +
    '<li><a href="' + pageUrl(lang, 'about') + '">' + esc(t.nav.about) + '</a></li>' +
    '<li><a href="' + pageUrl(lang, 'legal') + '">' + esc(t.common.legalLink) + '</a></li>' +
    '</ul></div>' +
    '</div><p class="wrap copyright">© ' + new Date().getFullYear() + ' ' + esc(S.businessName) + ' – ' + esc(S.practitioner) + '</p></footer>\n';
}

/* ---------- Données structurées (Google) ---------- */

function businessJsonLd(t) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HealthAndBeautyBusiness',
    '@id': SITE + '/#business',
    name: S.businessName,
    description: t.home.seoDescription,
    url: abs(pageUrl(lang, 'home')),
    logo: abs('/assets/img/logo.png'),
    image: abs('/assets/img/og-image.jpg'),
    telephone: S.phoneInternational,
    email: S.email,
    priceRange: (S.prices && S.prices[0] && S.prices[0].price) || undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: S.city,
      postalCode: S.postalCode,
      addressRegion: S.region,
      addressCountry: 'FR',
    },
    areaServed: (S.areaServed || []).map(function (c) { return { '@type': 'City', name: c }; }),
    founder: { '@type': 'Person', name: S.practitioner, jobTitle: 'Praticienne en Shiatsu Masunaga' },
    makesOffer: (S.prices || []).map(function (p) {
      return {
        '@type': 'Offer',
        name: p['label_' + lang] || p.label_fr,
        price: priceNumber(p.price),
        priceCurrency: 'EUR',
        itemOffered: { '@type': 'Service', name: 'Shiatsu Masunaga' },
      };
    }),
  };
}

function breadcrumbJsonLd(t, page, name) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t.nav.home, item: abs(pageUrl(lang, 'home')) },
      { '@type': 'ListItem', position: 2, name: name, item: abs(pageUrl(lang, page)) },
    ],
  };
}

/* ---------- Pages ---------- */

function priceList() {
  return '<ul class="price-list">' + (S.prices || []).map(function (p) {
    return '<li><span class="price-label">' + inline(p['label_' + lang] || p.label_fr) + '</span>' +
      '<span class="price-dots" aria-hidden="true"></span><span class="price-amount">' + esc(p.price) + '</span></li>';
  }).join('') + '</ul>';
}

function contactForm(t) {
  const f = t.form;
  return '<form class="contact-form" action="https://api.web3forms.com/submit" method="POST" data-sending="' + esc(f.sending) +
    '" data-success="' + esc(fill(f.success)) + '" data-error="' + esc(fill(f.error)) + '">' +
    '<h3>' + esc(f.title) + '</h3>' +
    '<input type="hidden" name="access_key" value="' + esc(S.web3formsKey) + '">' +
    '<input type="hidden" name="subject" value="' + esc(f.emailSubject) + '">' +
    '<input type="hidden" name="from_name" value="' + esc(S.businessName) + '">' +
    '<input type="checkbox" name="botcheck" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
    '<label>' + esc(f.name) + '<input type="text" name="name" required autocomplete="name"></label>' +
    '<label>' + esc(f.email) + '<input type="email" name="email" required autocomplete="email"></label>' +
    '<label>' + esc(f.phone) + '<input type="tel" name="phone" autocomplete="tel"></label>' +
    '<label>' + esc(f.message) + '<textarea name="message" rows="5" required></textarea></label>' +
    '<button class="btn btn-primary" type="submit">' + esc(f.submit) + '</button>' +
    '<p class="form-status" role="status" aria-live="polite"></p>' +
    '<p class="form-privacy">' + inline(f.privacy) + '</p>' +
    '</form>';
}

function homePage() {
  const t = T[lang];
  const h = t.home;
  const body =
    '<section class="hero"><div class="wrap hero-grid">' +
    '<div class="hero-text">' +
    '<p class="kanji-vertical" lang="ja" aria-hidden="true">神指圧</p>' +
    '<h1>' + inline(h.title) + '</h1>' +
    '<p class="tagline">' + inline(h.tagline) + '</p>' +
    paras(h.intro) +
    '<p class="cta-question">' + inline(h.ctaQuestion) + '</p>' +
    ctaButtons(t, h.ctaButton) +
    '</div>' +
    '<div class="hero-art"><span class="hero-sun" aria-hidden="true"></span>' +
    '<img class="art" src="/assets/img/shiatsu-massage.webp" srcset="/assets/img/shiatsu-massage-640.webp 640w, /assets/img/shiatsu-massage.webp 1100w" sizes="(max-width: 860px) 92vw, 50vw" alt="' + esc(h.heroImageAlt) + '" width="1100" height="671" fetchpriority="high" decoding="async">' +
    '</div></div></section>' +

    '<section class="section"><div class="wrap two-col">' +
    '<div><h2>' + inline(h.benefitsTitle) + '</h2>' + paras(h.benefitsIntro) + list(h.benefits) + paras(h.benefitsOutro) + '</div>' +
    '<div class="side-art">' + img('/assets/img/bambou-pierres.webp', t.shiatsu.imageAlt, 420, 350, 'art') + '</div>' +
    '</div></section>' +

    '<section class="section section-tint"><div class="wrap narrow">' +
    '<h2>' + inline(h.methodTitle) + '</h2>' + paras(h.methodText) +
    '<h3>' + inline(h.clothedTitle) + '</h3>' + paras(h.clothedText) +
    '<div class="note">' + paras(h.disclaimer) + '</div>' +
    '<p><a class="text-link" href="' + pageUrl(lang, 'shiatsu') + '">' + esc(h.methodLink) + ' →</a></p>' +
    '</div></section>' +

    '<section class="section"><div class="wrap">' +
    '<div class="narrow"><h2>' + inline(h.sessionTitle) + '</h2>' + paras(h.sessionIntro) + '</div>' +
    '<ol class="steps">' + (h.steps || []).map(function (s, i) {
      return '<li><div class="step-num">' + ENSO + '<span>' + (i + 1) + '</span></div><h3>' + inline(s.title) + '</h3>' + paras(s.text) + '</li>';
    }).join('') + '</ol>' +
    '</div></section>' +

    '<section class="section section-tint" id="tarifs"><div class="wrap narrow prices">' +
    img('/assets/img/lotus.webp', '', 360, 328, 'art lotus') +
    '<h2>' + inline(h.pricesTitle) + '</h2>' + priceList() +
    '<p class="cta-small">' + esc(t.common.freeBooking) + '</p>' +
    '</div></section>' +

    '<section class="section" id="contact"><div class="wrap two-col contact-grid">' +
    '<div><h2>' + inline(h.contactTitle) + '</h2>' + paras(h.contactText) +
    '<ul class="contact-list">' +
    '<li>' + ICON_PHONE + '<span><strong>' + esc(h.phoneLabel) + ' :</strong> <a href="' + telHref() + '">' + esc(phoneDisplay()) + '</a></span></li>' +
    '<li>' + ICON_MAIL + '<span><strong>' + esc(h.emailLabel) + ' :</strong> <a href="mailto:' + esc(S.email) + '">' + esc(S.email) + '</a></span></li>' +
    '</ul>' + ctaButtons(t) + paras(h.contactOutro) + '</div>' +
    '<div>' + contactForm(t) + '</div>' +
    '</div></section>';

  return layout({
    page: 'home', title: h.seoTitle, description: h.seoDescription, body: body,
    jsonLd: businessJsonLd(t), script: true,
  });
}

function shiatsuPage() {
  const t = T[lang];
  const p = t.shiatsu;
  const body =
    '<section class="page-head"><div class="wrap narrow">' +
    '<p class="kanji-mark" lang="ja" aria-hidden="true">指圧</p>' +
    '<h1>' + inline(p.title) + '</h1>' + paras(p.intro) + ctaButtons(t, p.ctaButton) +
    '</div></section>' +
    '<section class="section"><div class="wrap two-col">' +
    '<div><h2>' + inline(p.meridiansTitle) + '</h2>' + paras(p.meridiansText) + list(p.benefits) +
    '<div class="note">' + paras(p.disclaimer) + '</div></div>' +
    '<div class="side-art">' + img('/assets/img/bambou-pierres.webp', p.imageAlt, 420, 350, 'art') + '</div>' +
    '</div></section>' +
    '<section class="section section-tint"><div class="wrap narrow">' +
    '<h2>' + inline(p.sessionTitle) + '</h2>' + paras(p.sessionIntro) +
    '<h3>' + inline(p.clothedTitle) + '</h3>' + paras(p.clothedText) +
    '<h3>' + inline(p.personalTitle) + '</h3>' + paras(p.personalText) +
    '</div></section>' +
    ctaBand(t, p.ctaQuestion, p.ctaButton2);
  return layout({
    page: 'shiatsu', title: p.seoTitle, description: p.seoDescription, body: body,
    jsonLd: breadcrumbJsonLd(t, 'shiatsu', t.nav.shiatsu),
  });
}

function aboutPage() {
  const t = T[lang];
  const p = t.about;
  const body =
    '<section class="page-head"><div class="wrap two-col">' +
    '<div><p class="kanji-mark" lang="ja" aria-hidden="true">神</p>' +
    '<h1>' + inline(p.title) + '</h1>' + paras(p.intro) + '</div>' +
    '<div class="side-art">' + img('/assets/img/arbre-rocher.webp', p.imageAlt, 420, 358, 'art', true) + '</div>' +
    '</div></section>' +
    '<section class="section"><div class="wrap narrow">' +
    '<h2>' + inline(p.trainingTitle) + '</h2>' + paras(p.trainingText) +
    '</div></section>' +
    '<section class="section section-tint"><div class="wrap narrow">' +
    '<h2>' + inline(p.philosophyTitle) + '</h2>' + paras(p.philosophyText) +
    '<ul class="values">' + (p.values || []).map(function (v) {
      return '<li>' + ENSO + '<span>' + inline(v) + '</span></li>';
    }).join('') + '</ul>' +
    paras(p.outro) +
    '</div></section>' +
    ctaBand(t, p.ctaQuestion, p.ctaButton);
  return layout({
    page: 'about', title: p.seoTitle, description: p.seoDescription, body: body,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: S.practitioner,
      jobTitle: 'Shiatsu Masunaga',
      worksFor: { '@id': SITE + '/#business' },
      alumniOf: { '@type': 'EducationalOrganization', name: 'Centro Shiatsu Daniele Giorcelli', address: 'Biella, Italia' },
      url: abs(pageUrl(lang, 'about')),
    },
  });
}

function legalPage() {
  const t = T[lang];
  const p = t.legal;
  const body = '<section class="page-head"><div class="wrap narrow"><h1>' + inline(p.title) + '</h1>' + paras(p.text) + '</div></section>';
  return layout({ page: 'legal', title: p.seoTitle, description: p.seoDescription, body: body });
}

function notFoundPage() {
  const t = T[lang];
  const p = t.notFound;
  const body = '<section class="page-head center"><div class="wrap narrow">' + ENSO +
    '<h1>' + inline(p.title) + '</h1>' + paras(p.text) +
    '<p><a class="btn btn-primary" href="' + pageUrl(lang, 'home') + '">' + esc(p.back) + '</a></p></div></section>';
  return layout({ page: null, title: p.title + ' | ' + S.businessName, description: p.text, body: body });
}

/* ---------- Fichiers annexes ---------- */

function sitemap() {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';
  const today = new Date().toISOString().slice(0, 10);
  Object.keys(PAGES).forEach(function (page) {
    Object.keys(LANGS).forEach(function (l) {
      xml += '  <url>\n    <loc>' + abs(pageUrl(l, page)) + '</loc>\n    <lastmod>' + today + '</lastmod>\n';
      Object.keys(LANGS).forEach(function (alt) {
        xml += '    <xhtml:link rel="alternate" hreflang="' + alt + '" href="' + abs(pageUrl(alt, page)) + '"/>\n';
      });
      xml += '    <xhtml:link rel="alternate" hreflang="x-default" href="' + abs(pageUrl(DEFAULT_LANG, page)) + '"/>\n  </url>\n';
    });
  });
  return xml + '</urlset>\n';
}

/* ---------- Écriture ---------- */

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  if (fs.statSync(p).isDirectory()) {
    fs.readdirSync(p).forEach(function (f) { rmrf(path.join(p, f)); });
    fs.rmdirSync(p);
  } else fs.unlinkSync(p);
}
function mkdirp(p) {
  if (fs.existsSync(p)) return;
  mkdirp(path.dirname(p));
  fs.mkdirSync(p);
}
function write(rel, content) {
  const full = path.join(OUT, rel);
  mkdirp(path.dirname(full));
  fs.writeFileSync(full, content);
}
function copyDir(src, dest) {
  mkdirp(dest);
  fs.readdirSync(src).forEach(function (f) {
    const s = path.join(src, f);
    const d = path.join(dest, f);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else if (f !== '.DS_Store') fs.copyFileSync(s, d);
  });
}
function outPath(urlPath) { return urlPath.replace(/^\//, '') + 'index.html'; }

const BUILD_ID = Date.now().toString(36);

rmrf(OUT);
mkdirp(OUT);
copyDir(path.join(ROOT, 'assets'), path.join(OUT, 'assets'));
fs.copyFileSync(path.join(ROOT, 'assets', 'favicon.svg'), path.join(OUT, 'favicon.svg'));

Object.keys(LANGS).forEach(function (l) {
  lang = l;
  write(outPath(pageUrl(l, 'home')), homePage());
  write(outPath(pageUrl(l, 'shiatsu')), shiatsuPage());
  write(outPath(pageUrl(l, 'about')), aboutPage());
  write(outPath(pageUrl(l, 'legal')), legalPage());
});
lang = DEFAULT_LANG;
write('404.html', notFoundPage());
write('sitemap.xml', sitemap());
write('robots.txt', 'User-agent: *\nAllow: /\n\nSitemap: ' + abs('/sitemap.xml') + '\n');
write('_headers', '/assets/*\n  Cache-Control: public, max-age=86400\n');

if (/VOTRE-CLE/.test(S.web3formsKey)) {
  console.warn('⚠ La clé Web3Forms n\'est pas encore renseignée dans content/settings.json');
}
console.log('✔ Site généré dans _site/ (' + Object.keys(LANGS).length + ' langues)');
