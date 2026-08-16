import { parseFragment } from 'parse5';

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

const BOOLEAN_ATTRIBUTES = new Set([
  'allowfullscreen', 'async', 'autofocus', 'autoplay', 'checked',
  'controls', 'default', 'defer', 'disabled', 'formnovalidate',
  'hidden', 'inert', 'ismap', 'itemscope', 'loop', 'multiple',
  'muted', 'nomodule', 'novalidate', 'open', 'playsinline',
  'readonly', 'required', 'reversed', 'selected', 'truespeed',
]);

const ATTR_ALIASES = {
  class: 'className',
  for: 'htmlFor',
  readonly: 'readOnly',
  maxlength: 'maxLength',
  minlength: 'minLength',
  tabindex: 'tabIndex',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  autofocus: 'autoFocus',
  autocomplete: 'autoComplete',
  contenteditable: 'contentEditable',
  crossorigin: 'crossOrigin',
  datetime: 'dateTime',
  enctype: 'encType',
  formaction: 'formAction',
  formenctype: 'formEncType',
  formmethod: 'formMethod',
  formnovalidate: 'formNoValidate',
  formtarget: 'formTarget',
  inputmode: 'inputMode',
  novalidate: 'noValidate',
  playsinline: 'playsInline',
  referrerpolicy: 'referrerPolicy',
  srcdoc: 'srcDoc',
  srclang: 'srcLang',
  srcset: 'srcSet',
  usemap: 'useMap',
  allowfullscreen: 'allowFullScreen',
  allowpaymentrequest: 'allowPaymentRequest',
  cellpadding: 'cellPadding',
  cellspacing: 'cellSpacing',
  frameborder: 'frameBorder',
  marginheight: 'marginHeight',
  marginwidth: 'marginWidth',
  spellcheck: 'spellCheck',
};

const SVG_ATTR_ALIASES = {
  viewbox: 'viewBox',
  preserveaspectratio: 'preserveAspectRatio',
  gradientunits: 'gradientUnits',
  gradienttransform: 'gradientTransform',
  patternunits: 'patternUnits',
  patterncontentunits: 'patternContentUnits',
  maskunits: 'maskUnits',
  maskcontentunits: 'maskContentUnits',
  clippathunits: 'clipPathUnits',
  xlinkhref: 'xlinkHref',
  xmlspace: 'xmlSpace',
  xmllang: 'xmlLang',
};

const indent = (text, spaces) =>
  text.trim().split('\n')
    .map((line) => (line.trim() === '' ? '' : ' '.repeat(spaces) + line))
    .join('\n');

const escapeTicks = (text) => text.replace(/`/g, '\\`');

const escapeText = (text) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;');

const escapeAttrValue = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');

const camelizeAttr = (name) => {
  const lower = name.toLowerCase();
  if (ATTR_ALIASES[lower]) {
    return ATTR_ALIASES[lower];
  }
  if (SVG_ATTR_ALIASES[lower]) {
    return SVG_ATTR_ALIASES[lower];
  }
  if (/^(data-|aria-)/i.test(name)) {
    return name;
  }
  if (name.includes(':')) {
    const [namespace, local] = name.split(':');
    return `${namespace}${local.charAt(0).toUpperCase()}${local.slice(1)}`;
  }
  return name.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
};

const styleObject = (value) => {
  const result = {};
  for (const declaration of String(value).split(';')) {
    const colon = declaration.indexOf(':');
    if (colon < 0) {
      continue;
    }
    const property = declaration.slice(0, colon).trim();
    let rawValue = declaration.slice(colon + 1).trim();
    if (!property || !rawValue) {
      continue;
    }
    const key = property.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    result[key] = rawValue.replace(/!important\s*$/i, '').trim();
  }
  return result;
};

const styleAttr = (value) => {
  const entries = Object.entries(styleObject(value))
    .map(([key, val]) => `${key}: '${val.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`);
  return entries.length ? `style={{ ${entries.join(', ')} }}` : '';
};

const serializeAttrs = (attrs) =>
  (attrs || [])
    .map((attr) => {
      const name = camelizeAttr(attr.name);
      if (name === 'style') {
        return styleAttr(attr.value);
      }
      if (BOOLEAN_ATTRIBUTES.has(attr.name.toLowerCase())) {
        return name;
      }
      return `${name}="${escapeAttrValue(attr.value)}"`;
    })
    .filter(Boolean)
    .join(' ');

const serializeNode = (node) => {
  if (node.nodeName === '#text') {
    return escapeText(node.value);
  }
  if (node.nodeName === '#comment') {
    return `{/*${node.data.replace(/\*\//g, '* /')}*/}`;
  }

  const tag = node.tagName;
  const attrs = serializeAttrs(node.attrs);
  const attrText = attrs ? ` ${attrs}` : '';
  if (VOID_ELEMENTS.has(tag)) {
    return `<${tag}${attrText} />`;
  }

  const children = (node.childNodes || []).map(serializeNode).join('');
  return `<${tag}${attrText}>${children}</${tag}>`;
};

const toJsx = (html) => {
  const fragment = parseFragment(String(html || ''));
  return (fragment.childNodes || []).map(serializeNode).join('');
};

const componentName = (type) =>
  type.charAt(0).toUpperCase() + type.toLowerCase().slice(1);

function reactCode({ type, html, css, isTailwind }) {
  const jsx = toJsx(html);
  const name = componentName(type);
  const imports = isTailwind
    ? "import React from 'react';"
    : "import React from 'react';\nimport styled from 'styled-components';";
  const wrapper = !isTailwind && css
    ? `\nconst StyledWrapper = styled.div\`\n${indent(escapeTicks(css), 2)}\`;\n`
    : '';
  const body = css.trim().length === 0 || isTailwind
    ? `return (\n${indent(jsx, 4)}\n  );`
    : `return (\n    <StyledWrapper>\n${indent(jsx, 6)}\n    </StyledWrapper>\n  );`;

  return `${imports}\n\nconst ${name} = () => {\n  ${body}\n}\n${wrapper}\nexport default ${name};\n`;
}

function vueCode({ html, css, isTailwind }) {
  const template = indent(html.trim(), 2);
  const style = css
    ? `<style scoped>\n${indent(css, 2)}\n</style>`
    : '';
  return isTailwind
    ? `<template>\n${template}\n</template>\n`
    : `${style}\n\n<template>\n${template}\n</template>\n`;
}

function svelteCode({ html, css, isTailwind }) {
  const body = html.trim();
  const style = css
    ? `<style>\n${indent(css, 2)}\n</style>`
    : '';
  return isTailwind ? `${body}\n` : `${body}\n\n${style}\n`;
}

function litCode({ type, html, css, isTailwind }) {
  const name = componentName(type);
  const imports = isTailwind
    ? "import { LitElement, html } from 'lit';"
    : "import { LitElement, html, css } from 'lit';";
  const styles = !isTailwind && css
    ? `\n  static styles = css\`\n${indent(escapeTicks(css), 4)}\`;\n\n`
    : '';
  const render = `return html\`\n${indent(escapeTicks(html), 6)}\n    \`;`;

  return `${imports}\nimport { customElement } from 'lit/decorators.js';\n\n@customElement('my-${type}')\nexport class My${name} extends LitElement {${styles}  render() {\n    ${render}\n  }\n}\n\ndeclare global {\n  interface HTMLElementTagNameMap {\n    'my-${type}': My${name};\n  }\n}\n`;
}

const TARGETS = {
  html: 'html',
  css: 'css',
  react: 'react',
  jsx: 'react',
  tsx: 'react',
  vue: 'vue',
  svelte: 'svelte',
  lit: 'lit',
};

const LANGUAGES = {
  html: (post) => (post.isTailwind ? 'html+tailwind' : 'html'),
  css: () => 'css',
  react: () => 'jsx',
  vue: () => 'vue',
  svelte: () => 'svelte',
  lit: () => 'ts',
};

export function resolveTarget(value) {
  const target = TARGETS[String(value || '').toLowerCase()];
  if (!target) {
    throw new Error(`Unsupported language: ${value}`);
  }
  return target;
}

export function generateCode(target, post) {
  const normalized = resolveTarget(target);
  let code;
  if (normalized === 'html') {
    code = post.html;
  } else if (normalized === 'css') {
    code = post.css;
  } else if (normalized === 'react') {
    code = reactCode(post);
  } else if (normalized === 'vue') {
    code = vueCode(post);
  } else if (normalized === 'svelte') {
    code = svelteCode(post);
  } else if (normalized === 'lit') {
    code = litCode(post);
  }

  return {
    target: normalized,
    language: LANGUAGES[normalized](post),
    code,
  };
}
