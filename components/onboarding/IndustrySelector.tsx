'use client'

import { useState, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { INDUSTRY_CATEGORIES } from '@/lib/constants/industries'
import { ink, muted, bdr, blue } from '@/lib/constants/colors'

interface IndustrySelectorProps {
  value: string | string[]          // single industry ID or array for multi-select
  onChange: (value: string | string[]) => void
  multi?: boolean                   // allow multiple selections
  placeholder?: string
}

// Flat id -> label lookup across every category, so selected chips can render
// their label even when the search box is empty.
const INDUSTRY_LABELS: Record<string, string> = INDUSTRY_CATEGORIES.reduce(
  (acc, cat) => {
    for (const ind of cat.industries) acc[ind.id] = ind.label
    return acc
  },
  {} as Record<string, string>
)

export function IndustrySelector({
  value,
  onChange,
  multi = false,
  placeholder = 'Search industries...',
}: IndustrySelectorProps) {
  const [search, setSearch] = useState('')

  const selectedIds = useMemo(() => {
    return Array.isArray(value) ? value : value ? [value] : []
  }, [value])

  // Only surface industries once the founder starts typing.
  const matches = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return []
    return INDUSTRY_CATEGORIES.flatMap(cat =>
      cat.industries.filter(
        ind =>
          ind.label.toLowerCase().includes(query) ||
          ind.id.toLowerCase().includes(query)
      )
    )
  }, [search])

  function handleToggle(industryId: string) {
    if (multi) {
      const newValue = selectedIds.includes(industryId)
        ? selectedIds.filter(id => id !== industryId)
        : [...selectedIds, industryId]
      onChange(newValue)
    } else {
      onChange(selectedIds.includes(industryId) ? '' : industryId)
      setSearch('')
    }
  }

  const hasQuery = search.trim().length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Selected chips — always visible so the current pick can be seen/changed */}
      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {selectedIds.map(id => (
            <button
              key={id}
              onClick={() => handleToggle(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 10px 7px 12px',
                borderRadius: 999,
                border: `1.5px solid ${ink}`,
                background: `${ink}08`,
                fontSize: 13,
                fontWeight: 500,
                color: ink,
                cursor: 'pointer',
              }}
            >
              {INDUSTRY_LABELS[id] ?? id}
              <X size={14} color={muted} />
            </button>
          ))}
        </div>
      )}

      {/* Search box */}
      <div style={{ position: 'relative' }}>
        <Search
          size={16}
          color={muted}
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            height: 40,
            paddingLeft: 36,
            paddingRight: 12,
            borderRadius: 8,
            border: `1px solid ${bdr}`,
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = ink
            e.currentTarget.style.boxShadow = `0 0 0 3px rgba(24,22,15,0.08)`
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = bdr
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
      </div>

      {/* Results — only rendered while searching */}
      {hasQuery && matches.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 8,
          }}
        >
          {matches.map(industry => {
            const isSelected = selectedIds.includes(industry.id)
            return (
              <button
                key={industry.id}
                onClick={() => handleToggle(industry.id)}
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: `1.5px solid ${isSelected ? ink : bdr}`,
                  background: isSelected ? `${ink}08` : '#fff',
                  fontSize: 13,
                  fontWeight: 500,
                  color: ink,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = ink
                  ;(e.currentTarget as HTMLElement).style.background =
                    isSelected ? `${ink}12` : `${ink}05`
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLElement).style.borderColor =
                    isSelected ? ink : bdr
                  ;(e.currentTarget as HTMLElement).style.background =
                    isSelected ? `${ink}08` : '#fff'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Radio or checkbox */}
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: multi ? 3 : '50%',
                      border: `1.5px solid ${isSelected ? ink : bdr}`,
                      background: isSelected ? ink : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.15s',
                    }}
                  >
                    {isSelected && (
                      <span
                        style={{
                          width: 2,
                          height: 6,
                          background: '#fff',
                          borderRadius: 1,
                        }}
                      />
                    )}
                  </div>
                  <span>{industry.label}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* No results */}
      {hasQuery && matches.length === 0 && (
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            color: muted,
            fontSize: 13,
          }}
        >
          No industries match &quot;{search}&quot;
        </div>
      )}

      {/* Selected count (for multi-select) */}
      {multi && selectedIds.length > 0 && (
        <div style={{ fontSize: 12, color: blue, fontWeight: 500 }}>
          {selectedIds.length} selected
        </div>
      )}
    </div>
  )
}
