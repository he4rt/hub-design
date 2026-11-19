import { FolderGit2, GitCommitHorizontal, GitPullRequest } from 'lucide-react'

type EvidenceKind = 'commit' | 'pull-request' | 'repository'

export const evidenceIcons: Record<EvidenceKind, typeof GitCommitHorizontal> = {
  commit: GitCommitHorizontal,
  'pull-request': GitPullRequest,
  repository: FolderGit2,
}

/** `frete-calc@3f9c2a1`, `loja-bairro#12`, or the repository; pass `full` to keep the owner. */
export function evidenceRef(
  evidence: { kind: EvidenceKind; repository: string; ref: string | null },
  { full = false } = {},
): string {
  const repository = full ? evidence.repository : (evidence.repository.split('/').pop() ?? evidence.repository)
  if (evidence.kind === 'commit') return `${repository}@${evidence.ref}`
  if (evidence.kind === 'pull-request') return `${repository}#${evidence.ref}`
  return repository
}
