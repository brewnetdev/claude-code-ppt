# Cloudflare R2 연동 가이드 — 첨부파일 업로드/다운로드

> **버전:** 1.0.0
> **최종 수정:** 2026-04-16
> **대상 기능:** 게시글 첨부파일 + 프로필 아바타
> **스택:** Spring Boot 4.x + Java 21 + AWS SDK v2 + Next.js 16 / React 19
>
> 이 문서는 Run-AI 백엔드/프론트엔드가 Cloudflare R2(S3 호환 오브젝트 스토리지)에 파일을 업로드·조회·삭제하는 전체 경로를 코드 레벨로 정리한 레퍼런스다. 구현 중 반복적으로 실패했던 문제들을 재현·해결할 수 있도록 **실패 사례·로그 시그널·해결 코드**를 함께 기록한다.
>
> 주의: 이 문서는 기능 명세가 아니라 **재현용 기술 매뉴얼**이다. 비즈니스 정책(등급별 용량, 첨부 개수 정책)은 `Run-AI_Feature_Spec.md`를 참고하라.

---

## 1. 아키텍처 개요

```
┌─────────────┐   multipart/form-data    ┌───────────────┐
│ Browser     │ ───────────────────────▶ │ Spring Boot   │
│ (Next.js)   │        POST /uploads     │ UploadController
└─────────────┘                          └───────┬───────┘
      ▲                                          │ validate (policy)
      │ public URL                               │ S3Client.putObject
      │                                          ▼
      │                                  ┌──────────────────┐
      │                                  │ Cloudflare R2    │
      │                                  │ (S3 API endpoint)│
      │                                  └──────┬───────────┘
      │                                         │ persisted
      │                                         ▼
      │                                  ┌──────────────┐
      │                                  │ PostgreSQL    │
      │                                  │ attachments   │
      │                                  │ (metadata)    │
      │                                  └──────────────┘
      │
      └── GET  https://pub-<hash>.r2.dev/<storedKey>  (직접 다운로드)
```

특징:

- **백엔드가 R2 버킷을 대리 업로드(Proxy Upload)** 한다. 브라우저가 R2에 직접 PUT 하지 않는다(사전 서명 URL 미사용).
- 다운로드는 R2의 **Public Development URL(`pub-*.r2.dev`)** 로 브라우저가 직접 내려받는다. 백엔드는 메타데이터(원본 파일명, 사이즈)만 반환한다.
- 업로드한 모든 오브젝트는 `Content-Disposition: attachment` 가 강제되어 SVG/HTML을 브라우저가 인라인 렌더링하지 못하게 막는다(XSS 방어).
- 테이블은 폴리모픽(`ref_type` + `ref_id`). `ref_type=NULL`이면 draft, 게시글 저장 시점에 `'POST'` + `posts.id`로 바인딩한다.

---

## 2. 환경 설정

### 2.1 Cloudflare 대시보드 준비

1. https://dash.cloudflare.com 로그인
2. **R2 Object Storage** → **Create bucket**
   - 이름: `run-ai` (운영), `run-ai-dev` (개발) 등
   - Location: Automatic (추천)
3. 생성한 버킷 → **Settings**
   - **Public Development URL**: Allow Access 체크 → `https://pub-<hash>.r2.dev` 획득
4. **R2 → Manage R2 API Tokens** → **Create API Token**
   - Permissions: **Object Read & Write**
   - Bucket: 방금 만든 버킷 한정
   - TTL: 무제한 (개발 편의상) 또는 운영 정책에 따름
   - 발급 후 **Access Key ID / Secret Access Key / Endpoint** 3개 값이 화면에 한 번만 표시되므로 즉시 보관

> 운영 전환 시: 공개 URL을 `pub-*.r2.dev`에서 Cloudflare Custom Domain(예: `cdn.run-ai.kr`)으로 교체하고 `R2_PUBLIC_BASE_URL` 환경변수만 바꾸면 된다. 코드 변경 불필요.

### 2.2 `.env` (backend)

실제 값은 절대 커밋하지 않는다. 아래는 **형태만** 보여주는 예시다.

```env
# backend/.env — git ignored
R2_ENDPOINT=https://<YOUR_ACCOUNT_ID>.r2.cloudflarestorage.com
R2_BUCKET=<YOUR_BUCKET_NAME>
R2_PUBLIC_BASE_URL=https://pub-<YOUR_PUBLIC_HASH>.r2.dev
R2_ACCESS_KEY_ID=<YOUR_R2_ACCESS_KEY_ID>
R2_SECRET_ACCESS_KEY=<YOUR_R2_SECRET_ACCESS_KEY>
```

체크리스트:

- [ ] `R2_ENDPOINT`는 **버킷 이름이 들어가지 않는 account 엔드포인트**여야 한다. `https://<account>.r2.cloudflarestorage.com/<bucket>` 형태로 넣으면 `NoSuchBucket` 실패.
- [ ] `R2_PUBLIC_BASE_URL`은 끝에 슬래시 유무 상관없음(코드에서 정규화).
- [ ] Access Key는 반드시 **버킷 scope**로 발급. 계정 전체 scope 키는 운영에서 금지.

### 2.3 `application.yml`

```yaml
# backend/src/main/resources/application.yml
spring:
  servlet:
    multipart:
      enabled: true
      max-file-size: 50MB           # 단일 파일 한도 (UploadPolicy와 일치)
      max-request-size: 52MB        # 멀티파트 전체 한도 (여유 2MB)

app:
  r2:
    access-key-id:     ${R2_ACCESS_KEY_ID:dev-placeholder}
    secret-access-key: ${R2_SECRET_ACCESS_KEY:dev-placeholder}
    endpoint:          ${R2_ENDPOINT:https://placeholder.r2.cloudflarestorage.com}
    bucket:            ${R2_BUCKET:run-ai-uploads}
    public-base-url:   ${R2_PUBLIC_BASE_URL:https://placeholder.r2.dev}
    prefix:
      attachments: attachments      # stored_key 접두사 (게시글용)
      avatars:     avatars          # stored_key 접두사 (프로필용)

  logging:
    level:
      software.amazon.awssdk.request:       DEBUG   # 서명된 요청 다이제스트
      software.amazon.awssdk.auth.signer:   DEBUG   # SigV4 서명 단계 로그
      software.amazon.awssdk.http.SdkHttpClient: DEBUG
      org.apache.http.wire:                 DEBUG   # 실제 전송 바이트 (디버깅 전용)
```

> 운영 전환 시 `app.logging.level.*` 블록은 반드시 제거하거나 INFO로 낮춘다. 서명 관련 헤더 일부가 로그에 노출될 수 있다.

### 2.4 `build.gradle` 의존성

```groovy
dependencies {
    // AWS SDK v2 — Cloudflare R2 (S3-compatible)
    // 2.30+ 필수: RequestChecksumCalculation / ResponseChecksumValidation 빌더 메서드를
    // 사용해 flexible-checksum 트레일러(STREAMING-UNSIGNED-PAYLOAD-TRAILER)를 끄기 위함.
    implementation 'software.amazon.awssdk:s3:2.30.38'
}
```

> **중요**: `software.amazon.awssdk:s3`는 Spring Boot BOM이 관리하지 않으므로 **명시적 버전 필수**. 2.30 미만은 `RequestChecksumCalculation` 메서드 자체가 존재하지 않아 R2 업로드가 지속적으로 400/401로 튕긴다(3장 §9.1 참고).

---

## 3. 데이터베이스 — `V37__create_attachments_table.sql`

```sql
CREATE TABLE attachments (
  id            BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uploader_id   BIGINT        NOT NULL REFERENCES users(id),
  ref_type      VARCHAR(20),                 -- 'POST' | 'PROFILE' | NULL (draft)
  ref_id        BIGINT,                      -- 폴리모픽: posts.id 또는 users.id
  kind          VARCHAR(10)   NOT NULL,      -- IMAGE | FILE | AVATAR
  CONSTRAINT attachments_kind_check CHECK (kind IN ('IMAGE','FILE','AVATAR')),
  original_name VARCHAR(255)  NOT NULL,
  stored_key    VARCHAR(500)  NOT NULL,      -- R2 object key
  url           VARCHAR(1024) NOT NULL,      -- public URL
  mime_type     VARCHAR(100)  NOT NULL,
  size_bytes    BIGINT        NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_attachments_uploader ON attachments (uploader_id);
CREATE INDEX idx_attachments_ref      ON attachments (ref_type, ref_id);
```

설계 결정:

- `uploader_id` = 소유자. 삭제/수정 권한 체크의 단일 기준.
- `ref_type` + `ref_id` 조합으로 다형 참조. FK를 안 쓰는 대신 애플리케이션 레벨에서 가드.
- `stored_key`는 **서버가 생성한 UUID 키**만 저장. 클라이언트가 경로를 결정할 수 없어 경로 순회(Path Traversal) 불가.
- `url`은 public URL을 **저장해두는 캐시**다. `R2_PUBLIC_BASE_URL` 변경 시 재계산이 필요하므로 운영 전환 시 배치 업데이트 스크립트를 준비해둔다.

---

## 4. 백엔드 구현

### 4.1 `R2Config.java` — S3Client 빈 (가장 중요)

```java
@Configuration
public class R2Config {
    @Bean(destroyMethod = "close")
    public S3Client r2S3Client(
            @Value("${app.r2.access-key-id}") String accessKeyId,
            @Value("${app.r2.secret-access-key}") String secretAccessKey,
            @Value("${app.r2.endpoint}") String endpoint) {

        AwsBasicCredentials creds = AwsBasicCredentials.create(accessKeyId, secretAccessKey);

        return S3Client.builder()
                .region(Region.of("auto"))                                    // (1)
                .endpointOverride(URI.create(endpoint))                       // (2)
                .credentialsProvider(StaticCredentialsProvider.create(creds))
                .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)    // (3)
                .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)    // (3)
                .overrideConfiguration(ClientOverrideConfiguration.builder()
                        .addExecutionInterceptor(new R2RequestLoggingInterceptor())      // (4) 디버깅용
                        .build())
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)                                    // (5)
                        .chunkedEncodingEnabled(false)                                   // (6)
                        .build())
                .build();
    }
}
```

각 라인의 의미(전부 **빼면 반드시 실패**한다):

| 번호 | 설정 | 이유 |
|----|----|----|
| (1) | `region("auto")` | R2는 실제 리전 개념이 없다. 다른 값 넣으면 SigV4 서명의 scope 문자열이 달라져 `SignatureDoesNotMatch`. |
| (2) | `endpointOverride(account 엔드포인트)` | 버킷 이름을 URL에 포함하지 말 것. 경로 스타일을 사용해야 한다. |
| (3) | `Checksum*.WHEN_REQUIRED` | SDK 2.30+ 기본값이 `WHEN_SUPPORTED`로 바뀌면서 `x-amz-content-sha256: STREAMING-UNSIGNED-PAYLOAD-TRAILER` 를 자동 삽입함. R2는 이를 거부 → 400 `InvalidRequest`. **이 옵션이 가장 많이 놓치는 지점이다.** |
| (4) | `R2RequestLoggingInterceptor` | 서명된 outbound 요청을 전부 로그로 덤프. 운영에선 제거. |
| (5) | `pathStyleAccessEnabled(true)` | `https://<endpoint>/<bucket>/<key>` 경로 스타일을 강제. vhost 스타일(`<bucket>.<endpoint>`)은 R2가 미지원. |
| (6) | `chunkedEncodingEnabled(false)` | `aws-chunked` 전송을 끔. R2가 트레일러 청크 인코딩을 일부 거부하며, Spring의 `MultipartFile.getInputStream()`은 length 기반 전송이 안전하다. |

### 4.2 `R2RequestLoggingInterceptor.java` — 디버깅 인터셉터

실패 원인 분석 시 outbound HTTP를 **서명 직후 상태**로 덤프한다. 해결 후엔 빈 등록을 끊어도 무방하지만 현재는 남겨두고 있다.

```java
public class R2RequestLoggingInterceptor implements ExecutionInterceptor {
    @Override
    public void beforeTransmission(Context.BeforeTransmission context, ExecutionAttributes attrs) {
        SdkHttpRequest req = context.httpRequest();
        log.warn("[R2-WIRE] method={} host={} path={} query={} headers=[{}]",
                req.method(), req.host(), req.encodedPath(),
                req.encodedQueryParameters().orElse(""),
                req.headers().entrySet().stream()
                    .map(e -> e.getKey() + "=" + redact(e.getKey(), e.getValue()))
                    .collect(Collectors.joining(" | ")));
    }

    private static String redact(String name, List<String> values) {
        String joined = String.join(",", values);
        if ("Authorization".equalsIgnoreCase(name)) {
            int eq = joined.indexOf("Signature=");
            if (eq > 0) return joined.substring(0, eq + "Signature=".length()) + "<redacted>";
        }
        return joined;
    }
}
```

Authorization 헤더의 `Signature=` 이후 값만 redact한다(실제 시크릿 키는 헤더에 전송되지 않으므로 안전).

### 4.3 `R2StorageService.java` — PUT/DELETE 래퍼

핵심 책임:

1. 서버에서 `stored_key` 생성 (클라이언트 파일명 무관)
2. `Content-Disposition: attachment; filename="...";filename*=UTF-8''...` **ASCII-safe 인코딩**
3. 예외 → `ApiException(ErrorCode.UPLOAD_FAILED)` 변환
4. 퍼블릭 URL 생성

```java
@Service
@RequiredArgsConstructor
public class R2StorageService {
    private final S3Client r2S3Client;
    private final UploadPolicy uploadPolicy;

    @Value("${app.r2.bucket}")           private String bucket;
    @Value("${app.r2.public-base-url}")  private String publicBaseUrl;
    @Value("${app.r2.prefix.attachments:attachments}") private String attachmentPrefix;
    @Value("${app.r2.prefix.avatars:avatars}")         private String avatarPrefix;

    public record PutResult(String storedKey, String url) {}

    public PutResult putAttachment(MultipartFile file) {
        String ext = uploadPolicy.extensionOf(file.getOriginalFilename());
        LocalDate today = LocalDate.now();
        String key = "%s/%s/%s/%s.%s".formatted(
                attachmentPrefix,
                today.format(DateTimeFormatter.ofPattern("yyyy")),
                today.format(DateTimeFormatter.ofPattern("MM")),
                UUID.randomUUID(),
                ext == null ? "bin" : ext);
        return put(file, key);
    }

    public PutResult putAvatar(MultipartFile file, Long userId) {
        String ext = uploadPolicy.extensionOf(file.getOriginalFilename());
        String key = "%s/%d/%s.%s".formatted(
                avatarPrefix, userId, UUID.randomUUID(), ext == null ? "bin" : ext);
        return put(file, key);
    }

    private PutResult put(MultipartFile file, String key) {
        try {
            PutObjectRequest req = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(file.getContentType())
                    .contentLength(file.getSize())                             // (A)
                    .contentDisposition(buildContentDisposition(file.getOriginalFilename()))
                    .build();
            r2S3Client.putObject(req,
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize())); // (A)
            return new PutResult(key, buildPublicUrl(key));
        } catch (IOException | S3Exception e) {
            log.error("R2 putObject failed key={}", key, e);
            throw new ApiException(ErrorCode.UPLOAD_FAILED);
        }
    }

    public void delete(String storedKey) {
        try {
            r2S3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucket).key(storedKey).build());
        } catch (S3Exception e) {
            // non-fatal: DB 삭제는 성공해도 R2 오브젝트가 남을 수 있음. 스케줄 클린업이 정리.
            log.warn("R2 deleteObject failed key={} code={}", storedKey, e.statusCode(), e);
        }
    }

    public String buildPublicUrl(String storedKey) {
        String base = publicBaseUrl.endsWith("/")
                ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1)
                : publicBaseUrl;
        return base + "/" + storedKey;
    }

    /**
     * Content-Disposition 값은 반드시 pure ASCII여야 한다.
     * SDK는 UTF-8 바이트로 SigV4를 계산하지만 Apache HttpClient는 ISO-8859-1로 헤더를 송신하므로
     * 한글/이모지가 들어가면 서명이 어긋나 SignatureDoesNotMatch.
     * - filename=""           : ASCII fallback (비-ASCII → '_' 치환)
     * - filename*=UTF-8''<url>: RFC 5987 UTF-8 percent-encoded
     */
    private String buildContentDisposition(String filename) {
        String safe = filename == null ? "download" : filename.replaceAll("[\\r\\n\"]", "_");
        String asciiFallback = safe.replaceAll("[^\\x20-\\x7E]", "_");
        String encoded = URLEncoder.encode(safe, StandardCharsets.UTF_8).replace("+", "%20");
        return "attachment; filename=\"" + asciiFallback + "\"; filename*=UTF-8''" + encoded;
    }
}
```

**(A)** `contentLength()` 와 `RequestBody.fromInputStream(stream, size)` 를 **반드시 쌍으로** 지정. 안 하면 SDK가 chunked 전송으로 떨어지며 (6)번 설정과 충돌해 서명 실패.

### 4.4 `UploadPolicy.java` — 서버측 단일 소스

확장자 + MIME + 사이즈 3중 검증. 클라이언트 `frontend/src/lib/upload/policy.ts`는 이 파일의 **미러**이며 순수 UX 목적(에러를 빨리 보여주기). 보안은 전적으로 서버에 의존한다.

| 구분 | 허용 확장자 | 허용 MIME | 최대 크기 |
|---|---|---|---|
| IMAGE  | png, jpg, jpeg, gif, webp, svg | image/png, image/jpeg, image/gif, image/webp, image/svg+xml | 10MB |
| AVATAR | (IMAGE와 동일) | (IMAGE와 동일) | 5MB |
| FILE   | IMAGE + pdf, doc(x), ppt(x), xls(x), zip, txt, md | IMAGE MIME + 각 문서 MIME | 50MB |

> SVG를 허용하지만 R2가 모든 오브젝트에 `Content-Disposition: attachment`를 달아 서빙하므로 브라우저가 인라인 렌더링하지 않는다 → 저장형 XSS 차단.

### 4.5 `UploadService.java` — 트랜잭션/권한

```java
static final String REF_TYPE_POST    = "POST";
static final String REF_TYPE_PROFILE = "PROFILE";

@Transactional
public Attachment uploadAttachment(MultipartFile file, UploadKind kind, Long uploaderId) {
    if (kind != UploadKind.IMAGE && kind != UploadKind.FILE)
        throw new ApiException(ErrorCode.INVALID_REQUEST);
    uploadPolicy.validate(file, kind);
    User uploader = userRepository.findById(uploaderId)
            .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

    R2StorageService.PutResult put = r2.putAttachment(file);
    return attachmentRepository.save(Attachment.builder()
            .uploader(uploader)
            .kind(kind)
            .originalName(defaultName(file.getOriginalFilename()))
            .storedKey(put.storedKey())
            .url(put.url())
            .mimeType(file.getContentType())
            .sizeBytes(file.getSize())
            .build());
    // ref_type / ref_id 는 null 로 저장(draft). 게시글 저장 시점에 PostService 가 linkToRef 로 바인딩.
}

@Transactional
public String uploadAvatar(MultipartFile file, Long uploaderId) {
    uploadPolicy.validate(file, UploadKind.AVATAR);
    User user = userRepository.findById(uploaderId)
            .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

    List<Attachment> previous = attachmentRepository.findByRefTypeAndRefId(REF_TYPE_PROFILE, uploaderId);
    R2StorageService.PutResult put = r2.putAvatar(file, uploaderId);
    attachmentRepository.save(Attachment.builder()
            .uploader(user)
            .refType(REF_TYPE_PROFILE)
            .refId(uploaderId)
            .kind(UploadKind.AVATAR)
            .originalName(defaultName(file.getOriginalFilename()))
            .storedKey(put.storedKey())
            .url(put.url())
            .mimeType(file.getContentType())
            .sizeBytes(file.getSize())
            .build());
    user.setAvatar(put.url());

    // 아바타는 1인 1개 정책. 이전 것 모두 제거.
    for (Attachment old : previous) {
        r2.delete(old.getStoredKey());
        attachmentRepository.delete(old);
    }
    return put.url();
}

@Transactional
public void deleteAttachment(Long attachmentId, Long requesterId) {
    Attachment a = attachmentRepository.findById(attachmentId)
            .orElseThrow(() -> new ApiException(ErrorCode.ATTACHMENT_NOT_FOUND));
    if (!a.getUploader().getId().equals(requesterId))
        throw new ApiException(ErrorCode.ATTACHMENT_FORBIDDEN);
    r2.delete(a.getStoredKey());
    attachmentRepository.delete(a);
}

@Transactional(readOnly = true)
public List<Attachment> findByPost(Long postId) {
    return attachmentRepository.findByRefTypeAndRefId(REF_TYPE_POST, postId);
}
```

IDOR 가드 포인트:

- **draft → post 링크**: `AttachmentRepository.linkToRef`가 `WHERE a.id IN :ids AND a.uploader_id = :uploaderId AND a.ref_type IS NULL` 조건으로만 UPDATE. 다른 사람의 draft나 이미 링크된 것은 무시.
- **삭제**: `uploader_id` 일치해야만 허용.

### 4.6 `UploadController.java` — REST 엔드포인트

| Method | Path | 인증 | 설명 | Request | Response |
|---|---|---|---|---|---|
| POST | `/api/v1/uploads/attachment?kind=IMAGE\|FILE` | 로그인 | 첨부파일 업로드(draft) | `multipart/form-data` (field: `file`) | `201 AttachmentResponse` |
| POST | `/api/v1/uploads/avatar` | 로그인 | 프로필 아바타 업로드 | `multipart/form-data` (field: `file`) | `200 { url }` |
| DELETE | `/api/v1/uploads/{id}` | 로그인(소유자) | 삭제 | — | `204` |
| GET | `/api/v1/uploads/by-post/{postId}` | 로그인 | 게시글 첨부 목록 | — | `200 List<AttachmentResponse>` |

`AttachmentResponse` (record):

```java
public record AttachmentResponse(
    Long id, String url, String originalName,
    Long sizeBytes, String mimeType, UploadKind kind) {}
```

### 4.7 `PostService` 연동 (draft → post 바인딩)

게시글을 `createPost` / `updatePost`할 때 요청에 `attachmentIds: List<Long>`을 포함한다. `PostService.linkAttachments()`가 이 ID 집합을 해당 포스트에 바인딩:

```java
private void linkAttachments(Post post, List<Long> attachmentIds, Long uploaderId) {
    if (attachmentIds == null || attachmentIds.isEmpty()) return;
    if (attachmentIds.size() > UploadPolicy.FILE_MAX_COUNT_PER_POST)
        throw new ApiException(ErrorCode.TOO_MANY_ATTACHMENTS);

    // 이미 해당 post 로 링크된 것은 제외 (updatePost 재송신 안전장치)
    List<Long> alreadyLinked = attachmentRepository.findByRefTypeAndRefId("POST", post.getId())
            .stream().map(Attachment::getId).filter(attachmentIds::contains).toList();
    List<Long> toLink = new ArrayList<>(attachmentIds);
    toLink.removeAll(alreadyLinked);
    if (toLink.isEmpty()) return;

    int linked = attachmentRepository.linkToRef(toLink, "POST", post.getId(), uploaderId);
    if (linked != toLink.size()) throw new ApiException(ErrorCode.ATTACHMENT_FORBIDDEN);
}
```

게시글 조회 시 `PostResponse`에 `attachments: List<AttachmentResponse>`를 같이 담아 추가 네트워크 왕복을 줄인다.

---

## 5. 프론트엔드 구현

### 5.1 `lib/api/client.ts` — `apiUpload()` 헬퍼

```ts
/**
 * Multipart upload helper. Content-Type 을 절대 직접 설정하지 말 것 —
 * 브라우저가 boundary 포함해서 자동으로 넣어준다. 401 리프레시 경로는 일반 api() 와 동일.
 */
export async function apiUpload<T>(path: string, formData: FormData, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = { ...(options?.headers as Record<string, string>) };
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, {
        method: options?.method ?? "POST",
        credentials: "include",
        body: formData,
        ...options,
        headers,
    });
    // ...(401 refresh + error handling)...
}
```

> **주의**: `"Content-Type": "multipart/form-data"`를 직접 세팅하면 `boundary=` 파라미터가 빠져 서버가 파트를 파싱하지 못해 400이 뜬다. **헤더 미지정**이 정답이다.

### 5.2 `lib/api/uploads.ts`

```ts
export async function getAttachmentsByPost(postId: number): Promise<Attachment[]> {
    return api<Attachment[]>(`/uploads/by-post/${postId}`);
}
```

글 상세에서는 `PostResponse.attachments`로 이미 포함되므로 이 함수는 **편집 페이지 prefill**에서만 사용한다.

### 5.3 `lib/upload/policy.ts` — 서버 정책 미러

백엔드 `UploadPolicy.java`의 허용 목록을 TypeScript로 그대로 옮겨놓은 것. 검증은 2단계:

1. 클라이언트: UX용 즉시 피드백 (네트워크 낭비 방지)
2. 서버: 보안 경계 (신뢰의 기준)

동기화 규칙은 파일 상단 주석에 명시:

```ts
// SYNC WITH backend/src/main/java/kr/runai/api/upload/policy/UploadPolicy.java
// The backend is the source of truth; this file exists so the UI can show
// errors before a file ever hits the network.
```

### 5.4 `AttachmentUploader.tsx` — 업로드 UI

드래그&드롭 + 클릭 업로드 + 삭제. 핵심 루프:

```tsx
const uploadOne = async (file: File): Promise<Attachment | null> => {
    const err = validateUpload(file, kind);
    if (err) { toast.error(`${file.name}: ${err.message}`); return null; }
    const fd = new FormData();
    fd.append("file", file);
    try {
        return await apiUpload<Attachment>(`/uploads/attachment?kind=${kind}`, fd);
    } catch (e) {
        const message = e instanceof ApiError ? e.message : "업로드에 실패했습니다.";
        toast.error(`${file.name}: ${message}`); return null;
    }
};
```

사용처: `write/page.tsx`, `community/write/page.tsx`, `tutorial/write/page.tsx`, `post/[id]/edit/page.tsx`

### 5.5 `AvatarUploader.tsx`

단일 파일, 5MB, 즉시 서버 반영(아바타 필드 업데이트 포함). 사용처: `profile/setup/page.tsx`.

### 5.6 다운로드 UI — 글 보기 페이지

글 상세(`post/[id]/page.tsx`)의 액션 바 우측에 chip 리스트로 노출.

```tsx
{post.attachments && post.attachments.length > 0 && (
    <div className="ml-auto flex flex-wrap items-center gap-2">
        {post.attachments.map((att) => (
            <a key={att.id}
               href={att.url}
               download={att.originalName}
               target="_blank"
               rel="noopener noreferrer"
               className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-bg-alt hover:bg-bg-hover border border-border rounded-[var(--radius-input)] text-[12px] text-text-body hover:text-primary transition-colors max-w-[280px]"
               title={`${att.originalName} (${formatBytes(att.sizeBytes)}) 다운로드`}>
                <FileIcon kind={att.kind} mimeType={att.mimeType} className="h-3.5 w-3.5" />
                <span className="truncate">{att.originalName}</span>
                <span className="text-text-light shrink-0">({formatBytes(att.sizeBytes)})</span>
                <Download className="h-3.5 w-3.5 shrink-0" />
            </a>
        ))}
    </div>
)}
```

다운로드 동작 상세:

- `href={att.url}` 은 **R2 public URL**. 백엔드를 거치지 않고 브라우저가 R2에서 직접 내려받는다.
- R2가 서빙할 때 `Content-Disposition: attachment; filename="..."`을 이미 포함하므로 브라우저는 인라인 렌더링 없이 저장 다이얼로그를 띄운다.
- `download={att.originalName}`: same-origin에서만 파일명 힌트가 적용된다. R2는 cross-origin이므로 `Content-Disposition`의 `filename*=UTF-8''...`이 우선된다. **한글 파일명도 여기서 복원된다.**
- `target="_blank" rel="noopener noreferrer"`: 브라우저가 팝업/탭 동작을 어떻게 처리하든 원본 페이지 상태를 보호.

### 5.7 공통 파일 아이콘 — `components/shared/file-icon.tsx`

업로더와 다운로드 리스트에서 모두 사용하는 재사용 컴포넌트:

```tsx
export function FileIcon({ kind, mimeType, className }: {
    kind: Attachment["kind"]; mimeType: string; className?: string;
}) {
    if (kind === "IMAGE" || mimeType.startsWith("image/"))
        return <ImageIcon className={cn("h-4 w-4 shrink-0 text-text-sub", className)} />;
    if (mimeType === "application/pdf")
        return <FileText className={cn("h-4 w-4 shrink-0 text-danger", className)} />;
    return <Paperclip className={cn("h-4 w-4 shrink-0 text-text-sub", className)} />;
}
```

---

## 6. 전체 흐름 (시퀀스)

### 6.1 새 게시글 + 첨부

```
[브라우저] 파일 드롭
    │  validateUpload() (client)            ← UX 검증
    │
    ├─▶ POST /api/v1/uploads/attachment?kind=FILE   (multipart)
    │                             ▲
    │                             │  UploadPolicy.validate()       ← 보안 경계
    │                             │  R2StorageService.putAttachment()
    │                             │  attachments INSERT (ref_type=NULL, draft)
    │                             │
    │◀─ 201 { id, url, originalName, sizeBytes, mimeType, kind }
    │
    │  (반복 N회)
    │
    │─▶ POST /api/v1/posts  { ..., attachmentIds: [17, 18, 19] }
    │                       PostService.createPost()
    │                         → posts INSERT
    │                         → linkAttachments(): UPDATE attachments
    │                             SET ref_type='POST', ref_id=:postId
    │                             WHERE id IN (17,18,19)
    │                               AND uploader_id=:me
    │                               AND ref_type IS NULL
    │                         → linked 수 ≠ 요청 수 이면 ATTACHMENT_FORBIDDEN
    │
    │◀─ 201 PostResponse
```

### 6.2 다운로드

```
[브라우저] GET /api/v1/posts/{id}
    │◀─ PostResponse (attachments 포함)
    │
    │   렌더: <a href="https://pub-xxx.r2.dev/attachments/2026/04/<uuid>.pdf">
    │
    │─▶ GET  https://pub-xxx.r2.dev/attachments/...   (R2 직행)
    │                                     ▲
    │                                     │  R2는 저장 시 심어놓은
    │                                     │  Content-Disposition: attachment
    │                                     │  + filename*=UTF-8''... 헤더로 서빙
    │◀─ 파일 다운로드 (브라우저 저장 다이얼로그)
```

---

## 7. API 상세

### 7.1 업로드 — `POST /api/v1/uploads/attachment`

Request:

```http
POST /api/v1/uploads/attachment?kind=FILE HTTP/1.1
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...

------WebKitFormBoundary...
Content-Disposition: form-data; name="file"; filename="설계도.pdf"
Content-Type: application/pdf

<binary>
------WebKitFormBoundary...--
```

Response `201`:

```json
{
  "success": true,
  "data": {
    "id": 42,
    "url": "https://pub-xxx.r2.dev/attachments/2026/04/3f0b-...-uuid.pdf",
    "originalName": "설계도.pdf",
    "sizeBytes": 283401,
    "mimeType": "application/pdf",
    "kind": "FILE"
  },
  "error": null
}
```

Error 응답 (ApiException → ErrorCode 매핑):

| HTTP | code | 상황 |
|---|---|---|
| 400 | `INVALID_FILE_TYPE` | 확장자/MIME 불일치 |
| 400 | `FILE_TOO_LARGE` | 사이즈 초과 |
| 400 | `INVALID_REQUEST` | 빈 파일 / 허용 kind 아님 |
| 401 | `UNAUTHORIZED` | 비로그인 |
| 500 | `UPLOAD_FAILED` | R2 put 실패 |

### 7.2 게시글 첨부 조회 — `GET /api/v1/uploads/by-post/{postId}`

주로 **편집 페이지 prefill** 용도. 조회 페이지는 `PostResponse.attachments`를 쓴다.

### 7.3 삭제 — `DELETE /api/v1/uploads/{id}`

소유자만. R2 오브젝트 + DB row 모두 제거(실패 시 DB 우선, R2는 스케줄 클린업).

---

## 8. 주의사항

### 8.1 보안

| 항목 | 조치 |
|---|---|
| 파일 타입 스푸핑 | 확장자 + MIME + 사이즈 3중 검증 (서버) |
| SVG/HTML 인라인 실행 | `Content-Disposition: attachment` 강제로 브라우저 인라인 차단 |
| 경로 순회 | `stored_key`는 UUID 기반 서버 생성. 클라이언트가 경로 결정 불가 |
| IDOR (draft 탈취) | `linkToRef` WHERE 절이 `uploader_id` + `ref_type IS NULL` 이중 가드 |
| IDOR (삭제) | `deleteAttachment`에서 uploader 일치 확인 |
| Content-Disposition 헤더 인젝션 | `\r\n"` 제거 + ASCII fallback + RFC 5987 percent-encode |
| R2 크리덴셜 | 환경변수만 사용. `application.yml`에 값 하드코딩 금지 |
| Authorization 로그 노출 | `R2RequestLoggingInterceptor`가 `Signature=` 이후 redact |

### 8.2 운영 전환 체크리스트

- [ ] `R2_PUBLIC_BASE_URL`을 `pub-*.r2.dev` → Custom Domain(예: `cdn.run-ai.kr`)으로 교체
- [ ] 기존 `attachments.url` 컬럼 일괄 업데이트 배치 스크립트 실행
- [ ] `app.logging.level.software.amazon.awssdk.*` DEBUG 로그 제거
- [ ] `R2RequestLoggingInterceptor` 빈 등록 제거 또는 조건부(Profile) 로딩
- [ ] API 토큰을 버킷 scope로 재발급, TTL 설정
- [ ] 버킷 CORS 정책 확인 (필요 시 지정)
- [ ] R2 수명주기 규칙: draft 24h 초과분 자동 삭제(선택)

### 8.3 로컬 개발

- `.env`에 실제 키 넣고 `backend/.env.example`에는 placeholder만 유지
- `./gradlew bootRun`으로 기동 시 `application.yml` 기본값이 placeholder라 외부 호출은 실패. `R2_*` 환경변수 주입 필수.
- 팀 공용 R2 버킷 대신 **개발자별 버킷**을 만들면 상호 충돌 없음. 비용 거의 0.

---

## 9. 트러블슈팅 — 반복적으로 막혔던 케이스

> 이 섹션이 이 문서의 핵심이다. **로그 시그널 → 원인 → 해결 코드 한 줄**을 붙여놨다.

### 9.1 `x-amz-content-sha256: STREAMING-UNSIGNED-PAYLOAD-TRAILER` → R2 400

**증상**

```
software.amazon.awssdk.services.s3.model.S3Exception:
  null (Service: S3, Status Code: 400, Request ID: ..., Extended Request ID: null)
```

`R2RequestLoggingInterceptor` 로그에 아래 헤더가 보이면 확정:

```
[R2-WIRE] ... headers=[
  x-amz-content-sha256=STREAMING-UNSIGNED-PAYLOAD-TRAILER
  x-amz-trailer=x-amz-checksum-crc32
  ...
]
```

**원인**: AWS SDK 2.30+ 의 flexible-checksum 기본값 `WHEN_SUPPORTED`가 자동으로 trailer 체크섬을 추가함. R2는 이 변형을 거부.

**해결**: `R2Config`에서

```java
.requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
.responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)
```

두 줄을 추가. 이 메서드는 **SDK 2.30.0 이상**에서만 존재. `build.gradle`에 `'software.amazon.awssdk:s3:2.30.38'`을 명시하지 않으면 Spring Boot BOM이 예전 버전을 끌어올 수 있다.

### 9.2 `SignatureDoesNotMatch` — 한글 파일명

**증상**

```
S3Exception: The request signature we calculated does not match the signature
  you provided. Check your key and signing method. (Status Code: 403)
```

**원인**: `Content-Disposition` 헤더에 한글(or 이모지) → SDK는 UTF-8 바이트로 SigV4 서명 → Apache HttpClient는 ISO-8859-1로 헤더 송신 → 같은 헤더가 바이트 레벨에서 달라져 서명 불일치.

**해결**: `R2StorageService.buildContentDisposition()` 참조. ASCII fallback + RFC 5987 `filename*=UTF-8''<percent-encoded>` 이중 표기. 헤더 값에서 `\r\n"` 제거(헤더 인젝션 방어 겸용).

```java
String asciiFallback = safe.replaceAll("[^\\x20-\\x7E]", "_");
String encoded = URLEncoder.encode(safe, StandardCharsets.UTF_8).replace("+", "%20");
return "attachment; filename=\"" + asciiFallback + "\"; filename*=UTF-8''" + encoded;
```

한글 파일명은 R2 서빙 시 `filename*=UTF-8''...` 값이 우선되어 정상 복원된다.

### 9.3 `NoSuchBucket`

**증상**: 403/404 + `NoSuchBucket`

**원인**:

- `R2_ENDPOINT`에 버킷 경로가 포함됨 (`https://account.r2.cloudflarestorage.com/my-bucket`)
- 또는 `pathStyleAccessEnabled(false)` 상태에서 vhost 스타일 시도

**해결**:

- `R2_ENDPOINT`는 **account URL만**: `https://<account>.r2.cloudflarestorage.com`
- `S3Configuration.builder().pathStyleAccessEnabled(true)`

### 9.4 Multipart `FileSizeLimitExceededException` — Spring 기본값 1MB

**증상**

```
org.springframework.web.multipart.MaxUploadSizeExceededException:
  Maximum upload size exceeded; nested exception is ...
  FileSizeLimitExceededException: The field file exceeds its maximum permitted size of 1048576 bytes.
```

**원인**: Spring Boot 기본 multipart 한도는 **1MB**. 50MB를 허용해도 이 레벨에서 컷.

**해결**: `application.yml`

```yaml
spring:
  servlet:
    multipart:
      enabled: true
      max-file-size: 50MB
      max-request-size: 52MB
```

### 9.5 프론트엔드 400 — boundary 누락

**증상**: 서버 로그에 `Required part 'file' is not present`

**원인**: 프론트에서 `"Content-Type": "multipart/form-data"`를 **수동 지정**해버림. `boundary=...` 파라미터가 빠져 서버가 파싱 실패.

**해결**: `apiUpload()`는 Content-Type을 **설정하지 않는다**. 브라우저가 `FormData`를 보면 알아서 넣는다.

### 9.6 업로드는 성공, 다운로드 URL 접근 시 403

**증상**: R2 public URL을 브라우저에서 열면 403/not authorized

**원인**: 버킷의 **Public Development URL**이 비활성 상태.

**해결**: Cloudflare 대시보드 → 버킷 → Settings → **Public Development URL → Allow Access** 체크 → 표시된 URL을 `R2_PUBLIC_BASE_URL`로 재설정.

### 9.7 `STREAMING-AWS4-HMAC-SHA256-PAYLOAD` → 서명 실패

**증상**: body 시작 바이트에 `aws-chunked` 서명 포맷이 보이고 R2가 400.

**원인**: `chunkedEncodingEnabled` 기본값 true → aws-chunked 전송.

**해결**:

```java
.serviceConfiguration(S3Configuration.builder()
        .pathStyleAccessEnabled(true)
        .chunkedEncodingEnabled(false)   // ← 이거
        .build())
```

동시에 `putObject` 호출 시 `contentLength()` + `RequestBody.fromInputStream(stream, length)`를 **모두 넘긴다**(§4.3 A).

### 9.8 드래프트 업로드만 되고 글 저장 시 사라짐

**증상**: 업로드는 201이 돌아오는데 게시글 저장 후 글 상세에 첨부가 없음.

**원인**:

- 프론트에서 `CreatePostRequest.attachmentIds` 필드에 업로드 결과의 `id` 배열을 **안 넣었다**.
- 또는 다른 사용자가 업로드한 draft의 ID를 전송(백엔드가 `ATTACHMENT_FORBIDDEN`)

**해결**:

- 업로드 성공 시 `Attachment.id`를 state에 누적하고, 저장 버튼 클릭 시 `attachmentIds` 필드에 담아 전송.
- 이 프로젝트에선 `AttachmentUploader`가 `value: Attachment[]` 콜백으로 상위에 올려주므로 `value.map(a => a.id)`를 쓰면 됨.

### 9.9 수정 재전송 시 `ATTACHMENT_FORBIDDEN`

**증상**: 글 수정 후 저장하면 에러.

**원인**: 기존 첨부(이미 `ref_type='POST'`로 링크된 것)의 id를 그대로 재전송 → `linkToRef`의 `ref_type IS NULL` 조건을 못 만나 UPDATE 대상 0건 → `linked != toLink.size()` 판정.

**해결**: `PostService.linkAttachments()`가 "이미 이 post에 링크된 것"을 `alreadyLinked`로 걸러내는 로직 보유(§4.7). 프론트는 기존 + 신규 id를 합쳐서 보내도 안전.

### 9.10 CORS

**증상**: 브라우저 콘솔에 `CORS policy: No 'Access-Control-Allow-Origin'` — 백엔드 API 호출 실패.

**원인**: 업로드 API는 프론트가 **백엔드로** 호출하는 것이므로 백엔드 CORS 설정이 문제. R2 자체의 CORS는 브라우저가 R2로 직접 PUT할 때만 필요(이 아키텍처에선 해당 없음).

**해결**: `CorsConfig`가 프론트 도메인을 허용하는지 확인. R2 버킷 CORS는 기본 그대로 OK.

---

## 10. 확인 명령어 모음

### 10.1 최소 재현(스모크 테스트)

```bash
# 1) 백엔드 기동
cd backend && ./gradlew bootRun

# 2) 토큰 확보(다른 터미널 또는 curl 로그인)
TOKEN="<Bearer token>"

# 3) 1x1 PNG 업로드
curl -X POST "http://localhost:9999/api/v1/uploads/attachment?kind=IMAGE" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/pixel.png;type=image/png"
# → 201 { data: { url: "https://pub-.../attachments/2026/04/<uuid>.png", ... } }

# 4) 받은 url 을 브라우저에서 열어 다운로드 동작 확인
```

### 10.2 디버깅 로그

증상 재현 시:

```yaml
app:
  logging:
    level:
      software.amazon.awssdk.request: DEBUG
      software.amazon.awssdk.auth.signer: DEBUG
      org.apache.http.wire: DEBUG
```

`[R2-WIRE] method=PUT host=<endpoint> path=/<bucket>/<key>` 라인이 보이고 `x-amz-content-sha256` 값이 정상인지 확인 (`UNSIGNED-PAYLOAD` 또는 `STREAMING-UNSIGNED-PAYLOAD-TRAILER` **아닌** 실제 해시가 보여야 §9.1 해결 완료).

---

## 11. 라이브러리 버전 요약

| 항목 | 버전 | 비고 |
|---|---|---|
| Spring Boot | 4.x | Multipart 기본 한도 1MB (반드시 늘려야 함) |
| Java | 21 | virtual threads 활용 (업로드는 IO-bound) |
| AWS SDK v2 — s3 | **2.30.38** | 최소 2.30.0 (flexible-checksum 제어 API) |
| PostgreSQL | 16+ | `TIMESTAMPTZ`, `BIGINT IDENTITY` |
| Flyway | — | V37 이후 수정 금지(새 마이그레이션으로만) |
| Next.js | 16 | App Router |
| React | 19 | — |
| Cloudflare R2 | API v4 | Region="auto", SigV4 |

---

## 12. 관련 파일 맵

Backend:

```
backend/
├── build.gradle                                           # SDK 2.30.38 명시
├── src/main/resources/
│   ├── application.yml                                    # app.r2.* + multipart
│   └── db/migration/V37__create_attachments_table.sql
└── src/main/java/kr/runai/api/
    ├── config/
    │   ├── R2Config.java                                  # S3Client 빈 (중요)
    │   └── R2RequestLoggingInterceptor.java               # 디버깅용
    ├── upload/
    │   ├── domain/
    │   │   ├── Attachment.java                            # 엔티티
    │   │   ├── AttachmentRepository.java                  # linkToRef 쿼리
    │   │   └── UploadKind.java                            # IMAGE | FILE | AVATAR
    │   ├── policy/UploadPolicy.java                       # 서버 소스 of truth
    │   ├── dto/
    │   │   ├── AttachmentResponse.java
    │   │   └── AvatarResponse.java
    │   ├── service/
    │   │   ├── R2StorageService.java                      # R2 put/delete
    │   │   └── UploadService.java                         # 트랜잭션/권한
    │   └── controller/UploadController.java               # REST
    ├── post/
    │   ├── dto/
    │   │   ├── CreatePostRequest.java                     # + attachmentIds
    │   │   ├── UpdatePostRequest.java                     # + attachmentIds
    │   │   └── PostResponse.java                          # + attachments
    │   └── service/PostService.java                       # linkAttachments()
    └── exception/ErrorCode.java                           # UPLOAD_FAILED 등
```

Frontend:

```
frontend/src/
├── lib/
│   ├── api/
│   │   ├── client.ts                                      # apiUpload()
│   │   └── uploads.ts                                     # getAttachmentsByPost()
│   └── upload/policy.ts                                   # 서버 미러
├── components/shared/
│   ├── AttachmentUploader.tsx                             # 업로드 UI
│   ├── AvatarUploader.tsx                                 # 아바타 UI
│   └── file-icon.tsx                                      # 재사용 아이콘
├── types/index.ts                                         # Attachment 인터페이스
└── app/(main)/
    ├── post/[id]/page.tsx                                 # 다운로드 UI
    ├── post/[id]/edit/page.tsx                            # 편집 시 prefill
    ├── write/page.tsx
    ├── community/write/page.tsx
    ├── tutorial/write/page.tsx
    └── profile/setup/page.tsx                             # 아바타 변경
```

---

## 13. 다음에 같은 증상이 나오면 이 순서로 확인

1. `./gradlew dependencies | grep s3` → **2.30.0 이상**인가?
2. `application.yml`의 `spring.servlet.multipart.max-file-size`가 업로드 크기보다 큰가?
3. `R2Config`에 `requestChecksumCalculation(WHEN_REQUIRED)` + `responseChecksumValidation(WHEN_REQUIRED)` 두 줄 있는가?
4. `S3Configuration`에 `pathStyleAccessEnabled(true)` + `chunkedEncodingEnabled(false)` 있는가?
5. `putObject` 호출이 `contentLength()` + `RequestBody.fromInputStream(s, length)` 쌍으로 되어 있는가?
6. `Content-Disposition` 값이 pure ASCII인가? (§9.2)
7. 프론트 `apiUpload()`가 Content-Type을 **수동 설정하지 않는가**?
8. Cloudflare 대시보드에서 **Public Development URL**이 활성 상태인가?
9. `[R2-WIRE]` 로그의 `x-amz-content-sha256` 값이 실제 해시인가? `STREAMING-*-TRAILER`가 보이면 (3)·(4)·(5) 재검.

이 9가지를 순서대로 통과시키면 R2 업로드/다운로드는 반드시 동작한다.
