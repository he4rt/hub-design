import { useState, useTransition } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BookOpen, ChartNoAxesCombined, Copy, ExternalLink, FileText } from 'lucide-react'
import { FormMessage } from '@/components/form-message'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { MemberProject } from '@/mocks/db'
import './project-documents.css'

const FILES = [
  {
    key: 'product',
    label: 'Produto',
    filename: 'PRODUCT.md',
    template:
      '# Meu projeto\n\n## O problema\n\nQue problema você quer resolver?\n\n## Para quem\n\nQuem enfrenta esse problema?\n\n## O que já funciona\n\n- O que já pode ser usado\n',
  },
  {
    key: 'metrics',
    label: 'Métricas',
    filename: 'PRODUCT_METRICS.md',
    template:
      '# Métricas\n\n| Métrica | Meta | Atual | Como medimos |\n| --- | --- | --- | --- |\n| O resultado que importa | Aonde queremos chegar | Onde estamos | Fonte e período |\n',
  },
  {
    key: 'readme',
    label: 'README',
    filename: 'README.md',
    template: '# Meu projeto\n\n## Como rodar\n\n## Como contribuir\n',
  },
] as const

/** Repository context for a forum question, without raw HTML, images or embedded content. */
export function ProjectDocuments({ project, own }: { project: MemberProject; own: boolean }) {
  const [notice, setNotice] = useState<string | null>(null)
  const [copying, startCopying] = useTransition()
  const available = FILES.filter((f) => project.read.files[f.key])
  const missing = FILES.filter((f) => !project.read.files[f.key])
  const [tab, setTab] = useState<string>(available[0]?.key ?? 'summary')
  return (
    <section className="project-documents" aria-label="Documentos do repositório">
      <Tabs value={available.some((f) => f.key === tab) ? tab : available[0]?.key ?? 'summary'} onValueChange={setTab}>
        <div className="project-documents__toolbar">
          <TabsList aria-label="Sobre o projeto">
            {available.length === 0 && <TabsTrigger value="summary">Documentos</TabsTrigger>}
            {available.map((f) => (
              <TabsTrigger key={f.key} value={f.key}>
                {f.key === 'metrics' ? <ChartNoAxesCombined size={15} aria-hidden /> : <FileText size={15} aria-hidden />}
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <span>Do repositório</span>
        </div>
        <TabsContent value="summary" className="project-documents__summary">
          <h2>Ainda não há documentos</h2>
          <p>{project.pitch}</p>
          <p className="project-documents__hint">
            O autor ainda não adicionou documentos ao repositório. Você pode conhecer o código no GitHub.
          </p>
        </TabsContent>
        {available.map((f) => (
          <TabsContent key={f.key} value={f.key} className="project-documents__panel">
            <p className="project-documents__source"><FileText size={15} aria-hidden /> Do GitHub: {f.filename}</p>
            <div className="project-documents__markdown">
              <Markdown
                remarkPlugins={[remarkGfm]}
                skipHtml
                disallowedElements={['img']}
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href?.startsWith('https://') || href?.startsWith('http://') ? href : undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {project.read.files[f.key]}
              </Markdown>
            </div>
          </TabsContent>
        ))}
      </Tabs>
      {own && missing.length > 0 && (
        <section className="project-documents__missing">
          <h2>
            <BookOpen size={18} aria-hidden /> Dê mais contexto a quem quer ajudar
          </h2>
          <p>Estes arquivos ainda não estão no repositório. Use um modelo para começar.</p>
          {missing.map((f) => (
            <div className="project-documents__file" key={f.key}>
              <span>{f.filename}</span>
              <div>
                <Button
                  size="sm"
                  variant="ghost"
                  loading={copying}
                  onClick={() =>
                    startCopying(async () => {
                      try {
                        await navigator.clipboard.writeText(f.template)
                        setNotice(`Modelo de ${f.filename} copiado.`)
                      } catch {
                        setNotice('Não foi possível copiar. Abra o modelo no GitHub.')
                      }
                    })
                  }
                >
                  <Copy size={14} aria-hidden /> Copiar modelo
                </Button>
                <Button size="sm" variant="secondary" asChild>
                  <a
                    href={`${project.repository.url}/new/HEAD?filename=${f.filename}&value=${encodeURIComponent(f.template)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={14} aria-hidden /> Criar no GitHub
                  </a>
                </Button>
              </div>
            </div>
          ))}
          <FormMessage tone="success">{notice}</FormMessage>
        </section>
      )}
    </section>
  )
}
