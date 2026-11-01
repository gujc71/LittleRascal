# 개구쟁이들

오늘은 누가 어떤 사고를 쳤을까? 개구쟁이들의 변명을 듣고 모순을 찾아내는 추리 게임 모음.

- 빌드도, 서버도, 로그인도 필요 없는 **정적 HTML**입니다. 게임마다 HTML 한 파일이고, 여러 게임이 같이 쓰는 스크립트만 `games/lib/`에 따로 있습니다.
- [index.html](https://gujc71.github.io/LittleRascal/index.html)을 브라우저로 열면 바로 실행됩니다. `lib/`는 일반 `<script src>`로 불러오므로 GitHub Pages에서도, 파일을 직접 열어도 동작합니다. (`type="module"`은 `file://`에서 막히니 쓰지 않습니다.)
- 한 편당 플레이 시간 5~10분, 전부 한국어입니다.

```
index.html            카드 목록 (GAMES 배열 하나로 관리)
games/*.html          게임 한 편 = 한 파일 (화면, 스타일, 게임만의 데이터와 대사)
games/lib/common.js   모든 게임 공용: $, shuffle, replay(애니메이션 다시 재생), reducedMotion,
                      해결 기록 markSolved / solvedGames / clearSolved (index.html도 함께 씀)
games/lib/persuade.js 설득 게임 엔진 — Persuade({...})
games/lib/friend.js   친구 찾기 엔진 — FriendGame({...})
.nojekyll             GitHub Pages에서 Jekyll 처리 끄기
```

## 게임 8편의 종류

세 가지로 나뉩니다. 각 게임 카드의 **첫 번째 태그가 종류**입니다.

| 종류 | 편수 | 플레이 방식 |
|---|---|---|
| [설득](#설득--4편) | 4 | 용의자 한 명의 진술에서 증거와 어긋나는 문장을 찾아 들이밀기 |
| [친구 찾기](#친구-찾기--2편) | 2 | 단서를 하나씩 열어 조건을 좁히고, 그 마음을 보낸 친구를 지목 |
| [논리 퍼즐](#논리-퍼즐--2편) | 2 | 증언을 교차 대조해 모순 없는 답 하나를 찾아내기 |

### 설득 — 4편

[games/dog-ate-homework.html](games/dog-ate-homework.html) · [games/one-hour-only.html](games/one-hour-only.html) · [games/he-started-it.html](games/he-started-it.html) · [games/already-cracked.html](games/already-cracked.html)

아이를 몰아세우는 게임이 아니라, **버티는 아이가 스스로 털어놓게 만드는** 게임입니다. 네 편이 같은 엔진([games/lib/persuade.js](games/lib/persuade.js))을 쓰고, 각 HTML에는 증거 카드(`EV`), 핑계 라운드(`R`), 대사와 시각만 들어 있습니다. 새 설득 게임은 이 데이터만 써서 `Persuade({...})`에 넘기면 됩니다.

- 아이 한 명과 1:1 대화. 진술 목록에서 문장을 고르고, 증거 카드를 제시합니다.
- **마감 시각 타이머** — `clockText()`가 각각 13:00 / 22:00 / 15:00 / 19:00을 향해 흐릅니다.
- **삐짐 게이지** — `upset >= 70`이면 "한 번만 더 헛짚으면…" 경고가 뜨고, 넘기면 아이가 자리를 떠납니다. 헛짚으면 설득은 실패합니다.
- 표정 SVG 전환(`setFace`)으로 아이 반응을 보여 줍니다.
- 차이는 스킨뿐입니다: 교무실 / 밤 9시 거실 / 방과 후 교실 / 아빠 게임기.

### 친구 찾기 — 2편

[games/confession-note.html](games/confession-note.html) · [games/manitto.html](games/manitto.html)

범인이 아니라 **나에게 마음을 쓴 친구**를 찾는 게임입니다. 증거 탭, 친구들 말, 후보, 답 고르기와 판정, 결과 창은 같은 엔진([games/lib/friend.js](games/lib/friend.js))이 맡고, 각 HTML에는 단서를 모으는 화면(쪽지 문장 / 선물 주간판), 증거 문서, 결과 글만 있습니다. 진행 상황은 `manitto`만 `localStorage`에 저장합니다(`store` 설정). `confession-note`는 매번 새로 시작합니다.

- 단서 5개를 하나씩 열며 조건을 좁힙니다 — 쪽지 문장 5개(`CLUES`) / 월~금 선물 5개(`DAYS`).
- 하교 기록표·출석부 같은 문서와 대조해 후보를 소거합니다.
- 타이머도 삐짐 게이지도 없습니다. 쫓기지 않고 천천히 모으는 쪽입니다.

### 논리 퍼즐 — 2편

[games/broken-pot.html](games/broken-pot.html) · [games/honest-one.html](games/honest-one.html)

대화가 아니라 **표와 격자를 채워** 푸는 쪽입니다. 둘의 구현은 서로 다릅니다.

**누가 화분을 깼을까** — 단서를 찾으면 단어가 해금되고(`addWords`), 그 단어로 "누가 / 무엇을 / 무엇으로 / …" 5칸 문장을 완성합니다(`SLOTS`, `fill[5]`). 틀린 상태로 `tries >= 2`가 되면 어긋난 칸을 빨갛게 표시해 줍니다. 여러 명의 증언이 서로 어긋나는 지점을 찾는 것이 핵심입니다.

**정직한 한 명** — 8편 중 유일하게 이야기 추리가 아니라 형식 논리입니다. "거짓말쟁이의 말은 뒤집으면 참"이라는 규칙으로 정직/거짓 ○✕ 격자를 채웁니다. `combos()`로 모든 조합을 완전탐색해 정답을 검증하고, `whyNot()`으로 오답 조합이 왜 안 되는지까지 설명합니다. **난이도 레벨(`p.level`)이 있는 유일한 게임입니다.**

## 다른 기준으로 나눠 보면

| 기준 | 있음 | 없음 |
|---|---|---|
| 시간 제한 | 설득 4편 | 나머지 4편 |
| 진행 저장 | 친구 찾기 2편 | 나머지 6편 |
| 등장인물 | 1명 — 설득 4편 | 여러 명 — 나머지 4편 |
| 실패 가능 | 설득 4편 (삐짐 게이지) | 나머지 4편 (틀려도 다시) |

가장 큰 경계는 **"한 명을 설득하는 게임 4편"과 "여러 명 중에서 한 명을 찾아내는 게임 4편"** 입니다.

