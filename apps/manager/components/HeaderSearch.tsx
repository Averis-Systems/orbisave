'use client'

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search } from 'lucide-react'
import { api } from '@/lib/api'

/**
 * Header search, was a decorative input with a Ctrl K shortcut that focused
 * an empty box and did nothing else. Now debounces into
 * /admin-portal/quick-search/ and renders a real dropdown of groups and
 * members, each linking to a page that actually exists.
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
        .get('/admin-portal/quick-search/', { params: { q: trimmed } })
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
    <div className="relative hidden lg:block" ref={containerRef}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
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
        placeholder="Search groups or members..."
        className="h-14 w-[520px] rounded-xl border border-gray-200 bg-transparent py-2.5 pl-12 pr-16 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#77cc77] focus:outline-none focus:ring-4 focus:ring-[#00ab00]/10 dark:border-gray-800 dark:text-white dark:placeholder:text-gray-500"
      />
      {!showDropdown && (
        <span className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
          Ctrl K
        </span>
      )}

      {showDropdown && (
        <div className="thin-scrollbar absolute left-0 top-[calc(100%+8px)] max-h-[420px] w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-[0_20px_40px_rgba(16,24,40,0.12)] dark:border-gray-800 dark:bg-gray-900">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          ) : results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-gray-400">No groups or members match &quot;{trimmed}&quot;.</p>
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
      <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      {items.map((item, i) => {
        const isActive = offset + i === activeIndex
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
              isActive
                ? 'bg-[#e9f3ed] text-[#00ab00]'
                : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            <span className="truncate font-medium">{item.label}</span>
            <span className="ml-3 shrink-0 truncate text-xs text-gray-400">{item.detail}</span>
          </button>
        )
      })}
    </div>
  )
}
