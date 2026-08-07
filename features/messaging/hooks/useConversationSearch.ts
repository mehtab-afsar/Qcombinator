"use client";

import { useState } from 'react';

/** Small generic client-side text filter — both messaging pages already fetch
 *  their full lists up front (no pagination), so search is just a filter. */
export function useConversationSearch() {
  const [search, setSearch] = useState('');
  return { search, setSearch };
}
