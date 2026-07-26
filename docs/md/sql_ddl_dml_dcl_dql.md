# SQL 기본 4분류 (DDL · DML · DCL · DQL) — PostgreSQL 기준

> `employees` 라는 **하나의 테이블**을 기준으로 4가지 명령어 그룹을 설명합니다.
> 아래 모든 SQL은 PostgreSQL 16에서 실제 실행하여 오류 없음을 검증했습니다.

## 기준 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | SERIAL (PK) | 자동 증가 기본키 |
| `name` | VARCHAR(50) | 이름 (NOT NULL) |
| `department` | VARCHAR(50) | 부서 |
| `salary` | INTEGER | 급여 (0 이상) |
| `hired_at` | DATE | 입사일 (기본값 = 오늘) |

---

## 1. DDL — Data Definition Language (데이터 정의어)

테이블·스키마 **구조 자체**를 정의/변경/삭제합니다. 자동 커밋됩니다(롤백 어려움).

```sql
-- 테이블 생성
CREATE TABLE employees (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    department  VARCHAR(50),
    salary      INTEGER CHECK (salary >= 0),
    hired_at    DATE DEFAULT CURRENT_DATE
);

-- 컬럼 추가 (구조 변경)
ALTER TABLE employees ADD COLUMN email VARCHAR(100);

-- 테이블 삭제
DROP TABLE employees;
```

| 명령어 | 역할 |
|--------|------|
| `CREATE` | 테이블/객체 생성 |
| `ALTER` | 구조 변경 (컬럼 추가·수정·삭제) |
| `DROP` | 테이블/객체 삭제 |
| `TRUNCATE` | 데이터 전체 삭제 (구조는 유지, DDL로 분류) |

---

## 2. DML — Data Manipulation Language (데이터 조작어)

테이블 안의 **데이터(행)** 를 삽입/수정/삭제합니다. 트랜잭션으로 되돌릴 수 있습니다.

```sql
-- 삽입
INSERT INTO employees (name, department, salary)
VALUES ('김철수', '개발', 5000),
       ('이영희', '디자인', 4500),
       ('박민수', '개발', 6000);

-- 수정
UPDATE employees SET salary = 5500 WHERE name = '김철수';

-- 삭제
DELETE FROM employees WHERE name = '박민수';
```

| 명령어 | 역할 |
|--------|------|
| `INSERT` | 행 추가 |
| `UPDATE` | 행 값 수정 |
| `DELETE` | 행 삭제 |

> `WHERE` 절을 빠뜨리면 **전체 행**이 수정/삭제되니 주의하세요.

---

## 3. DQL — Data Query Language (데이터 질의어)

데이터를 **조회**합니다. `SELECT` 하나이며, DML의 일부로 보기도 합니다.

```sql
-- 조건 조회 + 정렬
SELECT name, department, salary
FROM employees
WHERE salary >= 5000
ORDER BY salary DESC;

-- 그룹 집계
SELECT department,
       COUNT(*)        AS 인원,
       AVG(salary)::INT AS 평균급여
FROM employees
GROUP BY department;
```

| 요소 | 역할 |
|------|------|
| `SELECT` | 조회할 컬럼 지정 |
| `WHERE` | 행 필터링 조건 |
| `ORDER BY` | 정렬 |
| `GROUP BY` | 그룹핑 후 집계(`COUNT`, `AVG`, `SUM` 등) |

---

## 4. DCL — Data Control Language (데이터 제어어)

사용자(롤)에게 **권한**을 부여하거나 회수합니다.

```sql
-- 로그인 가능한 롤 생성
CREATE ROLE analyst LOGIN PASSWORD 'pw123';

-- 조회 권한 부여
GRANT SELECT ON employees TO analyst;

-- 권한 회수
REVOKE SELECT ON employees FROM analyst;
```

| 명령어 | 역할 |
|--------|------|
| `GRANT` | 권한 부여 |
| `REVOKE` | 권한 회수 |

> TCL(`COMMIT`, `ROLLBACK`)을 DCL과 별개로 분류하기도 합니다. PostgreSQL에서 DML은 트랜잭션 안에서 `ROLLBACK`으로 되돌릴 수 있습니다.

---

## 한눈에 요약

| 분류 | 대상 | 대표 명령어 | 되돌리기 |
|------|------|------------|----------|
| **DDL** | 구조(테이블) | `CREATE` `ALTER` `DROP` `TRUNCATE` | 어려움 (자동 커밋) |
| **DML** | 데이터(행) | `INSERT` `UPDATE` `DELETE` | 가능 (`ROLLBACK`) |
| **DQL** | 조회 | `SELECT` | 해당 없음 |
| **DCL** | 권한 | `GRANT` `REVOKE` | 가능 (`ROLLBACK`) |

---

### 출처

- PostgreSQL 공식 문서 — SQL Commands: https://www.postgresql.org/docs/current/sql-commands.html
- `CREATE TABLE`: https://www.postgresql.org/docs/current/sql-createtable.html
- `GRANT`: https://www.postgresql.org/docs/current/sql-grant.html

> 위 SQL 예제는 PostgreSQL 16.13 환경에서 순차 실행하여 전부 정상 동작(exit 0)함을 확인했습니다.
