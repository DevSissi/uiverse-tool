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

// Source CSS/HTML is embedded in tagged templates (styled-components, lit).
// Backticks would close the template and `${` would become a live
// interpolation, so both are neutralized. Backslashes are left untouched:
// tagged templates expose the raw string, so CSS escapes such as
// `content: "\2192"` still reach the consumer verbatim.
const escapeTemplate = (text) =>
  String(text).replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

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

const camelize = (name) => name.replace(/-([a-z])/g, (_, char) => char.toUpperCase());

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
  return camelize(name);
};

// Splits on declaration separators only. A bare `;` split would truncate
// `url(data:image/svg+xml;base64,...)` and quoted values such as `'a;b'`.
const splitDeclarations = (value) => {
  const declarations = [];
  let current = '';
  let quote = '';
  let depth = 0;

  for (const char of String(value)) {
    if (quote) {
      current += char;
      if (char === quote) {
        quote = '';
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth = Math.max(0, depth - 1);
    } else if (char === ';' && depth === 0) {
      declarations.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  declarations.push(current);
  return declarations;
};

const styleObject = (value) => {
  const result = {};
  for (const declaration of splitDeclarations(value)) {
    const colon = declaration.indexOf(':');
    if (colon < 0) {
      continue;
    }
    const property = declaration.slice(0, colon).trim();
    let rawValue = declaration.slice(colon + 1).trim();
    if (!property || !rawValue) {
      continue;
    }
    // React keeps CSS custom properties verbatim; camelizing `--i` to `-I`
    // silently drops the declaration.
    const key = property.startsWith('--') ? property : camelize(property);
    result[key] = rawValue.replace(/!important\s*$/i, '').trim();
  }
  return result;
};

const styleAttr = (value) => {
  const entries = Object.entries(styleObject(value))
    .map(([key, val]) => {
      const quoted = val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `${/^[A-Za-z][A-Za-z0-9]*$/.test(key) ? key : `'${key}'`}: '${quoted}'`;
    });
  return entries.length ? `style={{ ${entries.join(', ')} }}` : '';
};

// parse5 splits `xlink:href` into name `href` plus prefix `xlink`, so the
// prefix is restored before camelizing to `xlinkHref`.
const qualifiedName = (attr) => (attr.prefix ? `${attr.prefix}:${attr.name}` : attr.name);

const serializeAttrs = (attrs) =>
  (attrs || [])
    .map((attr) => {
      const source = qualifiedName(attr);
      const name = camelizeAttr(source);
      if (name === 'style') {
        return styleAttr(attr.value);
      }
      if (BOOLEAN_ATTRIBUTES.has(source.toLowerCase())) {
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

const isBlankText = (node) => node.nodeName === '#text' && node.value.trim() === '';

// Serializes top-level nodes one per line. Text nodes lose their surrounding
// whitespace to the line break, so significant spacing becomes `{' '}`.
const serializeRoots = (roots) =>
  roots
    .map((node) => {
      const jsx = serializeNode(node);
      if (node.nodeName !== '#text') {
        return jsx;
      }
      const [, lead, body, tail] = jsx.match(/^(\s*)([\s\S]*?)(\s*)$/);
      return `${lead ? "{' '}" : ''}${body}${tail ? "{' '}" : ''}`;
    })
    .join('\n');

// A JSX expression accepts a single root. `wrapped` tells the converter that
// the caller already supplies one (a `StyledWrapper`), so a fragment is only
// added when sibling roots would otherwise be returned bare — an `<input>`
// next to its `<label>`, a button next to its tooltip.
const toJsx = (html, { wrapped = false } = {}) => {
  const roots = (parseFragment(String(html || '')).childNodes || []).filter(
    (node) => !isBlankText(node),
  );
  if (roots.length === 1) {
    return serializeNode(roots[0]);
  }
  if (wrapped) {
    return serializeRoots(roots);
  }
  return roots.length === 0 ? '<></>' : `<>\n${indent(serializeRoots(roots), 2)}\n</>`;
};

// `type` comes from Uiverse and may be absent or hyphenated ("radio-button"),
// while the output uses it as a JS identifier and a custom-element name.
const componentName = (type) => {
  const words = String(type || '').match(/[a-zA-Z0-9]+/g) || [];
  const name = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  return /^[A-Za-z]/.test(name) ? name : `Component${name}`;
};

// Custom elements must contain a dash and start with a letter.
const customElementName = (type) => {
  const slug = String(type || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `my-${slug || 'component'}`;
};

// Tailwind components carry their styling in class names, and a component may
// simply have no CSS; either way the style block is dropped rather than
// emitted blank.
const hasStyles = (css, isTailwind) => !isTailwind && String(css || '').trim() !== '';

function reactCode({ type, html, css, isTailwind }) {
  const name = componentName(type);
  const styled = hasStyles(css, isTailwind);
  const jsx = toJsx(html, { wrapped: styled });
  const imports = styled
    ? "import React from 'react';\nimport styled from 'styled-components';"
    : "import React from 'react';";
  const wrapper = styled
    ? `\nconst StyledWrapper = styled.div\`\n${indent(escapeTemplate(css), 2)}\n\`;\n`
    : '';
  const body = styled
    ? `return (\n    <StyledWrapper>\n${indent(jsx, 6)}\n    </StyledWrapper>\n  );`
    : `return (\n${indent(jsx, 4)}\n  );`;

  return `${imports}\n\nconst ${name} = () => {\n  ${body}\n}\n${wrapper}\nexport default ${name};\n`;
}

function vueCode({ html, css, isTailwind }) {
  const template = `<template>\n${indent(html, 2)}\n</template>\n`;
  return hasStyles(css, isTailwind)
    ? `<style scoped>\n${indent(css, 2)}\n</style>\n\n${template}`
    : template;
}

function svelteCode({ html, css, isTailwind }) {
  const body = String(html || '').trim();
  return hasStyles(css, isTailwind)
    ? `${body}\n\n<style>\n${indent(css, 2)}\n</style>\n`
    : `${body}\n`;
}

function litCode({ type, html, css, isTailwind }) {
  const className = `My${componentName(type)}`;
  const tagName = customElementName(type);
  const styled = hasStyles(css, isTailwind);
  const imports = styled
    ? "import { LitElement, html, css } from 'lit';"
    : "import { LitElement, html } from 'lit';";
  const members = [];
  if (styled) {
    members.push(`  static styles = css\`\n${indent(escapeTemplate(css), 4)}\n  \`;`);
  }
  members.push(
    `  render() {\n    return html\`\n${indent(escapeTemplate(html), 6)}\n    \`;\n  }`,
  );

  return [
    imports,
    "import { customElement } from 'lit/decorators.js';",
    '',
    `@customElement('${tagName}')`,
    `export class ${className} extends LitElement {`,
    members.join('\n\n'),
    '}',
    '',
    'declare global {',
    '  interface HTMLElementTagNameMap {',
    `    '${tagName}': ${className};`,
    '  }',
    '}',
    '',
  ].join('\n');
}

// One entry per target keeps the alias table, the emitter, and the reported
// language in sync; adding a target cannot leave `code` undefined.
const TARGETS = {
  html: {
    emit: (post) => String(post.html || ''),
    language: (post) => (post.isTailwind ? 'html+tailwind' : 'html'),
  },
  css: { emit: (post) => String(post.css || ''), language: () => 'css' },
  react: { emit: reactCode, language: () => 'jsx' },
  vue: { emit: vueCode, language: () => 'vue' },
  svelte: { emit: svelteCode, language: () => 'svelte' },
  lit: { emit: litCode, language: () => 'ts' },
};

const ALIASES = { jsx: 'react', tsx: 'react' };

export const SUPPORTED_TARGETS = Object.keys(TARGETS);

export function resolveTarget(value) {
  const key = String(value || '').trim().toLowerCase();
  const target = ALIASES[key] || key;
  if (!TARGETS[target]) {
    throw new Error(
      `Unsupported language: ${value}. Expected one of ${SUPPORTED_TARGETS.join(', ')} (jsx/tsx alias react).`,
    );
  }
  return target;
}

export function generateCode(target, post) {
  const normalized = resolveTarget(target);
  const { emit, language } = TARGETS[normalized];
  return {
    target: normalized,
    language: language(post),
    code: emit(post),
  };
}
