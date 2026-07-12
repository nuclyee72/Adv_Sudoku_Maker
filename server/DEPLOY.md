# 배포 (Render.com 기준)

이 서버(`server/`)는 정적 프론트엔드(레포 루트의 `index.html`/`src`/`style.css`)와
`/api/rooms/...` REST + `/ws` WebSocket을 같은 Node 프로세스에서 함께 서빙한다.
Node + WebSocket을 지원하는 호스트라면 어디든 같은 방식으로 배포할 수 있다
(Render / Railway / Fly.io 등). 아래는 Render 기준 단계.

## 1. 로컬 확인

```bash
cd server
npm install
npm start        # http://localhost:3000 (PORT 환경변수로 포트 변경 가능)
```

브라우저로 `http://localhost:3000/`을 열어 기존 싱글플레이 화면이 그대로 뜨는지 확인.

## 2. Render에 배포

1. [render.com](https://render.com)에 가입 후 GitHub 계정 연결, 이 레포를 선택.
2. **New → Web Service** 생성 시:
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start` (= `node index.js`)
3. Render는 `PORT` 환경변수를 자동으로 주입하며, `server/index.js`는 이미
   `process.env.PORT || 3000`을 쓰고 있으므로 별도 설정이 필요 없다.
4. 배포가 끝나면 `https://<서비스이름>.onrender.com` 주소가 발급된다. 이 주소가
   곧 앱 전체(정적 페이지 + API)의 주소이고, WebSocket도 같은 도메인의
   `wss://<서비스이름>.onrender.com/ws`로 자동으로 지원된다(별도 설정 불필요).
5. 이후 `main` 브랜치에 push하면 Render가 자동으로 재배포한다(Auto-Deploy 기본 켜짐).

## 3. 다른 Node 호스트로 옮길 때

Railway, Fly.io 등도 동일하게 "Node 프로젝트 하나 배포" 절차만 따르면 된다:
- 빌드: `cd server && npm install`
- 실행: `node server/index.js` (또는 `npm start`, Root Directory를 `server`로 잡았다면 `npm start`)
- 포트: 호스트가 주입하는 `PORT` 환경변수를 그대로 사용(코드 수정 불필요)

## 참고

- 방 상태는 **메모리에만** 저장된다(`server/rooms.js`의 `Map`). 서버가 재시작되면
  모든 방이 사라진다 — 대기실/게임 중 서버가 재배포되면 참가자들이 다시 방을 만들어야
  한다. 방은 원래 일회성(카훗류)이라 별도 DB 없이 이렇게 운영한다.
- 무료 플랜은 일정 시간 요청이 없으면 슬립되는 경우가 많다(Render Free 등) — 첫 접속 시
  몇 초 정도 콜드 스타트가 걸릴 수 있다.
