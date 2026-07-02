export type CardType = 'link' | 'image' | 'code' | 'memo'

// ── 기본 카드 인터페이스 ──────────────────────────────────────
// visibility: 'private' = 개인 카드 / 'shared' = 공유 카드
// ownerId: 카드를 만든 사용자 아이디
// workspaceId: 공유 프로젝트 ID (shared 카드에만 존재)
export interface BaseCard {
  id: string
  type: CardType
  tags: string[]
  collectionIds: string[]
  projectId?: string          // 하위 호환용 (이전 카드)
  ownerId?: string            // 카드 생성자 아이디
  visibility?: 'private' | 'shared'  // 개인/공유 구분
  workspaceId?: string        // 공유 프로젝트 ID
  createdAt: number
  pinned?: boolean
}

export interface LinkCard extends BaseCard {
  type: 'link'
  url: string
  title: string
  description: string
}

export interface ImageCard extends BaseCard {
  type: 'image'
  dataUrl: string
  filename: string
  caption: string
}

export interface CodeCard extends BaseCard {
  type: 'code'
  language: string
  code: string
  title: string
}

export interface MemoCard extends BaseCard {
  type: 'memo'
  title: string
  content: string
}

export type Card = LinkCard | ImageCard | CodeCard | MemoCard

// ── 컬렉션 ────────────────────────────────────────────────────
// projectId: 'personal' = 개인 컬렉션 / 공유 프로젝트 ID = 공유 컬렉션
export interface Collection {
  id: string
  name: string
  cardIds: string[]
  emoji: string
  projectId?: string   // 컬렉션 소속 프로젝트
  ownerId?: string     // 컬렉션 생성자
}

// ── 공유 프로젝트 ──────────────────────────────────────────────
export interface SharedProject {
  id: string
  name: string
  ownerName: string
  ownerEmail: string
  ownerUserId: string
  memberNames: string[]
  memberEmails: string[]
  memberUserIds: string[]
  inviteToken: string
  createdAt: number
}

// ── 사용자 정의 카테고리 ───────────────────────────────────────
// 개인 또는 공유 프로젝트 내 사용자 추가 종류
export interface CustomCategory {
  id: string
  name: string
  emoji: string
  projectId: string   // 'personal' 또는 공유 프로젝트 ID
  ownerId: string
}

export interface LayoutCard {
  x: number
  y: number
  width: number
  height: number
  card: Card
}
