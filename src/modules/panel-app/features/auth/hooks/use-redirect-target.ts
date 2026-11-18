import { useSearchParams } from 'react-router'

/** Where to go after signing in: the `redirect` query param when it is a local path, else `/app`. */
export function useRedirectTarget(): string {
  const [params] = useSearchParams()
  const target = params.get('redirect')
  return target?.startsWith('/') && !target.startsWith('//') ? target : '/app'
}
