/**
 * Live generation text, and the identity of the document that produced it.
 *
 * ⚠️ THE BUG THIS FILE EXISTS TO CLOSE, so it is not reintroduced: a cycle is whole-company
 * (ADR-008), so a single run generates documents belonging to every executive in turn. The
 * live text used to travel as a bare string with no owner, and each executive's tab decided
 * for itself whether it was the one currently generating. All of them said yes — so the COO's,
 * CTO's and CFO's tabs rendered the CGO's document body under their own asset's name, and hid
 * the founder's real saved document behind it for the whole cycle.
 *
 * The class of defect underneath it, worth naming because it appeared three separate times
 * here: A BOOLEAN DERIVED FROM "IS THIS NOT undefined", OVER A VALUE WHOSE EMPTY STATE IS ''.
 * `AssetWorkspaceBody` asked `liveText !== undefined` while the text initialised to `''`, so
 * it was permanently "live"; `AssetWorkspacePanel` asked `Boolean(liveText)` — same value, same
 * render tree, two different answers.
 *
 * Hence: one type that carries its owner, and ONE predicate each for the two questions worth
 * asking. Pure, and unit-tested directly — this repo has no hook-rendering test library, the
 * same convention `shouldAutoResume` and `activeAssetIdFor` already follow.
 */

export interface LiveStream {
  text: string
  /** The Registry asset id this text belongs to, or null if the stream never declared one. */
  assetId: string | null
}

/**
 * May this asset render this stream as its own?
 *
 * Requires a real owner on BOTH sides. A stream with a null assetId is owned by *nothing* — it
 * must never be treated as owned by "whatever happens to look active", which is the inference
 * that caused the leak.
 */
export function streamOwnedBy(stream: LiveStream | null | undefined, assetId: string | null): boolean {
  return Boolean(stream && assetId && stream.assetId === assetId && stream.text.length > 0)
}

/**
 * Is there anything live here at all? For the places where ownership is already established
 * upstream and the only remaining question is whether to show the live view or the saved one.
 * An owned-but-empty stream is NOT live — that distinction is the whole of defect C.
 */
export function isLiveStream(stream: LiveStream | null | undefined): boolean {
  return Boolean(stream && stream.text.length > 0)
}
