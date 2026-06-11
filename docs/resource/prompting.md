# 올바른 프롬프팅 기법
---
제로샷 & 퓨샷 프롬프팅 (Zero-Shot and Few-Shot Prompting) 기법
### 제로샷 프롬프팅
- 모델이 이미 학습한 데이터를 기반으로 답변을 생성함, 예시 없이 바로 지시문으로 작성하는 프롬프트
- 빠르고 단순한 작업에 적합
- Pre-traind Knowledge → Generalization → Adaptation
**예시**
> "이 코드를 OOP 원칙에 맞게 리팩토링 해주고 테스트케이스 작성해줘"
### 퓨샷 프롬프팅
- 예시를 제공해서 정확성과 일관성을 가지도록 함
- 복잡한 문제나 특정 맥락이 필요한 긴 작업에 적합
**예시**
`CREATE TABLE IF NOT EXISTS support_contacts (
id BIGINT NOT NULL AUTO_INCREMENT COMMENT '문의 ID',
name VARCHAR(100) NULL COMMENT '이름(선택)',
email VARCHAR(255) NOT NULL COMMENT '회신 이메일',
phone VARCHAR(20) NULL COMMENT '전화번호',
contact_type ENUM('general','bug','feature','collab','product','other') NOT NULL DEFAULT 'general' COMMENT '문의 유형',
subject VARCHAR(200) NOT NULL COMMENT '제목',
message TEXT NOT NULL COMMENT '문의 내용',
status ENUM('new','inProgress','resolved','closed') NOT NULL DEFAULT 'new' COMMENT '처리 상태',
locale VARCHAR(10) NULL COMMENT '언어(예: ko, en)',
created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '생성 시각',
updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '수정 시각',
deleted_at DATETIME(3) NULL COMMENT '삭제 시각(소프트 삭제)',
PRIMARY KEY (id),
INDEX idx_sc_status (status),
INDEX idx_sc_type (contact_type),
INDEX idx_sc_created (created_at)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='개발자에게 문의하기(지원 연락)';`
> → @table.sql을 참고해서 SupportController와 service, repository를 코드베이스 컨벤션을 참고해서 CRUD를 만들고 Entity를 만들어줘. 컨트롤러에는 프론트에서 호출 할 수 있는 HttpClient 호출 스펙을 주석을 정리해줘
> 단순한 경우 제로샷으로 시작, 좀 더 높은 정밀도가 필요하다면 퓨샷을 통해 해결
> 코딩 에이전트 선택도 마찬가지
> 토큰 소모가 비용에 직접 영향을 줌 (따라서 파일 첨부 형태로 진행하는걸 권고)
## 생각의 사슬 프롬프팅 (Chain-of -Thought Prompting)
- 작업을 논리적 단계로 분해하여 AI의 문제 해결 능력을 강화하는 기법, 순차적 접근, 단계별 접근, 다양한 조건 케이스에 대한 작업을 지시
- Sequential Thinking, Ultra Think 등의 MCP등 내장된 명령어를 수행하는 경우도 생각의 사슬 프롬프팅에서 확장된, 구조화된 버전의 프롬프팅이라고 볼 수 있음. → MCP에서 다시 설명
- AI Agent의 사고 유형을 한단계 더 발전시켜 문제 해결을 높히는 기법
> 이 코드 실행시에 중간에 에러가 발생하는데 코드 실행 전후로 로깅을 남기고 해당 로깅을 읽어서 순차적으로 로직이 제대로 된 값을 호출하고 전달하는지 추적하고 에러 로그가 나온다면 원인이 뭔지 파악한 뒤에 근본적인 해결책을 제시해줘
## 문제 분해 프롬프팅 (Problem Decomposition Prompting, Chaining)
- 큰 복잡한 작업을 더 작고 관리하기 쉬운 작업 단위로 나누는 기법 , 시스템 설계나 연동 단계에서 작은 규모로 임무를 나누고 진행하도록 유도
- 작은 작업에 집중하게 하여 출력 품질을 향상 시킬 수 있음
> 로그인 단계의 처리는 다음과 같아
> 1) 인풋에서 아이디, 패스워드를 입력 받는다. 아이디는 이메일 포맷 validation을 해야 하고 패스워드는 4글자 이상의 값을 유효하다고 판단해야 한다.
> 2) 서버 전송시 인증 요청을 처리하여 실패의 경우 토스트 메시지를 출력하고, 성공일 경우 토큰 발급과 쿠키를 설정하여 응답을 반환한다.
> 3) 로그인 성공 페이지는 xxx로 이동하고, 이동시 사용자 정보를 조회하여 등급과 닉네임, 랭킹등을 회원 정보 드롭다운 레이어에 표시한다.
> 이 로직을 구현해줘
## 리액트 (Reason and Act, React) 프롬프팅
- AI가 단계적으로 추론(reasoning) 하고, 행동(action)하여 문제를 좀 더 효과적으로 해결하는 기법 , 에이전트 탐색, 디버깅
> Rabbit MQ 연동에 계속 실패하는데 설정 파일을 분석해서 어떤 부분에서 연동이 제대로 안되는지 파악하고 샘플 코드 실행이 안될 경우 공식 문서를 참조해서 설정 값을 변경하여 다시 테스트 진행해. 문제가 발생하면 발생 한 코드 전 후로 로깅을 남기고 해당 로깅을 읽어서 어떤 문제가 발생하고 있고 어떻게 해결해야 하는지 리포팅해
### 기타 : Constitutional Prompting(헌법적 지침 기반 AI 준수 규칙), Plan-and-Solve Prompting(계획-해결 프롬프팅, 실행에 앞서 계획을 세우는 과정)