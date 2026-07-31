'use client'

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search } from 'lucide-react'
import { api } from '@/lib/api'

/**
 * Console header search. Medium-width (not the full-bleed manager box):
 * debounces into /superadmin/quick-search/ and drops down real groups and
 * members from across every country, each linking to a Console list page
 * pre-filtered by the match.
 */

interface SearchResult {
  type: 'group' | 'member'
  id: string
  label: string
  detail: string
  href: string
}

export function HeaderSearch() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState<SearchResult[]>([])
  const [members, setMembers] = useState<SearchResult[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

  const results = [...groups, ...members]
  const trimmed = query.trim()
  const showDropdown = open && trimmed.length >= 2

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleShortcut)
    return () => document.removeEventListener('keydown', handleShortcut)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (trimmed.length < 2) {
      setGroups([])
      setMembers([])
      setLoading(false)
      return
    }
    setLoading(true)
    const handle = setTimeout(() => {
      api
        .get('/admin-portal/superadmin/quick-search/', { params: { q: trimmed } })
        .then((res) => {
          setGroups(res.data.groups || [])
          setMembers(res.data.members || [])
          setActiveIndex(0)
        })
        .catch(() => {
          setGroups([])
          setMembers([])
        })
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(handle)
  }, [trimmed])

  const goTo = (result: SearchResult) => {
    setOpen(false)
    setQuery('')
    router.push(result.href)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (!results.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const result = results[activeIndex]
      if (result) goTo(result)
    }
  }

  return (
    <div className="relative hidden md:block" ref={containerRef}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search groups or members…"
        className="h-10 w-[320px] rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-14 text-sm text-navy placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10"
      />
      {!showDropdown && (
        <span className="pointer-events-none absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-400">
          Ctrl K
        </span>
      )}

      {showDropdown && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-20 max-h-[420px] w-[360px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_40px_rgba(16,24,40,0.12)]">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          ) : results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-400">No groups or members match &quot;{trimmed}&quot;.</p>
          ) : (
            <>
              {groups.length > 0 && (
                <SearchResultGroup label="Groups" items={groups} offset={0} activeIndex={activeIndex} onSelect={goTo} />
              )}
              {members.length > 0 && (
                <SearchResultGroup label="Members" items={members} offset={groups.length} activeIndex={activeIndex} onSelect={goTo} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SearchResultGroup({
  label,
  items,
  offset,
  activeIndex,
  onSelect,
}: {
  label: string
  items: SearchResult[]
  offset: number
  activeIndex: number
  onSelect: (item: SearchResult) => void
}) {
  return (
    <div className="mb-1 last:mb-0">
      <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      {items.map((item, i) => {
        const isActive = offset + i === activeIndex
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
              isActive ? 'bg-[#e9f3ed] text-[#00ab00]' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="truncate font-medium">{item.label}</span>
            <span className="ml-3 shrink-0 truncate text-xs text-slate-400">{item.detail}</span>
          </button>
        )
      })}
    </div>
  )
}
