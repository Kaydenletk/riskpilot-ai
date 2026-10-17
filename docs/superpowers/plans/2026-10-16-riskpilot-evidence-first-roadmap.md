# RiskPilot Evidence-first — Product, UX và Learning Plan

**Goal:** Giúp người mới kiểm tra một nhận định về cổ phiếu, tự diễn đạt hiểu biết và lưu căn cứ để nghiên cứu tiếp.

**Architecture direction:** Workspace có hướng dẫn; RAG phục vụ truy xuất evidence theo claim và công ty. User-confirmed understanding và thesis là bản ghi riêng với nguồn và version. Bản đầu dùng corpus cố định, chạy local; API keys ở backend.

**Tech direction:** Next.js/TypeScript cho UI, FastAPI/Pydantic cho API, OpenAI SDK hiện có cho generation/embeddings sau bước retrieval baseline. Chưa chốt model, provider hosting hoặc database production; các lựa chọn này cần benchmark và yêu cầu pilot thực tế.

**Evidence:** [Research report](../../2026-10-16-investment-risk-ux-research.md). Đây là kế hoạch sản phẩm/học theo milestone, chưa phải bản chỉ dẫn implementation đầy đủ từng dòng code. Không bắt đầu rebuild hoặc deploy trong đợt lập kế hoạch.

## Assumptions và scope

- Target thử nghiệm: người mới nghiên cứu cổ phiếu riêng lẻ niêm yết Mỹ; giao diện tiếng Việt để chủ project tự dùng và tuyển người thử nếu tiếp cận được nhóm đó. Xác nhận lại thị trường/ngôn ngữ ở discovery.
- One-company vertical slice trước; sau đó ba công ty cho kiểm tra generalization, không tuyên bố cover toàn thị trường.
- Nguồn curated 10-K/10-Q/IR, ghi company, loại tài liệu, filing date, fiscal period, URL và ngày lấy. Tách excerpt gốc khỏi bản dịch/diễn giải.
- Luồng: claim hoặc guided question → company map → evidence → my understanding → saved session. Journal/review là milestone sau.
- Không thêm engine risk math, price prediction, buy/sell verdict, tự đặt lệnh, real-time feed hoặc multi-agent orchestration vào MVP.
- Nhớ trạng thái UI khác với hiểu biết đã được người dùng xác nhận. AI draft không tự ghi đè thesis.
- “Chạy local” không đồng nghĩa AI xử lý trên thiết bị: embeddings/generation có thể gửi câu hỏi tới provider. Trước lần gọi ngoài đầu tiên, giải thích dịch vụ nhận dữ liệu nào. Gửi claim/query và public excerpts cần thiết; ghi chú/thesis cá nhân không gửi mặc định, chỉ dùng sau khi người dùng chọn rõ nội dung đưa vào ngữ cảnh. Không log raw personal text hoặc đưa nó vào eval/public repo.
- Nếu chưa kiểm tra đủ độ mới, hiển thị “nguồn được tuyển chọn đến ngày…”; không dùng từ “latest” hoặc “verified” không có căn cứ.

## Task 1 — Xác nhận bottleneck bằng discovery

**Outputs:** `docs/research/riskpilot-discovery-protocol.md`, `docs/research/riskpilot-discovery-synthesis.md` khi thực hiện; notes ẩn danh ngoài public repo.

- [ ] Tuyển 8 người với trải nghiệm gần đây; ghi thị trường, ngôn ngữ và độ quen thuộc.
- [ ] Dùng protocol trong research report, xem cách họ đã làm trước khi giới thiệu sản phẩm.
- [ ] Tổng hợp hành vi và workaround theo các nhóm: không biết bắt đầu; khó kiểm chứng; thiếu cơ chế risk; quên rationale.
- [ ] Ghi bằng chứng ngược: người không cần sản phẩm, người muốn recommendation hoặc chỉ xem giá.

**Acceptance:** Mỗi bottleneck ưu tiên có sự kiện/tài liệu quan sát được; không tạo quote/persona giả. Chọn claim-first hoặc map-first dựa trên hành vi. Nếu chưa tuyển được, đánh dấu assumption chưa kiểm chứng và dùng prototype cho thử nghiệm, không claim validated.

**Học:** interviewing, observation, phân biệt problem và feature request.

## Task 2 — Prototype hành trình, chưa nối model

**Outputs:** `docs/research/riskpilot-prototype-scenarios.md`; `rebuild/prototype/index.html` khi được triển khai.

- [ ] Tạo một case factual đúng, một sai và một chưa đủ từ corpus tuyển chọn.
- [ ] Company Map có business, nguồn doanh thu, growth và risk cards.
- [ ] Evidence Panel có claim, excerpt, URL, kỳ/ngày và diễn giải riêng.
- [ ] My Understanding có business bằng lời mình, rủi ro, nguồn và unknowns.
- [ ] Có empty/loading/source-unavailable states; người dùng có thể bỏ qua hoặc sửa draft.
- [ ] Test 6–8 người, debrief mọi seeded error; chọn entry point.

**Acceptance:** Người dùng hoàn thành nhiệm vụ nghiên cứu mà không cần tự nghĩ prompt; ghi nơi mắc và thay đổi thiết kế. Chưa coi usability thành bằng chứng WTP.

**Học:** HTML/CSS, component states, information architecture, usability testing.

## Task 3 — Vertical slice chạy local với dữ liệu cố định

**Proposed files:** `rebuild/frontend/src/app/research/[symbol]/page.tsx`, `rebuild/frontend/src/components/research/CompanyMap.tsx`, `EvidencePanel.tsx`, `UnderstandingEditor.tsx`, `rebuild/frontend/src/lib/research-types.ts`, `session-store.ts`, `rebuild/backend/src/riskpilot_research/main.py`, `schemas.py`, `corpus.py`, `rebuild/corpus/manifest.json`.

- [ ] Khởi tạo mới dưới `rebuild/` khi bắt đầu execution; giữ app cũ tham khảo.
- [ ] Định nghĩa SourceDocument, EvidenceChunk, Claim, UserUnderstanding, ResearchSession.
- [ ] API trả company map/excerpts cố định cho company được hỗ trợ; ticker khác trả 404 rõ ràng.
- [ ] Browser lưu session local có export/delete; reload giữ nguyên nội dung người dùng.
- [ ] Kèm hướng dẫn chạy hai service và giải thích đường request từ browser tới API.

**Acceptance:** Một người hoàn thành Map → Evidence → Understanding → lưu → reload → mở đúng nguồn, không cần model key. Ghi rõ dữ liệu ở browser, không sync, không bảo đảm lưu vĩnh viễn.

**Học:** TypeScript, React, HTTP, FastAPI, validation, persistence cơ bản. Người học tự giải thích được từng boundary trước task sau.

## Task 4 — Retrieval trước generation

**Proposed files:** `rebuild/backend/src/riskpilot_research/ingest.py`, `retrieve.py`, `rebuild/backend/tests/test_retrieve.py`, `rebuild/eval/retrieval-cases.json`.

- [ ] Chia đoạn theo section, giữ company/source/period/chunk ID.
- [ ] Viết baseline lexical search và xem trực tiếp top results; sau đó so với embeddings khi baseline bộc lộ lỗi paraphrase.
- [ ] Dùng corpus/version và embedding model identifier để phát hiện index không khớp; không embed lại mỗi lần hỏi.
- [ ] Tạo 30 case: 10 trực tiếp, 10 paraphrase, 5 khác công ty/kỳ, 5 không có nguồn hỗ trợ; gold chunks do người kiểm tra.
- [ ] Đo tìm được relevant chunk trong top-k; kiểm tra company/period filter và chi phí ingest/query.

**Acceptance:** Không trả nguồn công ty khác; tất cả ID truy được excerpt gốc; report baseline và semantic search trên cùng bộ case, nêu lỗi còn lại. Không đặt ngưỡng similarity tùy ý thành “độ chắc chắn”.

**Học:** parsing, chunking, search, embeddings, reproducible evaluation. Không cần tự viết math embeddings.

## Task 5 — Sinh giải thích có căn cứ và giới hạn rõ

**Proposed files:** `rebuild/backend/src/riskpilot_research/explain.py`, `validate.py`, `rebuild/backend/tests/test_explain.py`, `rebuild/eval/claim-cases.json`.

- [ ] Schema gồm claim, explanation, evidence IDs, relation-to-evidence và unanswered questions.
- [ ] Model chỉ được tham chiếu chunk IDs được retrieve; app dựng URL từ manifest, không lấy URL tự sinh của model.
- [ ] Tách reported fact, forecast/assumption và AI interpretation; không biến forecast thành fact.
- [ ] Test unknown citation ID, đúng nguồn nhưng không hỗ trợ claim, nhầm kỳ/đơn vị, thiếu context, tài liệu chứa chỉ dẫn lạ và API timeout.
- [ ] Unknown ID/schema invalid bị chặn. Khi không đủ nguồn, trả excerpts và giới hạn; không bịa lời giải thích để lấp chỗ trống.
- [ ] Human audit semantic support theo claim. Validator ID không được mô tả thành bảo đảm factual correctness.

**Acceptance:** Failures có trạng thái người dùng hiểu được; eval tách retrieval error, grounding error và comprehension error. Demo vẫn dùng được qua fixture ghi nhãn khi model không sẵn sàng.

**Học:** LLM API, structured output, prompt, error handling, evaluation.

## Task 6 — Đo hiểu biết, kiểm chứng giá trị phiên đầu

**Outputs:** `rebuild/eval/understanding-rubric.md`, `docs/research/riskpilot-usability-results.md`.

- [ ] So sánh workspace và summary chat cùng nội dung/corpus; counterbalance task/company/order.
- [ ] Đánh giá explanation bằng lời người dùng, source–claim matching, nhận diện unknown và chấp nhận/từ chối claim đúng/sai.
- [ ] Đo confidence riêng cùng accuracy; ghi time, dropout và yêu cầu hỗ trợ.
- [ ] Kiểm tra lại sau một tuần; lưu raw counts, số người và limitations, không chỉ phần trăm.

**Acceptance:** Có evidence về cách người dùng làm, cả thất bại và thành công. Nếu chỉ tăng confidence mà không tăng chất lượng hiểu, sửa UX trước mở rộng.

**Học:** rubric, study design, phân tích định tính/định lượng cơ bản, không suy luận quá mẫu nhỏ.

## Task 7 — Thesis Memory & Review, có điều kiện

**Dependency:** Task 6 cho thấy giá trị phiên đầu và người dùng có nhu cầu quay lại rationale.

**Proposed files:** `rebuild/frontend/src/components/research/ThesisJournal.tsx`, `rebuild/frontend/src/lib/thesis-history.ts`, `thesis-history.test.ts`, `rebuild/corpus/revisions/`.

- [ ] Lưu thesis version, user-confirmed rationale, source IDs và ngày nghiên cứu.
- [ ] Dùng hai phiên bản tài liệu tuyển chọn để test “what changed”; chưa cần ingestion tự động.
- [ ] Cho người dùng đối chiếu và cập nhật; không ghi đè lịch sử hoặc tự đổi quan điểm.
- [ ] Người dùng tự chọn review date; thử review thủ công trước notification.

**Acceptance:** Tìm lại được lý do và nguồn cũ, phân biệt tài liệu thay đổi với giá thay đổi. Không dùng returns để chấm reasoning.

**Học:** versioning, data modeling, diff, state transitions.

## Task 8 — Pilot và business validation

**Outputs:** `docs/research/riskpilot-pilot-results.md`, README/demo mới khi readiness được xác nhận.

- [ ] Supervised/local pilot nhóm nhỏ hai tuần. Nếu cần account/cloud sync, viết scope auth/data isolation riêng trước lưu dữ liệu cá nhân lên cloud.
- [ ] Public demo chỉ dùng hồ sơ mẫu/read-only cho đến khi có identity và access control.
- [ ] Theo dõi dùng lại có mục đích, công ty thứ hai, cập nhật hiểu biết/thesis; không tối ưu số giao dịch.
- [ ] Thử đề nghị pilot trả phí cụ thể với người đã nhận giá trị; ghi chấp nhận/từ chối và lý do, không tự thu phí hoặc gửi thông điệp khi chưa được user giao.
- [ ] Viết case study nêu vấn đề, quyết định thiết kế, lỗi, sửa và số liệu thực đo.

**Acceptance:** Tách kết quả học, usability, retention và commercial signal. Nêu rõ phần chưa chứng minh. Không claim PMF chỉ từ nhóm thử nhỏ.

**Học:** deployment khi cần, product instrumentation, customer validation, technical storytelling.

## Quy tắc học xuyên suốt

Sau mỗi task: tự vẽ data flow; giải thích một lựa chọn và một tradeoff; viết lại một hàm nhỏ; tái hiện và sửa một lỗi không có AI; ghi test đã chạy và lỗi chưa xử lý. AI giải thích/review từng phần, không giao một lần toàn bộ rebuild.

Không ấn định deadline trước discovery và kiểm tra mức nền tảng. Thứ tự milestone là cam kết; thời lượng điều chỉnh theo khả năng tự làm chủ. Kế hoạch cập nhật theo nghiên cứu, không dùng giả thuyết hiện tại làm spec đã validated.
