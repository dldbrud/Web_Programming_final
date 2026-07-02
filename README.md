# Stash — 개인 콘텐츠 카드 보관함

링크·이미지·코드·메모 등 다양한 콘텐츠를 카드 형식으로 보관하고, 카테고리·태그·컬렉션으로 다차원 분류할 수 있는 브라우저 기반 개인 보관함 웹 서비스.

## 실행 방법

**별도 설치 불필요. 서버 불필요.**

1. `stash/` 폴더를 다운로드
2. `index.html` 파일을 크롬(Chrome) 또는 엣지(Edge) 브라우저에서 열기
3. 회원가입 후 바로 사용

> `pretext.bundle.min.js`가 `index.html`과 같은 폴더에 있어야 합니다.

## 파일 구조

```
stash/
├── index.html            # 앱 전체 (HTML + CSS + JavaScript)
├── pretext.bundle.min.js # Pretext 레이아웃 엔진 번들
├── stash.ts              # (참고용) TypeScript 원본
├── stash.css             # (참고용) CSS 원본
├── api.ts                # (참고용) API 타입 정의
├── types.ts              # (참고용) 공통 타입 정의
└── README.md             # 이 파일
```

## 주요 기능

- **카드 추가/수정/삭제**: 링크, 이미지, 코드, 메모를 카드로 보관
- **다중 카테고리 분류**: 하나의 카드를 여러 카테고리에 동시 소속
- **파일 첨부**: PDF, ZIP 등 파일 첨부 (최대 10MB/개)
- **태그 시스템**: 자유 형식 태그로 카드 분류 및 필터링
- **컬렉션**: 카드를 묶어서 폴더처럼 관리
- **검색 및 필터**: 타입·카테고리·태그·컬렉션·키워드 필터
- **다크/라이트 테마**: 상단 버튼으로 전환
- **내보내기**: 선택 카드를 JSON 형식으로 내보내기
- **세션 인증**: 30일 자동 로그인 유지

## 기술 스택

- 단일 HTML 파일 (서버리스, 빌드 불필요)
- Vanilla JavaScript (ES5)
- CSS Variables 기반 테마
- localStorage 데이터 저장
- Pretext 레이아웃 엔진 (chenglou/pretext 기반)

## Pretext 출처

https://github.com/chenglou/pretext
