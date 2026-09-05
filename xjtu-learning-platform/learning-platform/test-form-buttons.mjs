// Regression: Base UI defaults to type="button", unlike a plain HTML button.
// Verify form actions explicitly submit without touching live accounts or data.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from '@base-ui/react/button';

assert.match(
  renderToStaticMarkup(React.createElement(Button)),
  /type="button"/,
);
assert.match(
  renderToStaticMarkup(React.createElement(Button, { type: 'submit' })),
  /type="submit"/,
);
let submitCount = 0;
for (const file of ['session.tsx', 'views.tsx', 'material-manager.tsx', 'activity-ui.tsx']) {
  const source = ts.createSourceFile(
    file,
    await readFile(new URL(file, import.meta.url), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  function visit(node, inForm = false) {
    const opening = ts.isJsxElement(node)
      ? node.openingElement
      : ts.isJsxSelfClosingElement(node)
        ? node
        : null;
    const tag = opening?.tagName.getText(source);
    if (inForm && tag === 'Button') {
      const attrs = opening.attributes.properties;
      const attr = (name) =>
        attrs.find(
          (a) => ts.isJsxAttribute(a) && a.name.getText(source) === name,
        );
      if (!attr('onClick')) {
        assert.equal(
          attr('type')?.initializer?.text,
          'submit',
          `${file}: form action must explicitly submit`,
        );
        submitCount++;
      }
    }
    ts.forEachChild(node, (child) => visit(child, inForm || tag === 'form'));
  }
  visit(source);
}
assert.equal(
  submitCount,
  5,
  'Check login/password, assignment, material submission and material editing',
);
console.log(
  'PASS: login/password, teacher publishing and material edit forms explicitly submit; Base UI rendering verified.',
);
