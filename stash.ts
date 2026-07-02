// ── Stash — AI 개인/공유 보관함 ──────────────────────────────
// Pretext 마소니 데모(pages/demos/masonry)에서 확장.
// prepare() + layout()으로 DOM 없이 카드 높이를 미리 계산하고,
// 가장 짧은 열에 배치하는 Masonry 알고리즘을 사용.
import { prepare, layout } from '../../../src/layout.ts'
import type {
  Card, LinkCard, ImageCard, CodeCard, MemoCard,
  Collection, LayoutCard, SharedProject, CustomCategory,
} from './types.ts'
import {
  detectInputType,
  analyzeLinkCard,
  analyzeMemoCard,
  analyzeCodeCard,
  analyzeImageCard,
  searchCards as apiSearchCards,
  suggestCollections,
} from './api.ts'

// ── 폰트 상수 ──────────────────────────────────────────────
const FONT_TITLE  = '700 15px Inter, -apple-system, sans-serif'
const FONT_BODY   = '13.5px Inter, -apple-system, sans-serif'
const FONT_MEMO_T = '700 15px Inter, -apple-system, sans-serif'
const FONT_MEMO_B = '14px Inter, -apple-system, sans-serif'
const LINE_TITLE  = 21
const LINE_BODY   = 22
const CARD_PAD    = 40

// ── 전역 상태 ────────────────────────────────────────────────
let cards: Card[]             = []
let collections: Collection[] = []
let sharedProjects: SharedProject[] = []
let customCategories: CustomCategory[] = []

// 로그인 사용자 정보
let currentUserId    = ''
let currentUserName  = ''
let currentUserEmail = ''

// 현재 활성 워크스페이스 ('personal' 또는 공유 프로젝트 ID)
let activeProjectId = 'personal'

// 필터/검색/정렬 상태
let filterType: string  = 'all'
let filterTag: string   = ''
let filterCollId: string = ''
let filterCategoryId: string = ''
let searchQuery: string = ''
let sortOrder: 'newest' | 'oldest' = 'newest'

// 모달/배너 상태
let pendingSuggest: { card: Card; collIds: string[] } | null = null
let editingCardId: string | null = null
let pendingInvite: SharedProject | null = null
let deletingCollId: string | null = null

// ── DOM 참조 ────────────────────────────────────────────────
const sidebar           = document.getElementById('sidebar')!
const menuBtn           = document.getElementById('menu-btn')!
const projectBadge      = document.getElementById('project-badge')!
const topbarProjectLabel = document.getElementById('topbar-project-label')!

// 로그인
const loginForm         = document.getElementById('login-form')!
const userProfile       = document.getElementById('user-profile')!
const btnAuthOpen       = document.getElementById('btn-auth-open')!
const btnLogout         = document.getElementById('btn-logout')!
const profileAvatar     = document.getElementById('profile-avatar')!
const profileName       = document.getElementById('profile-name')!
const profileId         = document.getElementById('profile-id')!
const profileEmail      = document.getElementById('profile-email')!

// 인증 모달
const authOverlay       = document.getElementById('auth-overlay')!
const authModalTabs     = document.getElementById('auth-modal-tabs')!
const authModalError    = document.getElementById('auth-modal-error')!
const authLoginForm     = document.getElementById('auth-login-form')!
const authSignupForm    = document.getElementById('auth-signup-form')!
const authLoginEmail    = document.getElementById('auth-login-email') as HTMLInputElement
const authLoginPw       = document.getElementById('auth-login-pw') as HTMLInputElement
const authLoginSubmit   = document.getElementById('auth-login-submit')!
const authSignupName    = document.getElementById('auth-signup-name') as HTMLInputElement
const authSignupId      = document.getElementById('auth-signup-id') as HTMLInputElement
const authSignupEmail   = document.getElementById('auth-signup-email') as HTMLInputElement
const authSignupPw      = document.getElementById('auth-signup-pw') as HTMLInputElement
const authSignupPw2     = document.getElementById('auth-signup-pw2') as HTMLInputElement
const authSignupSubmit  = document.getElementById('auth-signup-submit')!

// 프로젝트 탭
const projectTabs       = document.getElementById('project-tabs')!
const btnNewProject     = document.getElementById('btn-new-project')!
const btnShareProject   = document.getElementById('btn-share-project') as HTMLButtonElement

// 보드 & 필터
const addBtn            = document.getElementById('add-btn')!
const addBtnText        = document.getElementById('add-btn-text')!
const searchInput       = document.getElementById('search-input') as HTMLInputElement
const clearFilterBtn    = document.getElementById('clear-filter')!
const typeFilters       = document.getElementById('type-filters')!
const customCategoryList = document.getElementById('custom-category-list')!
const btnAddCategory    = document.getElementById('btn-add-category')!
const tagList           = document.getElementById('tag-list')!
const collList          = document.getElementById('collection-list')!
const btnNewColl        = document.getElementById('btn-new-collection')!
const statTotal         = document.getElementById('stat-total')!
const statTags          = document.getElementById('stat-tags')!
const statColls         = document.getElementById('stat-colls')!
const board             = document.getElementById('board')!
const emptyState        = document.getElementById('empty-state')!
const exampleBtn        = document.getElementById('example-btn')!
const toast             = document.getElementById('toast')!
const sortBtn           = document.getElementById('sort-btn')!
const exportBtn         = document.getElementById('export-btn')!

// 초대 모달
const inviteOverlay     = document.getElementById('invite-overlay')!
const inviteCopy        = document.getElementById('invite-copy')!
const inviteClose       = document.getElementById('invite-close')!
const inviteDecline     = document.getElementById('invite-decline')!
const inviteAccept      = document.getElementById('invite-accept')!

// 새 카드 모달
const addOverlay        = document.getElementById('add-overlay')!
const addClose          = document.getElementById('add-close')!
const addModalProject   = document.getElementById('add-modal-project')!
const addTitle          = document.getElementById('add-title') as HTMLInputElement
const addContent        = document.getElementById('add-content') as HTMLTextAreaElement
const addImageInput     = document.getElementById('add-image-input') as HTMLInputElement
const addFileLabel      = document.getElementById('add-file-label')!
const addTagsWrap       = document.getElementById('add-tags-wrap')!
const addTagInput       = document.getElementById('add-tag-input') as HTMLInputElement
const addCollectionList = document.getElementById('add-collection-list')!
const addCancel         = document.getElementById('add-cancel')!
const addSave           = document.getElementById('add-save')!

// 편집 모달
const editOverlay       = document.getElementById('edit-overlay')!
const editTypeBadge     = document.getElementById('edit-type-badge')!
const editClose         = document.getElementById('edit-close')!
const editTitleWrap     = document.getElementById('edit-title-wrap')!
const editTitle         = document.getElementById('edit-title') as HTMLInputElement
const editDescWrap      = document.getElementById('edit-desc-wrap')!
const editDesc          = document.getElementById('edit-desc') as HTMLTextAreaElement
const editContentWrap   = document.getElementById('edit-content-wrap')!
const editContent       = document.getElementById('edit-content') as HTMLTextAreaElement
const editCodeWrap      = document.getElementById('edit-code-wrap')!
const editCode          = document.getElementById('edit-code') as HTMLTextAreaElement
const editCaptionWrap   = document.getElementById('edit-caption-wrap')!
const editCaption       = document.getElementById('edit-caption') as HTMLInputElement
const editTagsWrap      = document.getElementById('edit-tags-wrap')!
const editTagInput      = document.getElementById('edit-tag-input') as HTMLInputElement
const editCancel        = document.getElementById('edit-cancel')!
const editSave          = document.getElementById('edit-save')!

// 컬렉션 모달
const modalOverlay      = document.getElementById('modal-overlay')!
const modalNameInput    = document.getElementById('modal-name') as HTMLInputElement
const modalEmoji        = document.getElementById('modal-emoji')!
const modalCancel       = document.getElementById('modal-cancel')!
const modalConfirm      = document.getElementById('modal-confirm')!

// 컬렉션 삭제 확인 모달
const deleteCollOverlay = document.getElementById('delete-coll-overlay')!
const deleteCollMsg     = document.getElementById('delete-coll-msg')!
const deleteCollCancel  = document.getElementById('delete-coll-cancel')!
const deleteCollConfirm = document.getElementById('delete-coll-confirm')!

// 카테고리 모달
const categoryOverlay   = document.getElementById('category-overlay')!
const categoryEmojiBtn  = document.getElementById('category-emoji')!
const categoryNameInput = document.getElementById('category-name') as HTMLInputElement
const categoryCancel    = document.getElementById('category-cancel')!
const categoryConfirm   = document.getElementById('category-confirm')!

// 새 공유 프로젝트 모달
const newProjectOverlay = document.getElementById('new-project-overlay')!
const newProjectName    = document.getElementById('new-project-name') as HTMLInputElement
const newProjectCancel  = document.getElementById('new-project-cancel')!
const newProjectConfirm = document.getElementById('new-project-confirm')!

// 배너
const suggBanner        = document.getElementById('suggestion-banner')!
const suggText          = document.getElementById('suggestion-text')!
const suggAdd           = document.getElementById('suggestion-add')!
const suggDismiss       = document.getElementById('suggestion-dismiss')!

// ── 태그 색상 해시 ──────────────────────────────────────────
function tagColorClass(tag: string): string {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) & 0x7fffffff
  return `tag-c${h % 6}`
}

// ── 도메인 → 그라디언트 ────────────────────────────────────
function domainGradient(domain: string): string {
  const palettes: [string, string][] = [
    ['#1d4ed8', '#3b82f6'], ['#065f46', '#059669'],
    ['#92400e', '#d97706'], ['#6d28d9', '#8b5cf6'],
    ['#9d174d', '#ec4899'], ['#0e7490', '#06b6d4'],
    ['#1e3a5f', '#2563eb'], ['#4d7c0f', '#65a30d'],
  ]
  let h = 0
  for (const ch of domain) h = (h * 31 + ch.charCodeAt(0)) & 0x7fffffff
  const [c1, c2] = palettes[h % palettes.length]!
  return `linear-gradient(135deg, ${c1}, ${c2})`
}

// ── Pretext 카드 높이 계산 ────────────────────────────────
// Masonry 배치 전에 DOM 없이 각 카드의 정확한 높이를 미리 계산.
// pages/demos/masonry/index.ts의 알고리즘을 확장.
function calcCardHeight(card: Card, cardWidth: number): number {
  const inner = cardWidth - CARD_PAD
  switch (card.type) {
    case 'link': {
      const lc = card as LinkCard
      const { height: titleH } = layout(prepare(lc.title, FONT_TITLE), inner, LINE_TITLE)
      const { height: descH  } = layout(prepare(lc.description, FONT_BODY), inner, LINE_BODY)
      const tagsH = lc.tags.length > 0 ? 20 + 12 : 0
      return 24 + 10 + 80 + 11 + titleH + 8 + descH + 12 + tagsH + 27 + 36
    }
    case 'image': {
      const ic = card as ImageCard
      const innerRight = inner - 80 - 12
      const { height: capH } = layout(prepare(ic.caption, FONT_TITLE), innerRight, LINE_TITLE)
      const rightH = capH + 7 + 20 + 7 + 27
      return 24 + 10 + Math.max(80, rightH) + 36
    }
    case 'code': {
      const cc = card as CodeCard
      const displayLines = Math.min(cc.code.split('\n').length, 16)
      return 24 + 10 + 22 + 9 + displayLines * 20 + 24 + 12 + 20 + 12 + 27 + 36
    }
    case 'memo': {
      const mc = card as MemoCard
      const { height: titleH   } = layout(prepare(mc.title, FONT_MEMO_T), inner, LINE_TITLE)
      const { height: contentH } = layout(prepare(mc.content, FONT_MEMO_B), inner, 23)
      return 24 + 10 + titleH + 8 + contentH + 12 + 20 + 12 + 27 + 36
    }
  }
}

// ── Masonry 레이아웃 계산 ────────────────────────────────
// 가장 짧은 열에 다음 카드를 배치 (Pretext prepare/layout 사용)
function computeLayout(visibleCards: Card[]): LayoutCard[] {
  const containerW = board.clientWidth - 56
  const gap = 18
  const colCount = containerW >= 1100 ? 3 : containerW >= 640 ? 2 : 1
  const cardWidth = (containerW - gap * (colCount - 1)) / colCount
  const colHeights = new Array<number>(colCount).fill(0)
  const result: LayoutCard[] = []

  for (const card of visibleCards) {
    let shortest = 0
    for (let i = 1; i < colCount; i++) {
      if (colHeights[i]! < colHeights[shortest]!) shortest = i
    }
    const height = calcCardHeight(card, cardWidth)
    const x = shortest * (cardWidth + gap)
    const y = colHeights[shortest]!
    result.push({ x, y, width: cardWidth, height, card })
    colHeights[shortest]! += height + gap
  }
  return result
}

// ── 가시 카드 필터링 (개인/공유 분리) ───────────────────────
// 개인 공간: ownerId === currentUserId && (!visibility || visibility === 'private')
// 공유 공간: workspaceId === activeProjectId && visibility === 'shared'
async function getVisible(): Promise<Card[]> {
  let visible: Card[]

  if (activeProjectId === 'personal') {
    // 개인 공간: 로그인 사용자의 private 카드만 (또는 레거시 카드)
    visible = cards.filter(c => {
      if (c.visibility === 'shared') return false
      if (c.workspaceId && c.workspaceId !== 'personal') return false
      if (c.ownerId && c.ownerId !== currentUserId) return false
      return true
    })
  } else {
    // 공유 공간: 해당 워크스페이스의 shared 카드만
    visible = cards.filter(c =>
      c.visibility === 'shared' && c.workspaceId === activeProjectId
    )
  }

  if (filterType !== 'all')  visible = visible.filter(c => c.type === filterType)
  if (filterTag)             visible = visible.filter(c => c.tags.includes(filterTag))
  if (filterCategoryId)      visible = visible.filter(c => c.tags.includes(filterCategoryId))
  if (filterCollId) {
    const coll = getProjectCollections().find(c => c.id === filterCollId)
    if (coll) visible = visible.filter(c => coll.cardIds.includes(c.id))
  }
  if (searchQuery.trim()) {
    const ids = await apiSearchCards(searchQuery, visible)
    visible = visible.filter(c => ids.includes(c.id))
  }

  visible.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return sortOrder === 'newest'
      ? b.createdAt - a.createdAt
      : a.createdAt - b.createdAt
  })

  return visible
}

// ── 현재 프로젝트의 컬렉션만 반환 ──────────────────────────
function getProjectCollections(): Collection[] {
  if (activeProjectId === 'personal') {
    return collections.filter(c => !c.projectId || c.projectId === 'personal')
  }
  return collections.filter(c => c.projectId === activeProjectId)
}

// ── 날짜 포맷 ──────────────────────────────────────────────
function fmtDate(ts: number): string {
  const d = new Date(ts)
  const diff = (Date.now() - ts) / 1000
  if (diff < 60)    return '방금 전'
  if (diff < 3600)  return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${d.getMonth()+1}/${d.getDate()}`
}

// ── 카드 DOM 생성 ──────────────────────────────────────────
function createCardEl(lc: LayoutCard): HTMLElement {
  const { card } = lc
  const el = document.createElement('div')
  el.className = `card ${card.type}${card.pinned ? ' pinned' : ''}`
  el.dataset['id'] = card.id
  el.draggable = true
  el.style.cssText = `left:${lc.x}px;top:${lc.y}px;width:${lc.width}px;height:${lc.height}px;`

  const badges: Record<string, string> = {
    link:  '<span class="badge badge-link">🔗 링크</span>',
    image: '<span class="badge badge-image">🖼 이미지</span>',
    code:  '<span class="badge badge-code">⌨ 코드</span>',
    memo:  '<span class="badge badge-memo">📝 메모</span>',
  }
  const sharedBadge = card.visibility === 'shared'
    ? '<span class="badge-shared" title="공유 카드">공유</span>'
    : ''
  const cardTop = `
    <div class="card-top">
      ${badges[card.type] ?? ''}${sharedBadge}
      <div style="display:flex;align-items:center;gap:3px;margin-left:auto">
        <button class="card-action-btn btn-edit" title="편집">✎</button>
        <button class="card-action-btn btn-pin${card.pinned ? ' pinned' : ''}" title="${card.pinned ? '고정 해제' : '고정'}">⊙</button>
        <button class="card-action-btn del card-delete" title="삭제">✕</button>
      </div>
    </div>`

  const tagsHTML = card.tags.map(t =>
    `<span class="tag ${tagColorClass(t)}" data-tag="${t}">${t}</span>`
  ).join('')
  const tagsRow = card.tags.length ? `<div class="card-tags">${tagsHTML}</div>` : ''

  const projColls = getProjectCollections()
  const cardColls = projColls.filter(c => c.cardIds.includes(card.id))
  const collSpans = cardColls.map(c =>
    `<span class="foot-coll" title="${c.name}">${c.emoji}</span>`
  ).join('')

  if (card.type === 'link') {
    const lnk = card as LinkCard
    const domain = (() => { try { return new URL(lnk.url).hostname.replace(/^www\./, '') } catch { return lnk.url } })()
    const gradient = domainGradient(domain)
    el.innerHTML = `
      ${cardTop}
      <div class="link-preview" style="background:${gradient}">
        <span class="link-preview-initial">${domain.slice(0,2).toUpperCase()}</span>
        <div class="link-preview-meta">
          <span class="link-preview-host">${escHtml(domain)}</span>
          <span class="link-preview-scheme">링크</span>
        </div>
      </div>
      <p class="card-title">${escHtml(lnk.title)}</p>
      <p class="link-desc">${escHtml(lnk.description)}</p>
      ${tagsRow}
      <div class="card-foot">
        <div class="foot-left">
          <span class="foot-source">${escHtml(domain)}</span>
          <div class="foot-colls">${collSpans}</div>
        </div>
        <div class="foot-right">
          <span class="foot-date">${fmtDate(card.createdAt)}</span>
          <button class="icon-btn btn-open" title="열기">↗</button>
        </div>
      </div>`
  } else if (card.type === 'image') {
    const img = card as ImageCard
    el.innerHTML = `
      ${cardTop}
      <div class="img-row">
        <div class="img-thumb-wrap"><img class="img-thumb" src="${img.dataUrl}" alt="" /></div>
        <div class="img-body">
          <p class="img-caption">${escHtml(img.caption)}</p>
          ${tagsRow}
          <div class="card-foot">
            <div class="foot-left">
              <span class="foot-source">${escHtml(img.filename)}</span>
              <div class="foot-colls">${collSpans}</div>
            </div>
            <div class="foot-right">
              <button class="icon-btn btn-download" title="다운로드">↓</button>
            </div>
          </div>
        </div>
      </div>`
  } else if (card.type === 'code') {
    const cc = card as CodeCard
    const lines = cc.code.split('\n')
    const displayCode = lines.slice(0, 16).join('\n')
    el.innerHTML = `
      ${cardTop}
      <div class="code-meta">
        <span class="code-lang-pill">${escHtml(cc.language)}</span>
        <span class="code-sub-title">${escHtml(cc.title)}</span>
      </div>
      <div class="code-block">
        <code>${escHtml(displayCode)}</code>
        ${lines.length > 16 ? '<div class="code-fade"></div>' : ''}
      </div>
      ${tagsRow}
      <div class="card-foot">
        <div class="foot-left">
          <span class="foot-date">${fmtDate(card.createdAt)}</span>
          <div class="foot-colls">${collSpans}</div>
        </div>
        <div class="foot-right">
          <button class="icon-btn btn-copy" title="복사">⎘</button>
        </div>
      </div>`
  } else {
    const mc = card as MemoCard
    el.innerHTML = `
      ${cardTop}
      <p class="card-title">${escHtml(mc.title)}</p>
      <p class="memo-content">${escHtml(mc.content)}</p>
      ${tagsRow}
      <div class="card-foot">
        <div class="foot-left">
          <span class="foot-date">${fmtDate(card.createdAt)}</span>
          <div class="foot-colls">${collSpans}</div>
        </div>
      </div>`
  }

  // 카드 이벤트
  el.querySelector('.card-delete')!.addEventListener('click', e => { e.stopPropagation(); deleteCard(card.id) })
  el.querySelector('.btn-pin')!.addEventListener('click', e => { e.stopPropagation(); togglePin(card.id) })
  el.querySelector('.btn-edit')!.addEventListener('click', e => { e.stopPropagation(); openEditModal(card.id) })
  el.querySelectorAll('.tag').forEach(chip =>
    chip.addEventListener('click', e => {
      e.stopPropagation()
      setTagFilter((chip as HTMLElement).dataset['tag']!)
    })
  )
  el.querySelector('.btn-copy')?.addEventListener('click', async e => {
    e.stopPropagation()
    if (card.type !== 'code') return
    await navigator.clipboard.writeText((card as CodeCard).code)
    const btn = el.querySelector('.btn-copy') as HTMLElement
    btn.textContent = '✓'; btn.classList.add('copied')
    setTimeout(() => { btn.textContent = '⎘'; btn.classList.remove('copied') }, 1500)
  })
  el.querySelector('.btn-open')?.addEventListener('click', e => {
    e.stopPropagation()
    if (card.type === 'link') window.open((card as LinkCard).url, '_blank')
  })
  el.querySelector('.btn-download')?.addEventListener('click', e => {
    e.stopPropagation()
    if (card.type !== 'image') return
    const a = document.createElement('a')
    a.href = (card as ImageCard).dataUrl
    a.download = (card as ImageCard).filename
    a.click()
  })
  if (card.type === 'link') {
    el.addEventListener('click', e => {
      if ((e.target as HTMLElement).closest('button, .tag')) return
      window.open((card as LinkCard).url, '_blank')
    })
    el.style.cursor = 'pointer'
  }
  el.addEventListener('dragstart', e => {
    e.dataTransfer!.setData('cardId', card.id)
    e.dataTransfer!.effectAllowed = 'move'
  })
  return el
}

// ── 보드 렌더링 ──────────────────────────────────────────
async function renderBoard() {
  const visible = await getVisible()
  const hasCards = (await getVisible()).length > 0 || cards.length > 0
  const hasVisible = visible.length > 0

  emptyState.classList.toggle('hidden', hasVisible)
  board.classList.toggle('hidden', !hasVisible)

  if (!hasVisible) { board.style.height = '0'; return }

  const layoutCards = computeLayout(visible)
  const maxH = Math.max(...layoutCards.map(c => c.y + c.height), 0)
  board.style.height = `${maxH + 24}px`
  board.querySelectorAll<HTMLElement>('.card, .card-loading').forEach(el => el.remove())
  layoutCards.forEach(lc => board.appendChild(createCardEl(lc)))
}

// ── 사이드바 렌더링 ─────────────────────────────────────
function renderSidebar() {
  // 타입 필터 카운트 (현재 프로젝트 기준)
  const projCards = cards.filter(c => {
    if (activeProjectId === 'personal') {
      return c.visibility !== 'shared' && (!c.workspaceId || c.workspaceId === 'personal') &&
             (!c.ownerId || c.ownerId === currentUserId)
    }
    return c.visibility === 'shared' && c.workspaceId === activeProjectId
  })
  const counts: Record<string, number> = { all: projCards.length, link: 0, image: 0, code: 0, memo: 0 }
  projCards.forEach(c => counts[c.type] = (counts[c.type] ?? 0) + 1)

  typeFilters.querySelectorAll<HTMLElement>('.filter-btn').forEach(btn => {
    const type = btn.dataset['type']!
    const countEl = btn.querySelector('.filter-count')
    if (countEl) countEl.textContent = String(counts[type] ?? 0)
    btn.classList.toggle('active', type === filterType && !filterCategoryId)
  })

  // 사용자 정의 카테고리
  const projCategories = customCategories.filter(c => c.projectId === activeProjectId)
  customCategoryList.innerHTML = projCategories.map(cat =>
    `<div class="filter-btn custom-cat-btn ${cat.id === filterCategoryId ? 'active' : ''}" data-cat-id="${cat.id}">
      <span>${cat.emoji}</span>
      <span class="custom-cat-name">${escHtml(cat.name)}</span>
      <button class="cat-delete-btn" data-cat-id="${cat.id}" title="삭제">✕</button>
    </div>`
  ).join('')
  customCategoryList.querySelectorAll<HTMLElement>('.custom-cat-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      if ((e.target as HTMLElement).classList.contains('cat-delete-btn')) return
      setCategoryFilter(btn.dataset['catId']!)
    })
  })
  customCategoryList.querySelectorAll<HTMLElement>('.cat-delete-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); deleteCategory(btn.dataset['catId']!) })
  })

  // 태그 목록
  const tagCounts = new Map<string, number>()
  projCards.forEach(c => c.tags.forEach(t => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)))
  const sortedTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)
  tagList.innerHTML = sortedTags.length === 0
    ? `<span style="font-size:11px;color:var(--text-3);padding:4px 8px;">태그가 없어요</span>`
    : sortedTags.map(([tag, cnt]) =>
        `<button class="tag-btn ${tag === filterTag ? 'active' : ''}" data-tag="${tag}">
          <span class="tag-name"># ${tag}</span>
          <span class="tag-count">${cnt}</span>
        </button>`
      ).join('')
  tagList.querySelectorAll<HTMLElement>('.tag-btn').forEach(btn =>
    btn.addEventListener('click', () => setTagFilter(btn.dataset['tag']!))
  )

  // 컬렉션 (현재 프로젝트 기준)
  const projColls = getProjectCollections()
  collList.innerHTML = projColls.map(c =>
    `<div class="collection-item ${c.id === filterCollId ? 'active' : ''}" data-id="${c.id}" draggable="false">
      <span class="collection-emoji">${c.emoji}</span>
      <span class="collection-name">${escHtml(c.name)}</span>
      <span class="collection-count">${c.cardIds.length}</span>
      <button class="coll-delete-btn" data-coll-id="${c.id}" title="컬렉션 삭제">✕</button>
    </div>`
  ).join('')
  collList.querySelectorAll<HTMLElement>('.collection-item').forEach(item => {
    const id = item.dataset['id']!
    item.addEventListener('click', e => {
      if ((e.target as HTMLElement).classList.contains('coll-delete-btn')) return
      setCollFilter(id)
    })
    item.addEventListener('dragover', e => { e.preventDefault(); item.classList.add('drag-over') })
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'))
    item.addEventListener('drop', e => {
      e.preventDefault(); item.classList.remove('drag-over')
      const cardId = e.dataTransfer!.getData('cardId')
      if (cardId) addCardToCollection(cardId, id)
    })
  })
  collList.querySelectorAll<HTMLElement>('.coll-delete-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      openDeleteCollectionModal(btn.dataset['collId']!)
    })
  })

  // 통계
  statTotal.textContent = String(projCards.length)
  statTags.textContent  = String(tagCounts.size)
  statColls.textContent = String(projColls.length)

  const hasFilter = filterType !== 'all' || filterTag || filterCollId || searchQuery || filterCategoryId
  clearFilterBtn.classList.toggle('hidden', !hasFilter)

  // 프로젝트 탭
  renderProjectTabs()
  // 새 카드 모달의 컬렉션 목록 갱신
  renderAddCollectionOptions()
}

// ── 해시 (비밀번호 저장용) — crypto.subtle 없는 환경 폴백 포함 ──
async function hashPassword(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const data = new TextEncoder().encode(text)
      const buf  = await crypto.subtle.digest('SHA-256', data)
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
    } catch { /* fall through */ }
  }
  // 폴백: 순수 JS djb2 해시 (crypto.subtle 불가 환경)
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0
  return h.toString(36) + text.length.toString(36)
}

function makeUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

type UserRecord = {id:string;name:string;email:string;passwordHash:string;salt:string;createdAt:number}

function getUsers(): UserRecord[] {
  try { return JSON.parse(localStorage.getItem('stash-users') ?? '[]') } catch { return [] }
}
function saveUsers(users: UserRecord[]) {
  localStorage.setItem('stash-users', JSON.stringify(users))
}
function saveSession(user: {id:string;name:string;email:string}) {
  localStorage.setItem('stash-session', JSON.stringify({
    userId: user.id, userName: user.name, userEmail: user.email,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
  }))
  localStorage.setItem('stash-user-id',    user.id)
  localStorage.setItem('stash-user-name',  user.name)
  localStorage.setItem('stash-user-email', user.email)
}

// ── 로그인 UI ──────────────────────────────────────────────
function renderLoginUI() {
  const loggedIn = isLoggedIn()
  loginForm.classList.toggle('hidden', loggedIn)
  userProfile.classList.toggle('hidden', !loggedIn)
  if (loggedIn) {
    profileAvatar.textContent = currentUserName.charAt(0).toUpperCase() || '?'
    profileName.textContent   = currentUserName
    profileId.textContent     = `@${currentUserId}`
    profileEmail.textContent  = currentUserEmail
  }
}

function isLoggedIn(): boolean {
  return !!currentUserId && !!currentUserName
}

// ── 인증 모달 ──────────────────────────────────────────────
let authCurrentTab = 'login'

function openAuthModal(defaultTab = 'login') {
  authCurrentTab = defaultTab
  authModalError.textContent = ''
  authModalError.classList.remove('show')
  if (authLoginEmail)  authLoginEmail.value  = ''
  if (authLoginPw)     authLoginPw.value     = ''
  if (authSignupName)  authSignupName.value  = ''
  if (authSignupId)    authSignupId.value    = ''
  if (authSignupEmail) authSignupEmail.value = ''
  if (authSignupPw)    authSignupPw.value    = ''
  if (authSignupPw2)   authSignupPw2.value   = ''
  switchAuthTab(defaultTab)
  authOverlay.classList.remove('hidden')
  authOverlay.style.display = 'flex'
  document.body.classList.add('auth-open')
  setTimeout(() => {
    if (defaultTab === 'login') authLoginEmail?.focus()
    else authSignupName?.focus()
  }, 60)
}

function closeAuthModal() {
  authOverlay.classList.add('hidden')
  authOverlay.style.display = 'none'
  document.body.classList.remove('auth-open')
}

function switchAuthTab(tab: string) {
  authCurrentTab = tab
  authModalTabs.querySelectorAll<HTMLElement>('.auth-modal-tab').forEach(t =>
    t.classList.toggle('active', t.dataset['tab'] === tab)
  )
  authLoginForm.classList.toggle('hidden', tab !== 'login')
  authSignupForm.classList.toggle('hidden', tab !== 'signup')
  authModalError.textContent = ''
  authModalError.classList.remove('show')
}

function showAuthError(msg: string) {
  authModalError.textContent = msg
  authModalError.classList.add('show')
}

async function submitLogin() {
  const email = authLoginEmail.value.trim().toLowerCase()
  const pw    = authLoginPw.value
  if (!email || !pw) { showAuthError('이메일과 비밀번호를 입력해주세요'); return }
  const btn = authLoginSubmit as HTMLButtonElement
  btn.disabled = true
  try {
    const users = getUsers()
    const user  = users.find(u => u.email === email)
    if (!user) { showAuthError('등록되지 않은 이메일이에요. 회원가입을 먼저 해주세요'); return }
    const hash = await hashPassword(pw + user.salt)
    if (hash !== user.passwordHash) { showAuthError('비밀번호가 틀렸어요'); return }
    currentUserId = user.id; currentUserName = user.name; currentUserEmail = user.email
    saveSession(user)
    saveData()
    closeAuthModal()
    renderLoginUI(); renderSidebar(); renderBoard()
    showToast(`다시 만나요, ${user.name}님!`)
  } catch (err) {
    console.error('login error:', err)
    showAuthError('로그인 중 오류가 발생했어요. 다시 시도해주세요')
  } finally { btn.disabled = false }
}

async function submitSignup() {
  const name  = authSignupName.value.trim()
  const id    = authSignupId.value.trim().toLowerCase()
  const email = authSignupEmail.value.trim().toLowerCase()
  const pw    = authSignupPw.value
  const pw2   = authSignupPw2.value
  if (!name)  { showAuthError('이름을 입력해주세요'); return }
  if (!id || !/^[a-z0-9_]{2,20}$/.test(id)) { showAuthError('아이디는 영문 소문자·숫자·밑줄 2~20자로 입력해주세요'); return }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showAuthError('이메일 형식이 올바르지 않아요'); return }
  if (pw.length < 8) { showAuthError('비밀번호는 8자 이상이어야 해요'); return }
  if (pw !== pw2)    { showAuthError('비밀번호가 일치하지 않아요'); return }
  const btn = authSignupSubmit as HTMLButtonElement
  btn.disabled = true
  try {
    const users = getUsers()
    if (users.some(u => u.email === email)) { showAuthError('이미 사용 중인 이메일이에요'); return }
    if (users.some(u => u.id === id))       { showAuthError('이미 사용 중인 아이디예요'); return }
    const salt = makeUUID()
    const hash = await hashPassword(pw + salt)
    const user: UserRecord = { id, name, email, passwordHash: hash, salt, createdAt: Date.now() }
    users.push(user); saveUsers(users)
    currentUserId = id; currentUserName = name; currentUserEmail = email
    saveSession(user)
    saveData()
    closeAuthModal()
    renderLoginUI(); renderSidebar(); renderBoard()
    showToast(`환영해요, ${name}님! 🎉`)
  } catch (err) {
    console.error('signup error:', err)
    showAuthError('가입 중 오류가 발생했어요. 다시 시도해주세요')
  } finally { btn.disabled = false }
}

function logoutUser() {
  currentUserName = ''; currentUserId = ''; currentUserEmail = ''
  activeProjectId = 'personal'
  localStorage.removeItem('stash-session')
  localStorage.removeItem('stash-user-id')
  localStorage.removeItem('stash-user-name')
  localStorage.removeItem('stash-user-email')
  renderLoginUI(); renderSidebar(); renderBoard()
  authOverlay.classList.remove('hidden')
  authOverlay.style.display = 'flex'
  document.body.classList.add('auth-open')
  showToast('로그아웃됐어요')
}

// 로그인이 필요한 기능 게이트
function requireLogin(): boolean {
  if (isLoggedIn()) return true
  openAuthModal('login')
  return false
}

// ── 프로젝트 탭 렌더링 ────────────────────────────────────
function renderProjectTabs() {
  const items = [
    `<button class="project-tab ${activeProjectId === 'personal' ? 'active' : ''}" data-project-id="personal">
      <span class="project-tab-icon">🔒</span>
      <span class="project-tab-name">개인 공간</span>
    </button>`,
    ...sharedProjects.map(p =>
      `<button class="project-tab ${p.id === activeProjectId ? 'active' : ''}" data-project-id="${p.id}">
        <span class="project-tab-icon">🤝</span>
        <span class="project-tab-name">${escHtml(p.name)}</span>
      </button>`
    ),
  ]
  projectTabs.innerHTML = items.join('')
  projectTabs.querySelectorAll<HTMLElement>('.project-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const pid = tab.dataset['projectId']!
      if (pid !== 'personal' && !requireLogin()) return
      switchProject(pid)
    })
  })
  btnShareProject.disabled = activeProjectId === 'personal'
  const name = activeProjectId === 'personal'
    ? '개인 공간'
    : (sharedProjects.find(p => p.id === activeProjectId)?.name ?? '공유 프로젝트')
  projectBadge.textContent = activeProjectId === 'personal' ? '개인' : '공유'
  projectBadge.className = activeProjectId === 'personal' ? 'logo-badge' : 'logo-badge shared'
  topbarProjectLabel.textContent = name
}

function switchProject(id: string) {
  activeProjectId = id
  filterType = 'all'; filterTag = ''; filterCollId = ''; filterCategoryId = ''; searchQuery = ''
  searchInput.value = ''
  updateUrlForProject()
  saveData()
  renderSidebar()
  renderBoard()
}

// ── URL에 workspaceId 반영 ────────────────────────────────
// 공유 프로젝트로 이동 시 ?workspaceId=xxx 가 URL에 표시됨.
// 새로고침해도 해당 프로젝트로 바로 접근 가능.
function updateUrlForProject() {
  const url = new URL(location.href)
  if (activeProjectId === 'personal') {
    url.searchParams.delete('workspaceId')
  } else {
    url.searchParams.set('workspaceId', activeProjectId)
  }
  history.replaceState(null, '', url.toString())
}

// 공유 프로젝트 생성
function createSharedProject(name: string) {
  if (!requireLogin()) return
  if (!name.trim()) return
  const project: SharedProject = {
    id: makeUUID(),
    name: name.trim(),
    ownerName: currentUserName,
    ownerEmail: currentUserEmail,
    ownerUserId: currentUserId,
    memberNames: [currentUserName],
    memberEmails: [currentUserEmail],
    memberUserIds: [currentUserId],
    inviteToken: makeUUID(),
    createdAt: Date.now(),
  }
  sharedProjects.unshift(project)
  activeProjectId = project.id
  saveData()
  updateUrlForProject()
  renderSidebar()
  renderBoard()
  showToast(`"${name}" 공유 프로젝트를 만들었어요`)
}

// 초대 링크 생성 (?workspaceId + &invite=encoded)
async function copyProjectInviteLink() {
  if (!requireLogin()) return
  const project = sharedProjects.find(p => p.id === activeProjectId)
  if (!project) { showToast('공유 프로젝트를 먼저 선택하세요'); return }
  const url = new URL(location.href)
  url.searchParams.set('workspaceId', project.id)
  url.searchParams.set('invite', encodeURIComponent(JSON.stringify({
    id: project.id, name: project.name,
    ownerName: project.ownerName, ownerEmail: project.ownerEmail,
    ownerUserId: project.ownerUserId,
    inviteToken: project.inviteToken, createdAt: project.createdAt,
  })))
  await navigator.clipboard.writeText(url.toString())
  showToast('초대 링크를 복사했어요')
}

// URL 파라미터 처리 (페이지 로드 시)
function checkUrlParams() {
  const params = new URLSearchParams(location.search)
  const workspaceId = params.get('workspaceId')
  const inviteRaw   = params.get('invite')

  // 초대 처리
  if (inviteRaw) {
    try {
      const data = JSON.parse(decodeURIComponent(inviteRaw)) as Partial<SharedProject>
      if (data.id && data.name && data.inviteToken) {
        // 이미 참여한 프로젝트면 바로 이동
        if (sharedProjects.some(p => p.id === data.id)) {
          activeProjectId = data.id!
          history.replaceState(null, '', `?workspaceId=${data.id}`)
          return
        }
        pendingInvite = {
          id: data.id!, name: data.name!, ownerName: data.ownerName ?? '',
          ownerEmail: data.ownerEmail ?? '', ownerUserId: data.ownerUserId ?? '',
          inviteToken: data.inviteToken!, memberNames: [data.ownerName ?? ''],
          memberEmails: data.ownerEmail ? [data.ownerEmail] : [],
          memberUserIds: data.ownerUserId ? [data.ownerUserId] : [],
          createdAt: data.createdAt ?? Date.now(),
        }
        inviteCopy.textContent =
          `"${pendingInvite.name}" 프로젝트 초대입니다 (${pendingInvite.ownerName}님이 초대). 수락하면 공유 공간에 참여해요.`
        inviteOverlay.classList.add('open')
        return
      }
    } catch { /* 잘못된 초대 링크 */ }
  }

  // workspaceId만 있는 경우 — 이미 멤버면 이동, 아니면 안내
  if (workspaceId && workspaceId !== 'personal') {
    if (sharedProjects.some(p => p.id === workspaceId)) {
      activeProjectId = workspaceId
    } else {
      showToast('존재하지 않는 공유 프로젝트입니다')
      history.replaceState(null, '', location.pathname)
    }
  }
}

function acceptInvite() {
  if (!pendingInvite) return
  if (!requireLogin()) return
  const project: SharedProject = {
    ...pendingInvite,
    memberNames: [...new Set([...pendingInvite.memberNames, currentUserName])],
    memberEmails: [...new Set([...pendingInvite.memberEmails, currentUserEmail])],
    memberUserIds: [...new Set([...pendingInvite.memberUserIds, currentUserId])],
  }
  if (!sharedProjects.some(p => p.id === project.id)) {
    sharedProjects.unshift(project)
  }
  activeProjectId = project.id
  saveData()
  closeInviteModal()
  renderSidebar()
  renderBoard()
  updateUrlForProject()
  showToast(`"${project.name}" 프로젝트에 참여했어요`)
}

function closeInviteModal() {
  inviteOverlay.classList.remove('open')
  pendingInvite = null
  history.replaceState(null, '', location.pathname)
}

// ── 새 카드 모달 ───────────────────────────────────────────
let addTags: string[] = []

function renderAddTags() {
  addTagsWrap.querySelectorAll('.tag').forEach(el => el.remove())
  addTags.forEach(tag => {
    const chip = document.createElement('span')
    chip.className = `tag ${tagColorClass(tag)}`
    chip.innerHTML = `${escHtml(tag)}<button class="tag-remove" data-tag="${escHtml(tag)}">✕</button>`
    addTagsWrap.insertBefore(chip, addTagInput)
  })
  addTagsWrap.querySelectorAll<HTMLElement>('.tag-remove').forEach(btn =>
    btn.addEventListener('click', () => {
      addTags = addTags.filter(t => t !== btn.dataset['tag'])
      renderAddTags()
    })
  )
}

function renderAddCollectionOptions() {
  const projColls = getProjectCollections()
  addCollectionList.innerHTML = projColls.length === 0
    ? '<span class="add-collection-empty">컬렉션 없음</span>'
    : projColls.map(c =>
        `<label class="add-collection-option">
          <input type="checkbox" value="${escHtml(c.id)}" />
          <span>${c.emoji}</span>
          <span class="add-coll-name">${escHtml(c.name)}</span>
        </label>`
      ).join('')
}

function openAddModal() {
  if (!requireLogin()) return
  addTitle.value = ''; addContent.value = ''
  addImageInput.value = ''; addFileLabel.textContent = '이미지 선택'
  addTags = []
  renderAddTags()
  renderAddCollectionOptions()
  addModalProject.textContent = activeProjectId === 'personal'
    ? '🔒 개인 공간'
    : `🤝 ${sharedProjects.find(p => p.id === activeProjectId)?.name ?? '공유 프로젝트'}`
  addOverlay.classList.add('open')
  setTimeout(() => addTitle.focus(), 60)
}

function closeAddModal() { addOverlay.classList.remove('open') }

async function saveAddModal() {
  const title    = addTitle.value.trim()
  const content  = addContent.value.trim()
  const imageFile = addImageInput.files?.[0] ?? null
  const collIds  = Array.from(
    addCollectionList.querySelectorAll<HTMLInputElement>('input:checked')
  ).map(i => i.value)

  if (!title && !content && !imageFile) {
    showToast('제목, 내용, 사진 중 하나는 넣어주세요'); return
  }

  addSave.toggleAttribute('disabled', true)
  try {
    let card: Card
    if (imageFile) {
      const dataUrl = await readFileAsDataURL(imageFile)
      card = {
        id: makeUUID(), type: 'image',
        dataUrl, filename: imageFile.name,
        caption: title || content || imageFile.name,
        tags: [...addTags], collectionIds: [], createdAt: Date.now(),
      }
    } else {
      const urlMatch = content.match(/https?:\/\/\S+/i)
      if (urlMatch) {
        const url = urlMatch[0]!
        card = {
          id: makeUUID(), type: 'link',
          url, title: title || (() => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url } })(),
          description: content.replace(url, '').trim(),
          tags: [...addTags], collectionIds: [], createdAt: Date.now(),
        }
      } else if (detectInputType(content) === 'code') {
        card = {
          id: makeUUID(), type: 'code',
          language: 'plaintext', title: title || '코드 스니펫', code: content,
          tags: [...addTags], collectionIds: [], createdAt: Date.now(),
        }
      } else {
        card = {
          id: makeUUID(), type: 'memo',
          title: title || content.split('\n')[0]?.slice(0, 40) || '메모',
          content,
          tags: [...addTags], collectionIds: [], createdAt: Date.now(),
        }
      }
    }

    // ── 카드에 소유권 + 가시성 + 워크스페이스 정보 부여 ──────
    card.ownerId    = currentUserId
    card.visibility = activeProjectId === 'personal' ? 'private' : 'shared'
    card.workspaceId = activeProjectId === 'personal' ? undefined : activeProjectId

    // 컬렉션에 연결
    card.collectionIds = [...collIds]
    collections.forEach(coll => {
      coll.cardIds = coll.cardIds.filter(id => id !== card.id)
      if (collIds.includes(coll.id)) coll.cardIds.push(card.id)
    })

    cards.unshift(card)
    saveData()
    closeAddModal()
    renderSidebar()
    await renderBoard()
    showToast('✦ 카드가 추가됐어요')
    triggerSuggestCollections(card)
  } finally {
    addSave.toggleAttribute('disabled', false)
  }
}

// ── 핀 토글 ────────────────────────────────────────────────
async function togglePin(id: string) {
  const card = cards.find(c => c.id === id)
  if (!card) return
  card.pinned = !card.pinned
  saveData()
  await renderBoard()
  showToast(card.pinned ? '📌 고정됐어요' : '고정 해제됐어요')
}

// ── 편집 모달 ──────────────────────────────────────────────
let editTags: string[] = []

function openEditModal(id: string) {
  const card = cards.find(c => c.id === id)
  if (!card) return
  editingCardId = id
  const typeLabel: Record<string, string> = { link: '🔗 링크', image: '🖼 이미지', code: '⌨ 코드', memo: '📝 메모' }
  editTypeBadge.textContent = typeLabel[card.type] ?? card.type
  editTitleWrap.classList.toggle('hidden', card.type === 'image')
  editDescWrap.classList.toggle('hidden', card.type !== 'link')
  editContentWrap.classList.toggle('hidden', card.type !== 'memo')
  editCodeWrap.classList.toggle('hidden', card.type !== 'code')
  editCaptionWrap.classList.toggle('hidden', card.type !== 'image')
  if      (card.type === 'link')  { editTitle.value = (card as LinkCard).title; editDesc.value = (card as LinkCard).description }
  else if (card.type === 'memo')  { editTitle.value = (card as MemoCard).title; editContent.value = (card as MemoCard).content }
  else if (card.type === 'code')  { editTitle.value = (card as CodeCard).title; editCode.value = (card as CodeCard).code }
  else if (card.type === 'image') { editCaption.value = (card as ImageCard).caption }
  editTags = [...card.tags]
  renderEditTags()
  editTagInput.value = ''
  editOverlay.classList.add('open')
  setTimeout(() => (editOverlay.querySelector('input:not(.edit-tag-input), textarea') as HTMLElement)?.focus(), 60)
}

function renderEditTags() {
  editTagsWrap.querySelectorAll('.tag').forEach(el => el.remove())
  editTags.forEach(tag => {
    const chip = document.createElement('span')
    chip.className = `tag ${tagColorClass(tag)}`
    chip.innerHTML = `${escHtml(tag)}<button class="tag-remove" data-tag="${escHtml(tag)}">✕</button>`
    editTagsWrap.insertBefore(chip, editTagInput)
  })
  editTagsWrap.querySelectorAll<HTMLElement>('.tag-remove').forEach(btn =>
    btn.addEventListener('click', () => {
      editTags = editTags.filter(t => t !== btn.dataset['tag'])
      renderEditTags()
    })
  )
}

function saveEditModal() {
  if (!editingCardId) return
  const card = cards.find(c => c.id === editingCardId)
  if (!card) return
  if      (card.type === 'link')  { (card as LinkCard).title = editTitle.value.trim() || (card as LinkCard).title; (card as LinkCard).description = editDesc.value.trim() }
  else if (card.type === 'memo')  { (card as MemoCard).title = editTitle.value.trim() || (card as MemoCard).title; (card as MemoCard).content = editContent.value.trim() }
  else if (card.type === 'code')  { (card as CodeCard).title = editTitle.value.trim() || (card as CodeCard).title; (card as CodeCard).code = editCode.value }
  else if (card.type === 'image') { (card as ImageCard).caption = editCaption.value.trim() || (card as ImageCard).caption }
  card.tags = [...editTags]
  saveData()
  closeEditModal()
  renderSidebar()
  renderBoard()
  showToast('✦ 수정됐어요')
}

function closeEditModal() { editOverlay.classList.remove('open'); editingCardId = null }

// ── 카드 삭제 ──────────────────────────────────────────────
async function deleteCard(id: string) {
  cards = cards.filter(c => c.id !== id)
  collections = collections.map(c => ({ ...c, cardIds: c.cardIds.filter(cid => cid !== id) }))
  saveData(); renderSidebar(); await renderBoard()
  showToast('카드를 삭제했어요')
}

// ── 컬렉션 관리 ───────────────────────────────────────────
let currentEmoji = '📁'

function openNewCollectionModal() {
  if (!isLoggedIn()) { showToast('로그인이 필요합니다'); return }
  currentEmoji = '📁'
  modalEmoji.textContent = currentEmoji
  modalNameInput.value = ''
  modalOverlay.classList.add('open')
  setTimeout(() => modalNameInput.focus(), 50)
}

function closeCollModal() { modalOverlay.classList.remove('open') }

function createCollection(name: string, emoji: string) {
  if (!name.trim()) return
  const coll: Collection = {
    id: makeUUID(), name: name.trim(), emoji, cardIds: [],
    projectId: activeProjectId,  // 현재 프로젝트에 귀속
    ownerId: currentUserId,
  }
  collections.push(coll)
  saveData(); renderSidebar()
  showToast(`"${name}" 컬렉션이 만들어졌어요`)
}

function addCardToCollection(cardId: string, collId: string) {
  const coll = collections.find(c => c.id === collId)
  if (!coll || coll.cardIds.includes(cardId)) return
  coll.cardIds.push(cardId)
  saveData(); renderSidebar(); renderBoard()
  showToast('컬렉션에 추가했어요')
}

// 컬렉션 삭제 확인 모달
function openDeleteCollectionModal(collId: string) {
  const coll = collections.find(c => c.id === collId)
  if (!coll) return
  deletingCollId = collId
  deleteCollMsg.textContent = `"${coll.name}" 컬렉션을 삭제하면 안에 있는 카드들은 컬렉션에서 빠져나오지만 삭제되지는 않아요.`
  deleteCollOverlay.classList.add('open')
}

function closeDeleteCollModal() { deleteCollOverlay.classList.remove('open'); deletingCollId = null }

function confirmDeleteCollection() {
  if (!deletingCollId) return
  collections = collections.filter(c => c.id !== deletingCollId)
  saveData(); renderSidebar(); renderBoard()
  closeDeleteCollModal()
  showToast('컬렉션이 삭제됐어요')
}

// ── 카테고리 관리 ─────────────────────────────────────────
let categoryCurrentEmoji = '🏷'

function openCategoryModal() {
  if (!isLoggedIn()) { showToast('로그인이 필요합니다'); return }
  categoryCurrentEmoji = '🏷'
  categoryEmojiBtn.textContent = categoryCurrentEmoji
  categoryNameInput.value = ''
  categoryOverlay.classList.add('open')
  setTimeout(() => categoryNameInput.focus(), 50)
}

function closeCategoryModal() { categoryOverlay.classList.remove('open') }

function createCategory(name: string, emoji: string) {
  if (!name.trim()) return
  const projectCats = customCategories.filter(c => c.projectId === activeProjectId)
  if (projectCats.length >= 10) { showToast('카테고리는 최대 10개까지 만들 수 있어요'); return }
  const cat: CustomCategory = {
    id: makeUUID(), name: name.trim(), emoji,
    projectId: activeProjectId, ownerId: currentUserId,
  }
  customCategories.push(cat)
  saveData(); renderSidebar()
  showToast(`"${name}" 카테고리가 추가됐어요`)
}

function deleteCategory(id: string) {
  customCategories = customCategories.filter(c => c.id !== id)
  if (filterCategoryId === id) filterCategoryId = ''
  saveData(); renderSidebar(); renderBoard()
}

function setCategoryFilter(id: string) {
  filterCategoryId = filterCategoryId === id ? '' : id
  filterType = 'all'
  renderSidebar(); renderBoard()
}

// ── 필터 ──────────────────────────────────────────────────
function setTypeFilter(type: string) {
  filterType = type; filterCategoryId = ''
  renderSidebar(); renderBoard()
}

function setTagFilter(tag: string) {
  filterTag = filterTag === tag ? '' : tag
  renderSidebar(); renderBoard()
}

function setCollFilter(id: string) {
  filterCollId = filterCollId === id ? '' : id
  renderSidebar(); renderBoard()
}

function clearFilters() {
  filterType = 'all'; filterTag = ''; filterCollId = ''; filterCategoryId = ''; searchQuery = ''
  searchInput.value = ''
  renderSidebar(); renderBoard()
}

// ── 정렬 ──────────────────────────────────────────────────
function toggleSort() {
  sortOrder = sortOrder === 'newest' ? 'oldest' : 'newest'
  sortBtn.classList.toggle('active', sortOrder === 'oldest')
  sortBtn.title = sortOrder === 'newest' ? '최신순' : '오래된순'
  renderBoard()
  showToast(sortOrder === 'newest' ? '최신순' : '오래된순')
}

// ── 마크다운 내보내기 ─────────────────────────────────────
async function exportMarkdown() {
  const visible = await getVisible()
  if (visible.length === 0) { showToast('내보낼 카드가 없어요'); return }
  const lines = ['# Stash 내보내기', `> ${new Date().toLocaleDateString('ko-KR')} 기준 ${visible.length}개 카드\n`]
  for (const card of visible) {
    if (card.type === 'link') {
      const lc = card as LinkCard
      lines.push(`## 🔗 ${lc.title}`, `- URL: <${lc.url}>`)
      if (lc.description) lines.push(`- 설명: ${lc.description}`)
    } else if (card.type === 'memo') {
      const mc = card as MemoCard
      lines.push(`## 📝 ${mc.title}`, mc.content)
    } else if (card.type === 'code') {
      const cc = card as CodeCard
      lines.push(`## ⌨ ${cc.title}`, `\`\`\`${cc.language}\n${cc.code}\n\`\`\``)
    } else if (card.type === 'image') {
      lines.push(`## 🖼 ${(card as ImageCard).caption}`, `- 파일명: ${(card as ImageCard).filename}`)
    }
    if (card.tags.length) lines.push(`- 태그: ${card.tags.map(t => `\`${t}\``).join(' ')}`)
    lines.push('')
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `stash-${new Date().toISOString().slice(0,10)}.md`
  a.click()
  URL.revokeObjectURL(a.href)
  showToast(`✦ ${visible.length}개 카드 내보냈어요`)
}

// ── AI 컬렉션 추천 ────────────────────────────────────────
async function triggerSuggestCollections(card: Card) {
  const projColls = getProjectCollections()
  if (projColls.length === 0) return
  try {
    const ids = await suggestCollections(card, projColls)
    if (ids.length === 0) return
    pendingSuggest = { card, collIds: ids }
    suggText.textContent = `"${projColls.find(c => c.id === ids[0])?.name}" 컬렉션에 추가할까요?`
    suggBanner.classList.add('show')
    setTimeout(() => { suggBanner.classList.remove('show'); pendingSuggest = null }, 8000)
  } catch { /* 무시 */ }
}

// ── 저장/로드 ────────────────────────────────────────────
function saveData() {
  try {
    localStorage.setItem('stash-cards',       JSON.stringify(cards))
    localStorage.setItem('stash-collections', JSON.stringify(collections))
    localStorage.setItem('stash-projects',    JSON.stringify(sharedProjects))
    localStorage.setItem('stash-categories',  JSON.stringify(customCategories))
    localStorage.setItem('stash-user-id',     currentUserId)
    localStorage.setItem('stash-user-name',   currentUserName)
    localStorage.setItem('stash-user-email',  currentUserEmail)
    localStorage.setItem('stash-active-project', activeProjectId)
  } catch { /* 용량 초과 등 무시 */ }
}

function loadData() {
  try {
    cards             = JSON.parse(localStorage.getItem('stash-cards')       ?? '[]') as Card[]
    collections       = JSON.parse(localStorage.getItem('stash-collections') ?? '[]') as Collection[]
    sharedProjects    = JSON.parse(localStorage.getItem('stash-projects')    ?? '[]') as SharedProject[]
    customCategories  = JSON.parse(localStorage.getItem('stash-categories')  ?? '[]') as CustomCategory[]
    // 인증 상태는 세션 체크에서만 설정 — 여기서 덮어쓰지 않음
    activeProjectId   = localStorage.getItem('stash-active-project') ?? 'personal'
    // 마이그레이션: ownerUserId 없는 레거시 프로젝트 보완
    sharedProjects = sharedProjects.map(p => ({
      ...p,
      ownerUserId:    p.ownerUserId   ?? '',
      memberUserIds:  p.memberUserIds ?? [],
    }))
    // 유효하지 않은 activeProjectId 복원
    if (activeProjectId !== 'personal' && !sharedProjects.some(p => p.id === activeProjectId)) {
      activeProjectId = 'personal'
    }
    if (activeProjectId !== 'personal' && !isLoggedIn()) {
      activeProjectId = 'personal'
    }
  } catch { cards = []; collections = [] }
}

// ── 유틸 ──────────────────────────────────────────────────
function escHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('파일 읽기 실패'))
    reader.readAsDataURL(file)
  })
}

let toastTimer: ReturnType<typeof setTimeout>
function showToast(msg: string) {
  clearTimeout(toastTimer)
  toast.textContent = msg
  toast.classList.add('show')
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500)
}

// ── 예시 카드 ────────────────────────────────────────────
async function addExampleCards() {
  const examples: Card[] = [
    {
      id: makeUUID(), type: 'link',
      url: 'https://github.com/chenglou/pretext',
      title: 'Pretext — DOM-free 텍스트 레이아웃',
      description: 'Canvas/DOM 없이 순수 JS로 정확한 텍스트 높이를 계산하는 라이브러리.',
      tags: ['텍스트', '레이아웃', '오픈소스'],
      collectionIds: [], createdAt: Date.now() - 86400000 * 2,
      ownerId: currentUserId, visibility: 'private',
    },
    {
      id: makeUUID(), type: 'memo',
      title: 'Masonry 레이아웃 핵심 원리',
      content: '가장 짧은 열에 다음 카드를 배치. Pretext의 prepare() + layout()으로 DOM reflow 없이 높이 미리 계산.',
      tags: ['레이아웃', 'CSS', '알고리즘'],
      collectionIds: [], createdAt: Date.now() - 86400000,
      ownerId: currentUserId, visibility: 'private',
    },
    {
      id: makeUUID(), type: 'code',
      language: 'typescript',
      title: 'Masonry 높이 계산 예시',
      code: `import { prepare, layout } from '@chenglou/pretext'\n\nfunction calcHeight(text: string, width: number): number {\n  const prepared = prepare(text, '14px Inter, sans-serif')\n  const { height } = layout(prepared, width, 20)\n  return height + 32\n}`,
      tags: ['Pretext', 'TypeScript', 'Masonry'],
      collectionIds: [], createdAt: Date.now() - 3600000,
      ownerId: currentUserId, visibility: 'private',
    },
  ]
  const coll: Collection = {
    id: makeUUID(), name: 'Pretext 프로젝트', emoji: '⚡',
    cardIds: examples.map(e => e.id),
    projectId: 'personal', ownerId: currentUserId,
  }
  examples.forEach(e => { e.collectionIds = [coll.id] })
  cards = [...examples, ...cards]
  collections = [coll, ...collections]
  saveData(); renderSidebar(); await renderBoard()
  showToast('예시 카드 3개가 추가됐어요!')
}

// ── 이벤트 바인딩 ──────────────────────────────────────────

// ── 인증 이벤트 ─────────────────────────────────────────
btnAuthOpen?.addEventListener('click', () => openAuthModal('login'))
btnLogout?.addEventListener('click', logoutUser)
authModalTabs?.querySelectorAll<HTMLElement>('.auth-modal-tab').forEach(t =>
  t.addEventListener('click', () => switchAuthTab(t.dataset['tab'] ?? 'login'))
)
authLoginSubmit?.addEventListener('click', () => { submitLogin().catch(e => { console.error(e); showAuthError('오류가 발생했어요') }) })
authLoginPw?.addEventListener('keydown', e => { if (e.key === 'Enter') submitLogin().catch(console.error) })
authLoginEmail?.addEventListener('keydown', e => { if (e.key === 'Enter') authLoginPw?.focus() })
authSignupSubmit?.addEventListener('click', () => { submitSignup().catch(e => { console.error(e); showAuthError('오류가 발생했어요') }) })
authSignupPw2?.addEventListener('keydown', e => { if (e.key === 'Enter') submitSignup().catch(console.error) })
authOverlay?.querySelectorAll<HTMLElement>('.auth-pw-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const inp = document.getElementById(btn.dataset['target'] ?? '') as HTMLInputElement | null
    if (!inp) return
    const show = inp.type === 'password'
    inp.type = show ? 'text' : 'password'
    btn.textContent = show ? '🙈' : '👁'
  })
})

// 프로젝트
btnNewProject.addEventListener('click', () => {
  if (!requireLogin()) return
  newProjectName.value = ''
  newProjectOverlay.classList.add('open')
  setTimeout(() => newProjectName.focus(), 50)
})
btnShareProject.addEventListener('click', copyProjectInviteLink)

// 새 공유 프로젝트 모달
newProjectCancel.addEventListener('click', () => newProjectOverlay.classList.remove('open'))
newProjectConfirm.addEventListener('click', () => {
  createSharedProject(newProjectName.value)
  newProjectOverlay.classList.remove('open')
})
newProjectName.addEventListener('keydown', e => {
  if (e.key === 'Enter') { createSharedProject(newProjectName.value); newProjectOverlay.classList.remove('open') }
  if (e.key === 'Escape') newProjectOverlay.classList.remove('open')
})
newProjectOverlay.addEventListener('click', e => {
  if (e.target === newProjectOverlay) newProjectOverlay.classList.remove('open')
})

// 초대 모달
inviteClose.addEventListener('click', closeInviteModal)
inviteDecline.addEventListener('click', closeInviteModal)
inviteAccept.addEventListener('click', acceptInvite)
inviteOverlay.addEventListener('click', e => { if (e.target === inviteOverlay) closeInviteModal() })

// 새 카드 모달
addBtn.addEventListener('click', openAddModal)
addClose.addEventListener('click', closeAddModal)
addCancel.addEventListener('click', closeAddModal)
addSave.addEventListener('click', saveAddModal)
addOverlay.addEventListener('click', e => { if (e.target === addOverlay) closeAddModal() })
addImageInput.addEventListener('change', () => {
  addFileLabel.textContent = addImageInput.files?.[0]?.name ?? '이미지 선택'
})
addContent.addEventListener('paste', async e => {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file) {
        const dt = new DataTransfer(); dt.items.add(file)
        addImageInput.files = dt.files
        addFileLabel.textContent = file.name
      }
      return
    }
  }
})
addTagInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    const tag = addTagInput.value.trim().replace(/,$/, '')
    if (tag && !addTags.includes(tag)) { addTags.push(tag); renderAddTags() }
    addTagInput.value = ''
  }
  if (e.key === 'Backspace' && !addTagInput.value && addTags.length > 0) {
    addTags.pop(); renderAddTags()
  }
})
addTagsWrap.addEventListener('click', () => addTagInput.focus())

// 편집 모달
editClose.addEventListener('click', closeEditModal)
editCancel.addEventListener('click', closeEditModal)
editSave.addEventListener('click', saveEditModal)
editOverlay.addEventListener('click', e => { if (e.target === editOverlay) closeEditModal() })
editTagInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    const tag = editTagInput.value.trim().replace(/,$/, '')
    if (tag && !editTags.includes(tag)) { editTags.push(tag); renderEditTags() }
    editTagInput.value = ''
  }
  if (e.key === 'Backspace' && !editTagInput.value && editTags.length > 0) {
    editTags.pop(); renderEditTags()
  }
})
editTagsWrap.addEventListener('click', () => editTagInput.focus())

// 컬렉션 모달
btnNewColl.addEventListener('click', openNewCollectionModal)
modalEmoji.addEventListener('click', () => {
  const emojis = ['📁','⭐','🔥','💡','🎯','📚','🎨','🛠','🚀','💎','🌿','📌']
  const idx = emojis.indexOf(currentEmoji)
  currentEmoji = emojis[(idx + 1) % emojis.length]!
  modalEmoji.textContent = currentEmoji
})
modalCancel.addEventListener('click', closeCollModal)
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeCollModal() })
modalConfirm.addEventListener('click', () => { createCollection(modalNameInput.value, currentEmoji); closeCollModal() })
modalNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { createCollection(modalNameInput.value, currentEmoji); closeCollModal() }
  if (e.key === 'Escape') closeCollModal()
})

// 컬렉션 삭제 확인 모달
deleteCollCancel.addEventListener('click', closeDeleteCollModal)
deleteCollConfirm.addEventListener('click', confirmDeleteCollection)
deleteCollOverlay.addEventListener('click', e => { if (e.target === deleteCollOverlay) closeDeleteCollModal() })

// 카테고리
btnAddCategory.addEventListener('click', openCategoryModal)
categoryEmojiBtn.addEventListener('click', () => {
  const emojis = ['🏷','🎨','📌','🔖','✅','🌟','🗂','📂','🧩','🔧','💬','🎯']
  const idx = emojis.indexOf(categoryCurrentEmoji)
  categoryCurrentEmoji = emojis[(idx + 1) % emojis.length]!
  categoryEmojiBtn.textContent = categoryCurrentEmoji
})
categoryCancel.addEventListener('click', closeCategoryModal)
categoryConfirm.addEventListener('click', () => { createCategory(categoryNameInput.value, categoryCurrentEmoji); closeCategoryModal() })
categoryOverlay.addEventListener('click', e => { if (e.target === categoryOverlay) closeCategoryModal() })
categoryNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { createCategory(categoryNameInput.value, categoryCurrentEmoji); closeCategoryModal() }
  if (e.key === 'Escape') closeCategoryModal()
})

// 검색
let searchTimer: ReturnType<typeof setTimeout>
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { searchQuery = searchInput.value; renderSidebar(); renderBoard() }, 500)
})
clearFilterBtn.addEventListener('click', clearFilters)
typeFilters.querySelectorAll<HTMLElement>('.filter-btn').forEach(btn =>
  btn.addEventListener('click', () => setTypeFilter(btn.dataset['type']!))
)

// 정렬/내보내기
sortBtn.addEventListener('click', toggleSort)
exportBtn.addEventListener('click', exportMarkdown)

// AI 추천 배너
suggAdd.addEventListener('click', () => {
  if (!pendingSuggest) return
  pendingSuggest.collIds.forEach(id => addCardToCollection(pendingSuggest!.card.id, id))
  suggBanner.classList.remove('show'); pendingSuggest = null
})
suggDismiss.addEventListener('click', () => { suggBanner.classList.remove('show'); pendingSuggest = null })

// 예시 카드
exampleBtn.addEventListener('click', addExampleCards)

// 모바일 사이드바
menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'))
document.addEventListener('click', e => {
  if (window.innerWidth > 900) return
  if (!sidebar.contains(e.target as Node) && !menuBtn.contains(e.target as Node)) {
    sidebar.classList.remove('open')
  }
})

// 리사이즈
let resizeTimer: ReturnType<typeof setTimeout>
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => renderBoard(), 250)
})

// 키보드 단축키
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault(); searchInput.focus(); searchInput.select(); return
  }
  if (e.key === 'Escape') {
    if (!authOverlay.classList.contains('hidden') && isLoggedIn()) { closeAuthModal(); return }
    if (addOverlay.classList.contains('open'))         { closeAddModal(); return }
    if (editOverlay.classList.contains('open'))        { closeEditModal(); return }
    if (inviteOverlay.classList.contains('open'))      { closeInviteModal(); return }
    if (modalOverlay.classList.contains('open'))       { closeCollModal(); return }
    if (deleteCollOverlay.classList.contains('open'))  { closeDeleteCollModal(); return }
    if (categoryOverlay.classList.contains('open'))    { closeCategoryModal(); return }
    if (newProjectOverlay.classList.contains('open'))  { newProjectOverlay.classList.remove('open'); return }
    if (searchQuery || filterType !== 'all' || filterTag || filterCollId || filterCategoryId) {
      clearFilters(); return
    }
  }
})

// ── 테마 토글 ────────────────────────────────────────────
const themeToggle = document.getElementById('theme-toggle')!
function applyTheme(theme: 'dark' | 'light') {
  document.body.dataset['theme'] = theme === 'light' ? 'light' : ''
  themeToggle.textContent = theme === 'light' ? '🌙' : '☀'
  localStorage.setItem('stash-theme', theme)
}
themeToggle.addEventListener('click', () => {
  const current = localStorage.getItem('stash-theme') ?? 'dark'
  applyTheme(current === 'dark' ? 'light' : 'dark')
})

// ── 초기 로드 ────────────────────────────────────────────
try {
  // 저장된 세션이 있으면 자동 로그인 (auth 상태는 여기서만 설정)
  const rawSession = localStorage.getItem('stash-session')
  if (rawSession) {
    const s = JSON.parse(rawSession)
    if (s && typeof s.expiresAt === 'number' && s.expiresAt > Date.now()) {
      currentUserId    = String(s.userId    ?? '')
      currentUserName  = String(s.userName  ?? '')
      currentUserEmail = String(s.userEmail ?? '')
    } else {
      // 만료된 세션 — 모든 auth 키 정리
      localStorage.removeItem('stash-session')
      localStorage.removeItem('stash-user-id')
      localStorage.removeItem('stash-user-name')
      localStorage.removeItem('stash-user-email')
    }
  } else {
    // 세션 없음 — 오래된 auth 키 정리 (이전 비밀번호 없는 로그인 잔재)
    localStorage.removeItem('stash-user-id')
    localStorage.removeItem('stash-user-name')
    localStorage.removeItem('stash-user-email')
  }
} catch {
  localStorage.removeItem('stash-session')
  localStorage.removeItem('stash-user-id')
  localStorage.removeItem('stash-user-name')
  localStorage.removeItem('stash-user-email')
}

try { applyTheme((localStorage.getItem('stash-theme') ?? 'dark') as 'dark' | 'light') } catch { /* ignore */ }
try { loadData() }      catch (e) { console.error('loadData error:', e) }
try { renderLoginUI() } catch (e) { console.error('renderLoginUI error:', e) }
try { checkUrlParams() } catch (e) { console.error('checkUrlParams error:', e) }
try { renderSidebar() } catch (e) { console.error('renderSidebar error:', e) }
try { renderBoard() }   catch (e) { console.error('renderBoard error:', e) }

// 비로그인 시 인증 오버레이 자동 표시
if (!isLoggedIn()) {
  authOverlay.classList.remove('hidden')
  authOverlay.style.display = 'flex'
  document.body.classList.add('auth-open')
} else {
  authOverlay.classList.add('hidden')
  authOverlay.style.display = 'none'
}
