import ts from 'typescript'
import fs from 'node:fs'
// One-off extraction from the versioned source. Keep the resulting seed in Git.
const pages = ['mentions-legales', 'confidentialite', 'cgv']
const output = []
function text(node, source) {
  if (ts.isJsxText(node)) return node.text.replace(/\s+/g, ' ')
  if (ts.isJsxExpression(node)) {
    const expression = node.expression
    if (!expression) return ''
    if (ts.isStringLiteral(expression)) return expression.text
    const code = expression.getText(source)
    if (code.startsWith('SITE.')) return '{{site.' + code.slice(5).replace(/\.replace\(.*$/, '') + '}}'
    return ''
  }
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === 'br') return '\n'
  if (ts.isJsxElement(node)) return node.children.map(child => text(child, source)).join('')
  return ''
}
for (const slug of pages) {
  const file = `src/app/(site)/${slug}/page.tsx`
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let layout
  function walk(node) { if (ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === 'LegalPageLayout') layout = node; ts.forEachChild(node, walk) }
  walk(source)
  const attrs = Object.fromEntries(layout.openingElement.attributes.properties.filter(ts.isJsxAttribute).map(a => [a.name.text, a.initializer?.text || '']))
  const sections = layout.children.filter(ts.isJsxElement).map(node => {
    const tag = node.openingElement.tagName.getText(source)
    const string = text(node, source).replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()
    return { kind: tag === 'h2' ? 'heading' : tag === 'h3' ? 'subheading' : tag === 'ul' ? 'list' : 'paragraph', text: string }
  })
  output.push({ slug, blockType: 'legal', ...attrs, sections })
}
fs.writeFileSync('src/cms/legal-seed.json', JSON.stringify(output, null, 2) + '\n')
console.log('Trois documents légaux extraits des sources existantes.')
