# Học bằng tính năng thật: Revenue → Dependency → Risk memo

Ngày: 2026-10-17. Đây là milestone đầu tiên trong plan tương tác người dùng đã chọn. Code nối trực tiếp vào RiskPilot, không phải bài mô phỏng SQLite.

## Mục tiêu người dùng

Một người mới nhìn thấy Data Center chiếm phần lớn doanh thu NVIDIA. Họ cần biết nên kiểm tra điều gì tiếp theo và giữ lại nhận định mà không phải viết từ trang trắng.

Luồng thử trên localhost:

1. Chọn NVIDIA, bấm con số 88% hoặc phần Data Center của thanh cơ cấu doanh thu.
2. Khay Dependencies mở: doanh thu → driver → các risk disclosure đã chọn.
3. Tại Export restrictions, chọn Add as Dealbreaker hoặc Flag as Blindspot.
4. Chọn View my risk memo. Nhãn và nguồn đã có sẵn; thêm một câu lý do của chính bạn.
5. Save to history, rồi Export Markdown.
6. Tải lại trang: draft còn đó. Đổi nhãn draft rồi xem History: bản trước vẫn giữ nhãn cũ.

Dealbreaker, Manageable risk và Blindspot là đánh giá cá nhân. Không có risk probability, investment readiness score hay khẳng định rằng chỉ có hai rủi ro.

## Bước học 1: định nghĩa dữ liệu trước giao diện

Một đánh giá rủi ro có bốn phần:

```ts
{
  stance: "blindspot",     // Bạn chọn nhãn nào?
  reason: "",             // Vì sao bạn chọn? Người dùng tự điền.
  corpusVersion: "...",   // Bản thư viện nào đã được dùng?
  source: { /* bản tóm tắt nguồn và metadata lúc chọn */ }
}
```

`stance` là một giá trị trong danh sách cho phép, thay vì mọi chuỗi tùy ý. Nhờ vậy UI, validation và export thống nhất cách gọi nhãn. Xem `frontend/src/lib/research/notebook.ts`.

Mỗi ID rủi ro chỉ có một assessment trong notebook. Chọn lại sẽ đổi nhãn, không thêm bản trùng. Một source note được bookmark đồng thời để người dùng tìm lại được; bỏ classification không tự xóa bookmark.

## Bước học 2: một hàm thuần xử lý hành vi

Mở `frontend/src/lib/research/risk-memo.ts`, tìm `assessRisk`:

- Đầu vào: notebook hiện tại, mã công ty, disclosure và nhãn.
- Kiểm tra disclosure là rủi ro của công ty đang chọn.
- Nếu là lần đầu: capture nguồn và phiên bản thư viện.
- Nếu đã đánh giá: đổi nhãn, giữ lý do và nguồn đã capture.
- Trả về notebook mới. Hàm không gọi API, không tự ghi localStorage và không sửa đối tượng đầu vào.

Đó là lý do kiểm tra logic này không cần chạy trình duyệt. UI chỉ chuyển lựa chọn tới hàm, rồi hook hiện có chịu trách nhiệm lưu.

```text
RiskActions button
  → ResearchWorkspace.classifyRisk
  → assessRisk
  → useResearchNotebook.update
  → localStorage
  → RiskMemo render
```

## Bước học 3: vì sao capture nguồn?

Nếu chỉ lưu `nvda-export`, sau này source summary thay đổi thì đọc lại lịch sử có thể hiển thị nội dung khác lúc người dùng quyết định. Assessment giữ source summary, URL, section, period và catalogue version tại thời điểm capture.

Tradeoff: thêm dữ liệu trùng và tăng dung lượng browser storage. Đổi lại không âm thầm thay nguồn của nhận định cũ. Đây là lịch sử trong browser, không phải hệ thống audit chống sửa: người sở hữu browser vẫn có thể chỉnh localStorage.

Một source bị bỏ khỏi thư viện hiện tại không tự xóa assessment đã capture. Source không còn xuất hiện trong search nhưng memo giữ được bối cảnh cũ. Nhãn của công ty khác bị lọc khỏi notebook đang đọc.

## Bước học 4: dữ liệu cũ không được mất

`riskAssessments` là field mới có `.default({})` trong schema. Notebook và snapshot cũ thiếu field này vẫn đọc được. Tính năng không yêu cầu xóa hoặc reset browser data.

`Save to history` sao chép cả assessment và object source bên trong. Chỉ sao chép lớp ngoài không đủ: hai bản có thể trỏ đến cùng object con. Xem `snapshotNotebook` trong `notebook.ts` và test kiểm tra draft đổi mà history không đổi.

## Bước học 5: tại sao dùng mapping thủ công và native dialog?

`dependencies.ts` nối category với các evidence ID đã kiểm tra. Một số là disclosure toàn công ty, không phải quan hệ nhân quả đã được đo cho riêng segment. UI thể hiện phạm vi và trường hợp thiếu growth driver rõ ràng.

Tradeoff: mapping không tự mở rộng cho hàng nghìn công ty, nhưng hiện tại dễ đọc, kiểm tra và debug hơn để AI tạo liên kết. Không thêm RAG mới chỉ để gọi phần UI này là agent.

`DependencyDrawer.tsx` dùng `<dialog>` và `showModal()` để browser quản lý modal/focus containment. Escape và nút Close đóng khay. App lưu control mở khay và trả focus về đó. Khi chuyển sang source desk hoặc memo, focus chuyển đến nơi làm việc mới.

Tương tác tốt gồm cả đường quay về, không chỉ nút mở.

## Tự kiểm chứng bằng code đang dùng

Từ `frontend/`:

```bash
npx vitest run src/lib/research/risk-memo.test.ts
npx playwright test e2e/research.spec.ts
```

Các tình huống quan trọng:

- Notebook cũ chưa có assessment vẫn đọc được.
- Chọn lại nhãn không nhân đôi rủi ro.
- Không gắn disclosure của NVIDIA vào Apple.
- Đổi draft không đổi captured history.
- Assessment đã capture vẫn tồn tại khi nguồn bị retire.
- Memo giữ nhãn riêng của người dùng, lý do và nguồn trong Markdown.
- Đóng khay bằng Escape trả focus về nút mở.
- Chỉ phân loại một risk cũng đủ Save to history; không bắt viết hết form.

## Bài bạn thử trong sản phẩm

Gắn Export restrictions là Blindspot, thêm một câu hỏi bạn muốn kiểm tra và Save to history. Sau đó đổi thành Manageable risk trong draft.

Trước khi mở History, dự đoán: bản đã lưu phải giữ nhãn nào? Tìm đoạn code khiến kết quả đó đúng. Mục tiêu là bạn giải thích được logic bằng lời của mình và sửa được một thay đổi nhỏ.

## Những phần chưa làm trong milestone này

Source pinning tới đoạn/bảng gốc có highlight, compare bottlenecks, Cmd/Ctrl+K, IndexedDB migration, telemetry và case-study annotations vẫn ở các milestone sau trong `docs/superpowers/plans/2026-10-17-interactive-research-learning.md`. Public share links cần thiết kế privacy/account/storage riêng; hiện export Markdown và JSON tải về máy.
