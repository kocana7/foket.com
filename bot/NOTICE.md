# 공지 올리는 법 (Claude 스레드·루틴용)

공지는 GitHub Actions 워크플로 **Bot notice** (`.github/workflows/bot-notice.yml`)로 보냅니다. Sean님 승인 없이 바로 나갑니다.

- GitHub MCP `actions_run_trigger` → method `run_workflow`, owner `kocana7`, repo `foket.com`, workflow_id `bot-notice.yml`, ref `main`
- inputs:
  - `text`: 공지 내용 (줄바꿈은 `\n`)
  - `audience`: `all`(봇 이용자 전원 + 단체방) / `members`(체험·유료 이용 중인 회원만) / `group`(단체방 foket_center만)
  - `by`: 보낸 곳 (예: `운영팀 휴장 루틴`)
- 보내면 Sean님 텔레그램에 "[공지 완료 · by] N명" 확인이 갑니다.
- 실행 결과가 success가 아니면 공지가 안 나간 것입니다. 실행 로그에 이유가 찍힙니다.

## 지켜야 할 것
- 수익 보장·손실 보전 표현 금지, 손익은 손실도 함께
- 실적은 실제 신호 기록 또는 "가상 성과(백테스트)" 표시만
- 같은 공지를 두 번 보내지 않기 (실행 기록 확인)
