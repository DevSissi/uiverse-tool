import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const HTMLtoJSX = require('htmltojsx');

const indent = (text, spaces) =>
  text.trim().split('\n')
    .map((line) => (line.trim() === '' ? '' : ' '.repeat(spaces) + line))
    .join('\n');

const escapeTicks = (text) => text.replace(/`/g, '\\`');

const componentName = (type) =>
  type.charAt(0).toUpperCase() + type.toLowerCase().slice(1);

function reactCode({ type, html, css, isTailwind }) {
  const converter = new HTMLtoJSX({ createClass: false });
  const jsx = converter.convert(html);
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
