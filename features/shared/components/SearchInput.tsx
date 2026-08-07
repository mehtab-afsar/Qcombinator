import { CSSProperties } from 'react';
import { Search, X } from 'lucide-react';
import { bg, bdr, ink, muted } from '@/lib/constants/colors';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: CSSProperties;
}

export function SearchInput({ value, onChange, placeholder = 'Search…', style }: SearchInputProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 10px', borderRadius: 8,
      background: bg, border: `1px solid ${bdr}`,
      ...style,
    }}>
      <Search size={14} color={muted} style={{ flexShrink: 0 }} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1, border: 'none', outline: 'none', background: 'transparent',
          fontSize: 13, color: ink, fontFamily: 'inherit',
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Clear search"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}
        >
          <X size={13} color={muted} />
        </button>
      )}
    </div>
  );
}
