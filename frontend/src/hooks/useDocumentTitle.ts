import { useEffect } from 'react'

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} — Sen Éclat` : "Sen Éclat — L'éclat au quotidien"
  }, [title])
}
