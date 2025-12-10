import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../Button'
import { listPromptHistory, deletePromptHistory, clearPromptHistory } from '../../services/promptHistoryService'
import { PromptHistoryEntry, VeoModel } from '../../types'
import { Clock, Trash2, Copy, RefreshCw, Film, Save } from 'lucide-react'

interface PromptHistoryModalProps {
  open: boolean
  onClose: () => void
  onInsert: (text: string) => void
  onReplay: (entry: PromptHistoryEntry) => void
  onPersistCurrent: () => Promise<void> | void
}

export const PromptHistoryModal: React.FC<PromptHistoryModalProps> = ({ open, onClose, onInsert, onPersistCurrent }) => {
  const [entries, setEntries] = useState<PromptHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [blobUrls, setBlobUrls] = useState<Map<number, string>>(new Map())
  const containerRef = useRef<HTMLDivElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (open && closeBtnRef.current) closeBtnRef.current.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    listPromptHistory().then(setEntries).finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    const next = new Map<number, string>()
    entries.forEach(e => {
      if (e.videoBlob && !next.has(e.id)) {
        const url = URL.createObjectURL(e.videoBlob)
        next.set(e.id, url)
      }
    })
    const prev = blobUrls
    setBlobUrls(next)
    return () => {
      prev.forEach(u => URL.revokeObjectURL(u))
      next.forEach(u => URL.revokeObjectURL(u))
    }
  }, [entries])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) onClose()
  }

  const fmt = useMemo(() => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }), [])

  const handleDelete = async (id: number) => {
    await deletePromptHistory(id)
    const next = await listPromptHistory()
    setEntries(next)
  }

  const handleClear = async () => {
    await clearPromptHistory()
    setEntries([])
  }

  async function persistCurrentAndRefresh() {
    await onPersistCurrent()
    const next = await listPromptHistory()
    setEntries(next)
  }

  if (!open) return null

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center"
      onMouseDown={handleBackdropClick}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl w-full max-w-6xl mx-4 my-6 max-h-[85vh] flex flex-col overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-300">Prompt History</h2>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={persistCurrentAndRefresh} icon={<Save className="w-4 h-4" />}>Persist Current</Button>
            <Button variant="secondary" onClick={handleClear} icon={<RefreshCw className="w-4 h-4" />}>Clear All</Button>
            <Button variant="secondary" onClick={onClose} ref={closeBtnRef}>Close</Button>
          </div>
        </div>
        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-zinc-500 text-xs font-mono">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
              <Film className="w-8 h-8 mb-4 opacity-50" />
              <p className="text-xs font-mono uppercase tracking-widest">No entries yet</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {entries.map((e) => (
                <li key={e.id} className="border border-zinc-800 bg-zinc-950 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase mb-1">
                        <Clock className="w-3 h-3" />
                        <span>{fmt.format(new Date(e.createdAt))}</span>
                        <span className="mx-2">•</span>
                        <span>{e.aspectRatio}</span>
                        <span className="mx-2">•</span>
                        <span>{e.resolution}</span>
                        <span className="mx-2">•</span>
                        <span>{e.model === VeoModel.Fast ? 'FAST' : 'HQ'}</span>
                      </div>
                      <div className="text-sm text-zinc-200 break-words">
                        {e.prompt.length > 200 ? e.prompt.slice(0, 200) + '…' : e.prompt}
                      </div>
                      {e.error && (
                        <div className="mt-2 text-[10px] text-red-500 font-mono break-words">{e.error}</div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => onInsert(e.prompt)} icon={<Copy className="w-3 h-3" />}>Insert</Button>
                        <Button variant="secondary" onClick={() => handleDelete(e.id)} icon={<Trash2 className="w-3 h-3" />}>Delete</Button>
                      </div>
                      {(blobUrls.get(e.id) || e.videoUri) && (
                        <a href={blobUrls.get(e.id) || e.videoUri || undefined} target="_blank" rel="noreferrer" className="text-[10px] text-zinc-400 hover:text-white font-mono">Open Video</a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
