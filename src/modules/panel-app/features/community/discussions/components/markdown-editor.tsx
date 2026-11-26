import type { Ref } from 'react'
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  codeBlockPlugin,
  codeMirrorPlugin,
  CodeToggle,
  CreateLink,
  diffSourcePlugin,
  DiffSourceToggleWrapper,
  headingsPlugin,
  InsertCodeBlock,
  InsertTable,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  quotePlugin,
  Separator,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
  type MDXEditorMethods,
} from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'
import './markdown-editor.css'

const LANGUAGES = { '': 'Texto', ts: 'TypeScript', js: 'JavaScript', php: 'PHP', sql: 'SQL', css: 'CSS', html: 'HTML', sh: 'Shell', json: 'JSON' }

const PT_BR: Record<string, string> = {
  'toolbar.bold': 'Negrito',
  'toolbar.removeBold': 'Tirar negrito',
  'toolbar.italic': 'Itálico',
  'toolbar.removeItalic': 'Tirar itálico',
  'toolbar.underline': 'Sublinhado',
  'toolbar.removeUnderline': 'Tirar sublinhado',
  'toolbar.inlineCode': 'Código no texto',
  'toolbar.removeInlineCode': 'Tirar código',
  'toolbar.bulletedList': 'Lista',
  'toolbar.numberedList': 'Lista numerada',
  'toolbar.checkList': 'Lista de tarefas',
  'toolbar.link': 'Link',
  'toolbar.table': 'Tabela',
  'toolbar.codeBlock': 'Bloco de código',
  'toolbar.undo': 'Desfazer {{shortcut}}',
  'toolbar.redo': 'Refazer {{shortcut}}',
  'toolbar.richText': 'Formatado',
  'toolbar.source': 'Markdown',
  'toolbar.blockTypeSelect.placeholder': 'Estilo',
  'toolbar.blockTypeSelect.selectBlockTypeTooltip': 'Estilo do bloco',
  'toolbar.blockTypes.paragraph': 'Parágrafo',
  'toolbar.blockTypes.heading': 'Título {{level}}',
  'toolbar.blockTypes.quote': 'Citação',
  'createLink.url': 'Endereço',
  'createLink.urlPlaceholder': 'Cole um endereço',
  'createLink.text': 'Texto do link',
  'createLink.title': 'Título do link',
  'createLink.saveTooltip': 'Salvar link',
  'createLink.cancelTooltip': 'Cancelar',
  'linkPreview.edit': 'Editar link',
  'linkPreview.remove': 'Remover link',
  'linkPreview.copyToClipboard': 'Copiar',
  'linkPreview.copied': 'Copiado!',
  'dialogControls.save': 'Salvar',
  'dialogControls.cancel': 'Cancelar',
  'table.deleteTable': 'Apagar tabela',
  'table.insertRowAbove': 'Linha acima',
  'table.insertRowBelow': 'Linha abaixo',
  'table.deleteRow': 'Apagar linha',
  'table.insertColumnLeft': 'Coluna à esquerda',
  'table.insertColumnRight': 'Coluna à direita',
  'table.deleteColumn': 'Apagar coluna',
  'codeBlock.selectLanguage': 'Linguagem do bloco',
  'codeblock.delete': 'Apagar bloco de código',
}

function translate(key: string, fallback: string, values?: Record<string, unknown>) {
  const text = PT_BR[key] ?? fallback
  return values ? text.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(values[name] ?? '')) : text
}

/**
 * Markdown that renders while you type: `## ` turns into a heading, `- ` into a list, `**` into bold.
 * The toolbar does the same for who does not know Markdown, and the last toggle shows the raw text.
 * What comes out is plain Markdown, the same the reply action already stores.
 */
export function MarkdownEditor({
  initialMarkdown,
  onChange,
  placeholder,
  editorRef,
  readOnly,
  labelledBy,
}: {
  initialMarkdown: string
  onChange: (markdown: string) => void
  placeholder?: string
  editorRef?: Ref<MDXEditorMethods>
  readOnly?: boolean
  labelledBy?: string
}) {
  return (
    <div className="markdown-editor" aria-labelledby={labelledBy} role="group">
      <MDXEditor
        ref={editorRef}
        markdown={initialMarkdown}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        translation={translate}
        className="markdown-editor__root"
        contentEditableClassName="markdown-editor__content markdown-text"
        plugins={[
          headingsPlugin({ allowedHeadingLevels: [2, 3] }),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          tablePlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: '' }),
          codeMirrorPlugin({ codeBlockLanguages: LANGUAGES }),
          diffSourcePlugin({ viewMode: 'rich-text' }),
          markdownShortcutPlugin(),
          toolbarPlugin({
            toolbarClassName: 'markdown-editor__toolbar',
            toolbarContents: () => (
              <DiffSourceToggleWrapper options={['rich-text', 'source']}>
                <UndoRedo />
                <Separator />
                <BlockTypeSelect />
                <BoldItalicUnderlineToggles options={['Bold', 'Italic']} />
                <CodeToggle />
                <Separator />
                <ListsToggle options={['bullet', 'number']} />
                <CreateLink />
                <InsertTable />
                <InsertCodeBlock />
              </DiffSourceToggleWrapper>
            ),
          }),
        ]}
      />
    </div>
  )
}
