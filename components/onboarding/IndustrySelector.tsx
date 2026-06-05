'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { INDUSTRY_CATEGORIES } from '@/lib/constants/industries'
import { ink, muted, bdr, blue } from '@/lib/constants/colors'

interface IndustrySelectorProps {
  value: string | string[]          // single industry ID or array for multi-select
  onChange: (value: string | string[]) => void
  multi?: boolean                   // allow multiple selections
  placeholder?: string
}

export function IndustrySelector({
  value,
  onChange,
  multi = false,
  placeholder = 'Search industries...',
}: IndustrySelectorProps) {
  const [search, setSearch] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const selectedIds = useMemo(() => {
    return Array.isArray(value) ? value : value ? [value] : []
  }, [value])

  // Filter industries by search term
  const filteredCategories = useMemo(() => {
    if (!search.trim()) {
      return INDUSTRY_CATEGORIES
    }

    const query = search.toLowerCase()
    return INDUSTRY_CATEGORIES
      .map(cat => ({
        ...cat,
        industries: cat.industries.filter(ind =>
          ind.label.toLowerCase().includes(query) ||
          ind.id.toLowerCase().includes(query)
        ),
      }))
      .filter(cat => cat.industries.length > 0)
  }, [search])

  function handleToggle(industryId: string) {
    if (multi) {
      const newValue = selectedIds.includes(industryId)
        ? selectedIds.filter(id => id !== industryId)
        : [...selectedIds, industryId]
      onChange(newValue)
    } else {
      onChange(selectedIds.includes(industryId) ? '' : industryId)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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

      {/* Category tabs (desktop) / Collapsible (mobile) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredCategories.map(category => (
          <div key={category.id}>
            {/* Category header */}
            <button
              onClick={() =>
                setExpandedCategory(
                  expandedCategory === category.id ? null : category.id
                )
              }
              style={{
                width: '100%',
                padding: '10px 0',
                textAlign: 'left',
                border: 'none',
                background: 'none',
                fontSize: 12,
                fontWeight: 600,
                color: muted,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {category.name}
              <span style={{ fontSize: 11 }}>
                {expandedCategory === category.id ? '−' : '+'}
              </span>
            </button>

            {/* Industries grid */}
            {(expandedCategory === category.id || !search) && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 8,
                  marginTop: 8,
                }}
              >
                {category.industries.map(industry => {
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
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
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

            {/* Separator */}
            {category !== filteredCategories[filteredCategories.length - 1] && (
              <div
                style={{
                  height: '1px',
                  background: bdr,
                  margin: '12px 0',
                }}
              />
            )}
          </div>
        ))}

        {/* No results */}
        {filteredCategories.length === 0 && (
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
      </div>

      {/* Selected count (for multi-select) */}
      {multi && selectedIds.length > 0 && (
        <div
          style={{
            padding: '10px 0',
            fontSize: 12,
            color: blue,
            fontWeight: 500,
          }}
        >
          {selectedIds.length} selected
        </div>
      )}
    </div>
  )
}
