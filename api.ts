import type { Card, LinkCard, ImageCard, CodeCard, MemoCard, Collection } from './types.ts'

const MODEL = 'claude-sonnet-4-20250514'
const API_URL = 'https://api.anthropic.com/v1/messages'

// ── API 키 관리 ──────────────────────────────────────────
function getApiKey(): string {
  return localStorage.getItem('stash-api-key') ?? ''
}

export function setApiKey(key: string) {
  if (key.trim()) localStorage.setItem('stash-api-key', key.trim())
}

export function hasApiKey(): boolean {
  return !!localStorage.getItem('stash-api-key')
}

export function resetApiKey() {
  localStorage.removeItem('stash-api-key')
}

// ── 공통 Claude 호출 ────────────────────────────────────
async function callClaude(
  messages: Array<{ role: 'user' | 'assistant'; content: string | object[] }>,
  maxTokens = 1024
): Promise<string> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('API 키가 없어요.')

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages }),
  })

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('stash-api-key')
      throw new Error('API 키가 올바르지 않아요. 새로고침 후 다시 입력해주세요.')
    }
    const err = await res.text()
    throw new Error(`API 오류 ${res.status}: ${err}`)
  }

  const data = await res.json() as { content: Array<{ text: string }> }
  return data.content[0]!.text
}

function parseJSON<T>(text: string): T {
  const clean = text.replace(/```json\n?|```\n?/g, '').trim()
  return JSON.parse(clean) as T
}

// ── // 제목 파싱 ────────────────────────────────────────
// 첫 줄이 "// 제목" 형태면 제목으로 추출, 나머지가 본문
export function parseUserTitle(input: string): { title: string | null; body: string } {
  const lines = input.trim().split('\n')
  if (lines.length >= 1 && /^\/\/\s*\S/.test(lines[0]!)) {
    const title = lines[0]!.replace(/^\/\/\s*/, '').trim()
    const body = lines.slice(1).join('\n').trim()
    return { title, body }  // body가 빈 문자열이어도 그대로 반환
  }
  return { title: null, body: input.trim() }
}

// ── 콘텐츠 타입 감지 ─────────────────────────────────────
export function detectInputType(input: string): 'url' | 'code' | 'text' {
  const { body } = parseUserTitle(input)
  const trimmed = body.trim()
  // body가 비었으면 (// 제목만 있는 경우) 메모로 처리
  if (!trimmed) return 'text'
  // 첫 번째 URL이 있으면 링크로 처리 (뒤에 메모가 붙어있어도)
  if (/^https?:\/\//i.test(trimmed) || trimmed.split('\n').some(l => /^https?:\/\//i.test(l.trim()))) return 'url'
  // 코드 패턴 감지 (// 제목 줄은 이미 제거됨)
  const codePatterns = [
    /^(import|export|const|let|var|function|class|def |public |private |#include|from |package )/m,
    /[{};].*\n.*[{};]/s,
    /^\s*(\/\/|#|\/\*|\*)/m,
    /=>\s*[{(]/,
    /\bif\s*\(|\bfor\s*\(|\bwhile\s*\(/,
  ]
  if (codePatterns.some(p => p.test(trimmed))) return 'code'
  return 'text'
}

// ── 언어 감지 (fallback용) ────────────────────────────────
function guessLanguage(code: string): string {
  if (/^\s*</.test(code)) return 'html'
  if (/^(import|export|const|let|var|=>|interface|type )/m.test(code) && /[:?]/.test(code)) return 'typescript'
  if (/^(import|export|const|let|var|=>|function)/m.test(code)) return 'javascript'
  if (/^(def |import |from |class |print\()/m.test(code)) return 'python'
  if (/^(public |private |class |void |int |String )/m.test(code)) return 'java'
  if (/#include|std::|cout/.test(code)) return 'cpp'
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE)/im.test(code)) return 'sql'
  if (/^\s*[.#][\w-]+\s*\{/.test(code)) return 'css'
  if (/^#!/.test(code)) return 'bash'
  return 'plaintext'
}

// ── Fallback: API 없이 카드 생성 ─────────────────────────
async function fallbackLinkCard(url: string): Promise<LinkCard> {
  let host = url
  try { host = new URL(url).hostname.replace(/^www\./, '') } catch {}
  let title = host
  // allorigins.win 프록시로 og:title 시도
  try {
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    const res = await fetch(proxy, { signal: AbortSignal.timeout(4000) })
    if (res.ok) {
      const data = await res.json() as { contents?: string }
      const ogMatch = data.contents?.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
        ?? data.contents?.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)
      const titleMatch = ogMatch ?? data.contents?.match(/<title[^>]*>([^<]+)<\/title>/i)
      if (titleMatch?.[1]) title = titleMatch[1].trim().slice(0, 80)
    }
  } catch { /* 타임아웃 등 무시, host 그대로 사용 */ }
  return {
    id: crypto.randomUUID(), type: 'link',
    url, title, description: '',
    tags: [], collectionIds: [], createdAt: Date.now(),
  }
}

function fallbackMemoCard(text: string): MemoCard {
  const lines = text.trim().split('\n')
  const title = (lines[0] ?? '메모').slice(0, 40)
  return {
    id: crypto.randomUUID(), type: 'memo',
    title, content: text,
    tags: [], collectionIds: [], createdAt: Date.now(),
  }
}

function fallbackCodeCard(code: string): CodeCard {
  const lang = guessLanguage(code)
  const firstLine = code.trim().split('\n')[0] ?? '코드 스니펫'
  const title = firstLine.replace(/^[/#*\s]+/, '').slice(0, 40) || '코드 스니펫'
  return {
    id: crypto.randomUUID(), type: 'code',
    language: lang, title, code,
    tags: [], collectionIds: [], createdAt: Date.now(),
  }
}

function fallbackImageCard(dataUrl: string, filename: string): ImageCard {
  const name = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
  return {
    id: crypto.randomUUID(), type: 'image',
    dataUrl, filename, caption: name,
    tags: [], collectionIds: [], createdAt: Date.now(),
  }
}

// ── 링크 입력 파싱: URL + 선택적 메모 분리 ──────────────
function parseLinkInput(input: string): { url: string; userNote: string } {
  const lines = input.split('\n').map(l => l.trim()).filter(Boolean)
  const urlLine = lines.find(l => /^https?:\/\//i.test(l)) ?? ''
  // URL 줄에서 URL 이후에 공백 있으면 그 뒤가 메모 (예: https://... 이건 나중에 읽기)
  const urlMatch = urlLine.match(/^(https?:\/\/\S+)\s+(.+)$/)
  const url = urlMatch ? urlMatch[1]! : urlLine
  const inlineNote = urlMatch ? urlMatch[2]! : ''
  const otherLines = lines.filter(l => l !== urlLine && !/^\/\//.test(l))
  const userNote = [inlineNote, ...otherLines].filter(Boolean).join('\n')
  return { url, userNote }
}

// ── 기능 1: URL 분석 → 링크 카드 ──────────────────────────
export async function analyzeLinkCard(input: string): Promise<LinkCard> {
  const { title: userTitle, body } = parseUserTitle(input)
  const { url, userNote } = parseLinkInput(body || input)

  if (!hasApiKey()) {
    const card = await fallbackLinkCard(url)
    if (userTitle) card.title = userTitle
    if (userNote) card.description = userNote
    return card
  }

  const noteHint = userNote ? `\n사용자 메모: "${userNote}" — 이 내용을 description에 반영해줘.` : ''
  const prompt = `
다음 URL을 분석해서 카드 정보를 추출해줘.
URL만 보고 유추해도 됨. JSON만 반환해. 다른 말 금지.${noteHint}

{
  "title": "페이지 제목 (30자 이내)",
  "description": "핵심 내용 1~2문장 요약",
  "tags": ["태그1", "태그2", "태그3"]
}

URL: ${url}
  `.trim()

  let result: { title: string; description: string; tags: string[] }
  try {
    const text = await callClaude([{ role: 'user', content: prompt }])
    result = parseJSON<{ title: string; description: string; tags: string[] }>(text)
  } catch {
    const card = await fallbackLinkCard(url)
    if (userTitle) card.title = userTitle
    if (userNote) card.description = userNote
    return card
  }

  return {
    id: crypto.randomUUID(), type: 'link',
    url,
    title: userTitle ?? result.title ?? url,
    description: userNote || (result.description ?? ''),
    tags: result.tags ?? [],
    collectionIds: [], createdAt: Date.now(),
  }
}

// ── 기능 1: 텍스트 → 메모 카드 ───────────────────────────
export async function analyzeMemoCard(input: string): Promise<MemoCard> {
  const { title: userTitle, body } = parseUserTitle(input)
  const content = body || userTitle || input.trim()
  if (!hasApiKey()) {
    const card = fallbackMemoCard(content)
    if (userTitle) card.title = userTitle
    return card
  }

  const prompt = `
다음 텍스트에서 메모 카드 정보를 추출해줘.
JSON만 반환해. 다른 말 금지.

{
  "title": "핵심 제목 (25자 이내)",
  "content": "원문 그대로 또는 적절히 다듬은 내용",
  "tags": ["태그1", "태그2", "태그3"]
}

텍스트: ${content}
  `.trim()

  let result: { title: string; content: string; tags: string[] }
  try {
    const response = await callClaude([{ role: 'user', content: prompt }])
    result = parseJSON<{ title: string; content: string; tags: string[] }>(response)
  } catch {
    const card = fallbackMemoCard(content)
    if (userTitle) card.title = userTitle
    return card
  }

  return {
    id: crypto.randomUUID(), type: 'memo',
    title: userTitle ?? result.title ?? '메모',
    content: result.content ?? content,
    tags: result.tags ?? [],
    collectionIds: [], createdAt: Date.now(),
  }
}

// ── 기능 1: 코드 → 코드 카드 ─────────────────────────────
export async function analyzeCodeCard(input: string): Promise<CodeCard> {
  const { title: userTitle, body } = parseUserTitle(input)
  const code = body
  if (!hasApiKey()) {
    const card = fallbackCodeCard(code)
    if (userTitle) card.title = userTitle
    return card
  }

  const prompt = `
다음 코드를 분석해줘.
JSON만 반환해. 다른 말 금지.

{
  "language": "언어명 (javascript, python, typescript, css, html, sql, bash, etc.)",
  "title": "코드 설명 (25자 이내)",
  "tags": ["태그1", "태그2", "태그3"]
}

코드:
${code.slice(0, 2000)}
  `.trim()

  let result: { language: string; title: string; tags: string[] }
  try {
    const text = await callClaude([{ role: 'user', content: prompt }])
    result = parseJSON<{ language: string; title: string; tags: string[] }>(text)
  } catch {
    const card = fallbackCodeCard(code)
    if (userTitle) card.title = userTitle
    return card
  }

  return {
    id: crypto.randomUUID(), type: 'code',
    language: result.language ?? 'plaintext',
    title: userTitle ?? result.title ?? '코드 스니펫',
    code,
    tags: result.tags ?? [],
    collectionIds: [], createdAt: Date.now(),
  }
}

// ── 기능 1: 이미지 → 이미지 카드 ─────────────────────────
export async function analyzeImageCard(dataUrl: string, filename: string): Promise<ImageCard> {
  if (!hasApiKey()) return fallbackImageCard(dataUrl, filename)

  const [header, data] = dataUrl.split(',') as [string, string]
  const mediaType = (header.match(/data:(.*?);/) ?? [])[1] ?? 'image/jpeg'

  const messages: Array<{ role: 'user'; content: object[] }> = [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
      { type: 'text', text: `이 이미지를 분석해줘. JSON만 반환해. 다른 말 금지.\n\n{\n  "caption": "이미지 설명 (30자 이내)",\n  "tags": ["태그1", "태그2", "태그3"]\n}` },
    ],
  }]

  let result: { caption: string; tags: string[] }
  try {
    const text = await callClaude(messages)
    result = parseJSON<{ caption: string; tags: string[] }>(text)
  } catch {
    return fallbackImageCard(dataUrl, filename)
  }

  return {
    id: crypto.randomUUID(), type: 'image',
    dataUrl, filename,
    caption: result.caption ?? filename,
    tags: result.tags ?? [],
    collectionIds: [], createdAt: Date.now(),
  }
}

// ── 기능 3: 자연어 검색 ───────────────────────────────────
function localSearchCards(query: string, cards: Card[]): string[] {
  const q = query.toLowerCase()
  return cards
    .filter(c => {
      const text = [
        c.type,
        c.tags.join(' '),
        c.type === 'link'  ? `${(c as LinkCard).title} ${(c as LinkCard).description}` : '',
        c.type === 'memo'  ? `${(c as MemoCard).title} ${(c as MemoCard).content}` : '',
        c.type === 'code'  ? `${(c as CodeCard).title} ${(c as CodeCard).language} ${(c as CodeCard).code.slice(0, 200)}` : '',
        c.type === 'image' ? `${(c as ImageCard).caption} ${(c as ImageCard).filename}` : '',
      ].join(' ').toLowerCase()
      return q.split(/\s+/).every(word => text.includes(word))
    })
    .map(c => c.id)
}

export async function searchCards(query: string, cards: Card[]): Promise<string[]> {
  if (!query.trim() || cards.length === 0) return cards.map(c => c.id)

  // API 없으면 단순 텍스트 매칭
  if (!hasApiKey()) {
    return localSearchCards(query, cards)
  }

  const cardList = cards.map(c => {
    if (c.type === 'link') return `id:"${c.id}" 종류:링크 제목:"${(c as LinkCard).title}" 설명:"${(c as LinkCard).description}" 태그:${c.tags.join(',')}`
    if (c.type === 'image') return `id:"${c.id}" 종류:이미지 설명:"${(c as ImageCard).caption}" 태그:${c.tags.join(',')}`
    if (c.type === 'code') return `id:"${c.id}" 종류:코드 언어:${(c as CodeCard).language} 제목:"${(c as CodeCard).title}" 태그:${c.tags.join(',')}`
    return `id:"${c.id}" 종류:메모 제목:"${(c as MemoCard).title}" 내용:"${(c as MemoCard).content.slice(0, 100)}" 태그:${c.tags.join(',')}`
  }).join('\n')

  const prompt = `
검색어: "${query}"

관련 카드 id만 배열로 반환. JSON만. 다른 말 금지.
{ "ids": ["id1", "id2"] }

카드 목록:
${cardList}
  `.trim()

  try {
    const text = await callClaude([{ role: 'user', content: prompt }])
    const result = parseJSON<{ ids: string[] }>(text)
    return result.ids ?? []
  } catch {
    return localSearchCards(query, cards)
  }
}

// ── 기능 4: 컬렉션 자동 추천 ─────────────────────────────
export async function suggestCollections(
  card: Card,
  collections: Collection[]
): Promise<string[]> {
  if (collections.length === 0 || !hasApiKey()) return []

  const cardDesc = card.type === 'link' ? `링크: ${(card as LinkCard).title} / ${card.tags.join(', ')}`
    : card.type === 'image' ? `이미지: ${(card as ImageCard).caption} / ${card.tags.join(', ')}`
    : card.type === 'code' ? `코드: ${(card as CodeCard).title} (${(card as CodeCard).language}) / ${card.tags.join(', ')}`
    : `메모: ${(card as MemoCard).title} / ${card.tags.join(', ')}`

  const collList = collections.map(c => `id:"${c.id}" 이름:"${c.name}"`).join('\n')

  const prompt = `
새 카드: ${cardDesc}

아래 컬렉션 중 이 카드를 넣으면 어울리는 것의 id만 반환.
어울리는 게 없으면 빈 배열. JSON만. 다른 말 금지.
{ "ids": ["id1"] }

컬렉션:
${collList}
  `.trim()

  const text = await callClaude([{ role: 'user', content: prompt }])
  const result = parseJSON<{ ids: string[] }>(text)
  return result.ids ?? []
}
