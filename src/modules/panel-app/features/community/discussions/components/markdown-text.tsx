import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './markdown-text.css'

/** Markdown written by members or read from a repository: no raw HTML, no images, links only to http(s). */
export function MarkdownText({ children }: { children: string }) {
  return (
    <div className="markdown-text">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        disallowedElements={['img']}
        components={{
          a: ({ href, children }) => (
            <a href={href?.startsWith('https://') || href?.startsWith('http://') ? href : undefined} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </Markdown>
    </div>
  )
}
