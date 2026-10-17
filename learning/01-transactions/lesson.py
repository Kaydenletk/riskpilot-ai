"""Bài 1: lưu snapshot và nguồn như một thao tác trọn vẹn.

Chạy: backend/.venv/bin/python learning/01-transactions/lesson.py
Database nằm trong RAM, tự mất khi kết thúc. Không sửa dữ liệu RiskPilot.
"""

import sqlite3
from contextlib import closing


# Foreign key giúp database từ chối tham chiếu tới nguồn không tồn tại.
SCHEMA = """
CREATE TABLE sources (
    id TEXT PRIMARY KEY
);
CREATE TABLE snapshots (
    id INTEGER PRIMARY KEY,
    note TEXT NOT NULL
);
CREATE TABLE snapshot_sources (
    snapshot_id INTEGER NOT NULL REFERENCES snapshots(id),
    source_id TEXT NOT NULL REFERENCES sources(id),
    PRIMARY KEY (snapshot_id, source_id)
);
"""


def demonstrate(*, title: str, atomic: bool, fail_source: bool) -> tuple[int, int]:
    # None: mỗi statement tự commit, trừ khi ta BEGIN transaction rõ ràng.
    with closing(sqlite3.connect(":memory:", isolation_level=None)) as db:
        db.execute("PRAGMA foreign_keys = ON")
        db.executescript(SCHEMA)
        db.execute("INSERT INTO sources (id) VALUES (?)", ("nvda-fy2025",))
        print(f"\n{title}")
        try:
            if atomic:
                db.execute("BEGIN")

            db.execute("INSERT INTO snapshots (id, note) VALUES (?, ?)",
                       (1, "Tôi cần tìm hiểu thêm về nhu cầu Data Center."))
            print("  1. Đã INSERT ghi chú.")

            source_id = "nguon-khong-ton-tai" if fail_source else "nvda-fy2025"
            db.execute("INSERT INTO snapshot_sources (snapshot_id, source_id) VALUES (?, ?)",
                       (1, source_id))
            print("  2. Đã INSERT liên kết nguồn.")

            if atomic:
                db.execute("COMMIT")
                print("  COMMIT: chấp nhận cả hai thay đổi.")
        except sqlite3.IntegrityError:
            print("  2. Lỗi: nguồn tham chiếu không tồn tại.")
            if atomic:
                db.execute("ROLLBACK")
                print("  ROLLBACK: hủy cả thay đổi trước đó trong transaction.")

        snapshots = db.execute("SELECT COUNT(*) FROM snapshots").fetchone()[0]
        links = db.execute("SELECT COUNT(*) FROM snapshot_sources").fetchone()[0]
        print(f"  Kết quả: {snapshots} ghi chú, {links} liên kết nguồn.")
        return snapshots, links


def main() -> None:
    print("RISK PILOT · BÀI 1: TRANSACTION")
    print("Mỗi kịch bản dùng một database mới trong RAM.")
    unsafe = demonstrate(title="A. Hai bước tự commit; bước 2 gặp lỗi", atomic=False,
                         fail_source=True)
    rollback = demonstrate(title="B. Hai bước trong một transaction; bước 2 gặp lỗi", atomic=True,
                           fail_source=True)
    success = demonstrate(title="C. Transaction với nguồn hợp lệ", atomic=True,
                          fail_source=False)
    # Kiểm tra trạng thái dữ liệu cuối cùng, không chỉ thông báo trên màn hình.
    assert unsafe == (1, 0), "Kịch bản A phải tái hiện trạng thái lưu dở dang"
    assert rollback == (0, 0), "Kịch bản B phải hủy cả ghi chú và liên kết"
    assert success == (1, 1), "Kịch bản C phải lưu đủ ghi chú và liên kết"
    print("\nCả 3 kết quả đã được kiểm chứng bằng SELECT.")


if __name__ == "__main__":
    main()
