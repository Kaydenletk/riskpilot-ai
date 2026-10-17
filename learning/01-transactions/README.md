# Bài 1 — Vì sao lưu ghi chú cần transaction?

Mục tiêu: hiểu điều gì xảy ra khi thao tác có hai bước nhưng bước thứ hai thất bại. Đây là bài SQL/database nhỏ, chưa phải tính năng lưu tài khoản của RiskPilot.

Chạy từ thư mục gốc project:

```bash
backend/.venv/bin/python learning/01-transactions/lesson.py
```

Bài dùng SQLite trong RAM vì Python hiện có sẵn module này; không cần Docker hoặc cài package. Mỗi kịch bản có database riêng và dữ liệu biến mất khi script kết thúc. App vẫn lưu notebook theo cách hiện tại. PostgreSQL là bước tiếp theo; locking, kiểu dữ liệu, placeholders và chi tiết transaction của hai hệ khác nhau.

## Tình huống

Khi người dùng chọn Save to history, một thiết kế database có thể cần:

1. Thêm một bản ghi chú vào `snapshots`.
2. Liên kết nó với phiên bản nguồn trong `snapshot_sources`.

Trong bài này, ta yêu cầu cả hai bước thành công cùng nhau. Đây là quy tắc của thao tác minh họa, không có nghĩa mọi ghi chú trong sản phẩm bắt buộc phải đính kèm nguồn.

## Bốn từ cần biết

| Từ | Nghĩa trong bài |
|---|---|
| Table | Bảng chứa các bản ghi, ví dụ `snapshots` |
| INSERT | Thêm một bản ghi |
| SELECT | Đọc dữ liệu đã có |
| Transaction | Nhóm nhiều thay đổi thành một thao tác: cùng thành công hoặc cùng hủy |

`BEGIN` mở nhóm thao tác; `COMMIT` chấp nhận chúng; `ROLLBACK` hủy thay đổi trong nhóm. Foreign key là ràng buộc để liên kết chỉ được trỏ tới bản ghi có thật. Trong SQLite, bài bật `PRAGMA foreign_keys = ON` rõ ràng.

## Quan sát kết quả

| Kịch bản | Bản ghi chú còn lại | Liên kết nguồn còn lại |
|---|---:|---:|
| A: hai bước tự commit, nguồn không tồn tại | 1 | 0 |
| B: transaction, nguồn không tồn tại | 0 | 0 |
| C: transaction, nguồn hợp lệ | 1 | 1 |

A: bước đầu đã commit riêng nên lỗi bước sau không tự xóa bản ghi trước đó. B: code bắt lỗi và ROLLBACK cả nhóm. C: hai bước thành công rồi COMMIT.

Phần cốt lõi trong Python:

```python
db.execute("BEGIN")
try:
    # INSERT bản ghi chú
    # INSERT liên kết nguồn
    db.execute("COMMIT")
except sqlite3.IntegrityError:
    db.execute("ROLLBACK")
```

Ví dụ giữ cách điều khiển transaction tường minh để dễ nhìn. Code sản phẩm cần xử lý cả các lỗi khác và quản lý connection đúng cách. Một transaction database không tự rollback API call hay email đã gửi ở hệ thống khác.

## Bài bạn tự thử

1. Trước khi chạy, dự đoán ba cặp số ở bảng trên.
2. Tìm dòng INSERT ghi chú và dòng SELECT đếm ghi chú trong `lesson.py`.
3. Đổi nội dung ghi chú, chạy lại và giải thích vì sao các cặp số không đổi.
4. Giải thích bằng lời của bạn: vì sao A còn một bản ghi nhưng B không còn?

Bạn hiểu bài khi có thể chỉ đúng hai bước cần chung transaction và giải thích COMMIT/ROLLBACK mà không đọc lại định nghĩa. Bài tiếp theo: SELECT/WHERE và đọc một notebook theo ID, rồi chuyển ví dụ sang PostgreSQL.

Tài liệu gốc: [PostgreSQL — Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html), [Python sqlite3](https://docs.python.org/3/library/sqlite3.html).
