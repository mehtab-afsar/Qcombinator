/**
 * lib/techcrunch-rss.ts — RSS parsing for the market-signals pipeline (RAG Phase 3).
 *
 * Fixtures below are REAL <item> blocks captured from the live feed on 2026-08-07, not
 * synthesized — this is what actually catches "WordPress changed how it emits RSS" as a test
 * failure instead of a silent prod bug (the parsing-approach tradeoff this file exists to
 * de-risk, since we deliberately didn't take a dependency on a parsing library).
 */

import { parseRssItems } from '@/lib/techcrunch-rss'

// Real item — plain (non-CDATA) title, CDATA description, guid isPermaLink="false" attribute,
// multiple <category> tags that must NOT be read as sector data.
const REAL_ITEM_PLAIN_TITLE = `<item>
		<title>Moove raises $250M to become the backbone of the robotaxi industry</title>
		<link>https://techcrunch.com/2026/08/05/moove-raises-250m-to-become-the-backbone-of-the-robotaxi-industry/</link>

		<dc:creator><![CDATA[Kirsten Korosec]]></dc:creator>
		<pubDate>Wed, 05 Aug 2026 20:50:45 +0000</pubDate>
				<category><![CDATA[Transportation]]></category>
		<category><![CDATA[Venture]]></category>
		<category><![CDATA[Moove]]></category>
		<guid isPermaLink="false">https://techcrunch.com/?p=3150298</guid>

					<description><![CDATA[Moove is scaling up the autonomous vehicle fleet management side of its business and plans to someday own, not just manage, Waymo robotaxis.]]></description>



			</item>`

// Real item — numeric entity (&#8217; = ’) directly inside a plain (non-CDATA) <title>.
const REAL_ITEM_ENTITY_IN_TITLE = `<item>
		<title>Travis Kalanick&#8217;s robotics company raises $1.7B, led by a16z</title>
		<link>https://techcrunch.com/2026/07/22/travis-kalanicks-robotics-company-raises-1-7b-led-by-a16z/</link>

		<dc:creator><![CDATA[Sean O'Kane]]></dc:creator>
		<pubDate>Wed, 22 Jul 2026 18:50:44 +0000</pubDate>
				<category><![CDATA[AI]]></category>
		<category><![CDATA[Transportation]]></category>
		<category><![CDATA[Venture]]></category>
		<guid isPermaLink="false">https://techcrunch.com/?p=3145456</guid>

					<description><![CDATA[Uber is also investing in Travis Kalanick's company Atoms, which has made gauzy claims about using industrial AI to modernize the world. ]]></description>



			</item>`

// Real item — &#038; (=&) INSIDE the guid's URL query string, and a run of consecutive numeric
// entities (&#160; nbsp, &#8217; right-quote, &#8230; ellipsis) in the description.
const REAL_ITEM_ENTITY_IN_GUID_AND_DESC = `<item>
		<title>Lightspeed is building its edge on followers, not just funds</title>
		<link>https://techcrunch.com/video/why-lightspeed-is-going-all-in-on-creator-led-venture-capital/</link>

		<dc:creator><![CDATA[Theresa Loconsolo]]></dc:creator>
		<pubDate>Wed, 05 Aug 2026 20:48:54 +0000</pubDate>
				<category><![CDATA[Social]]></category>
		<category><![CDATA[Venture]]></category>
		<guid isPermaLink="false">https://techcrunch.com/?post_type=tc_video&#038;p=3150410</guid>

					<description><![CDATA[Venture firms are turning to creators to build trust.&#160;It&#8217;s&#160;a trend that&#8217;s been building and&#160;OpenAI&#8217;s acquisition&#160;of TBPN.&#160;Lightspeed&#160;just made its own hire in that vein [&#8230;]]]></description>



			</item>`

function wrapFeed(...items: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Test</title>${items.join('')}</channel></rss>`
}

describe('parseRssItems — real fixtures', () => {
  it('parses a plain-title item, unwraps CDATA description, decodes attribute-carrying guid', () => {
    const [item] = parseRssItems(wrapFeed(REAL_ITEM_PLAIN_TITLE))
    expect(item.title).toBe('Moove raises $250M to become the backbone of the robotaxi industry')
    expect(item.link).toBe('https://techcrunch.com/2026/08/05/moove-raises-250m-to-become-the-backbone-of-the-robotaxi-industry/')
    expect(item.guid).toBe('https://techcrunch.com/?p=3150298')
    expect(item.description).toContain('Waymo robotaxis')
    expect(item.pubDate).toBe('Wed, 05 Aug 2026 20:50:45 +0000')
  })

  it('decodes a numeric entity inside a plain (non-CDATA) title', () => {
    const [item] = parseRssItems(wrapFeed(REAL_ITEM_ENTITY_IN_TITLE))
    expect(item.title).toBe("Travis Kalanick’s robotics company raises $1.7B, led by a16z")
  })

  it('decodes an entity inside the guid itself, and a run of consecutive entities in description', () => {
    const [item] = parseRssItems(wrapFeed(REAL_ITEM_ENTITY_IN_GUID_AND_DESC))
    expect(item.guid).toBe('https://techcrunch.com/?post_type=tc_video&p=3150410')
    expect(item.description).not.toMatch(/&#\d+;/)
    expect(item.description).toContain('It’s a trend')
  })

  it('parses multiple items from one feed, in order', () => {
    const items = parseRssItems(wrapFeed(REAL_ITEM_PLAIN_TITLE, REAL_ITEM_ENTITY_IN_TITLE))
    expect(items).toHaveLength(2)
    expect(items[0].title).toContain('Moove')
    expect(items[1].title).toContain('Kalanick')
  })

  it('ignores <category> tags entirely — they never leak into any parsed field', () => {
    const [item] = parseRssItems(wrapFeed(REAL_ITEM_PLAIN_TITLE))
    expect(Object.keys(item)).toEqual(['title', 'link', 'guid', 'pubDate', 'description'])
  })
})

describe('parseRssItems — synthetic edge cases', () => {
  it('drops an item missing a guid, without throwing, and keeps parsing the rest', () => {
    const noGuid = `<item><title>No Guid Co raises $1M</title><link>https://example.com/a</link><description>x</description></item>`
    const items = parseRssItems(wrapFeed(noGuid, REAL_ITEM_PLAIN_TITLE))
    expect(items).toHaveLength(1)
    expect(items[0].title).toContain('Moove')
  })

  it('drops an item missing a title', () => {
    const noTitle = `<item><link>https://example.com/a</link><guid>g1</guid><description>x</description></item>`
    expect(parseRssItems(wrapFeed(noTitle))).toHaveLength(0)
  })

  it('drops an item missing a link', () => {
    const noLink = `<item><title>x</title><guid>g1</guid><description>x</description></item>`
    expect(parseRssItems(wrapFeed(noLink))).toHaveLength(0)
  })

  it('returns an empty array for a feed with no items, without throwing', () => {
    expect(parseRssItems(wrapFeed())).toEqual([])
  })

  it('defaults description to empty string when the tag is absent, rather than null', () => {
    const noDesc = `<item><title>x</title><link>https://example.com/a</link><guid>g1</guid></item>`
    const [item] = parseRssItems(wrapFeed(noDesc))
    expect(item.description).toBe('')
  })

  it('defaults pubDate to null when the tag is absent', () => {
    const noPub = `<item><title>x</title><link>https://example.com/a</link><guid>g1</guid></item>`
    const [item] = parseRssItems(wrapFeed(noPub))
    expect(item.pubDate).toBeNull()
  })

  it('decodes the 5 XML-predefined entities alongside numeric ones', () => {
    const item = `<item><title>Foo &amp; Bar &lt;raises&gt; &quot;funds&quot; &apos;now&apos;</title><link>https://example.com/a</link><guid>g1</guid></item>`
    const [parsed] = parseRssItems(wrapFeed(item))
    expect(parsed.title).toBe(`Foo & Bar <raises> "funds" 'now'`)
  })
})
