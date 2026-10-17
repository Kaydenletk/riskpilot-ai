# Lần theo nguồn của một con số

Khi bấm **Profit per $100 of sales**, bạn đang hỏi: công ty giữ lại bao nhiêu lợi nhuận ròng trên mỗi 100 USD doanh thu? Với NVIDIA, phép tính là `72,880 ÷ 130,497 × 100`, dùng số triệu USD chưa làm tròn. Đây là lợi nhuận của doanh nghiệp sau chi phí và thuế; giá cổ phiếu và lợi nhuận của người mua cổ phiếu còn phụ thuộc nhiều yếu tố khác.

Luồng code đi từ `CompanyVisuals.openMetric` → `buildMetricSource(company, target)` → `MetricSourceDialog`. Component lưu trực tiếp nút vừa được bấm từ `event.currentTarget` (không phụ thuộc nút đó đã nhận focus hay chưa), xây một mô hình nguồn bằng dữ liệu sẵn có, rồi mở dialog. Khi đóng bằng Close hoặc Escape, nó xóa trạng thái dialog và trả focus về nút ban đầu trong frame tiếp theo. Mỗi nút nguồn giữ nhãn hành động riêng và dùng `aria-describedby` trỏ tới con số đang hiển thị, để trình đọc màn hình đọc được cả mục đích lẫn giá trị. Nút phần trăm, thanh doanh thu và chú giải vẫn mở bản đồ phụ thuộc; nút “View share calculation” giải thích riêng phép chia của danh mục đang chọn.

## Vì sao kiểm tra mô hình trước giao diện?

`buildMetricSource` là hàm thuần: không gọi API, không ghi notebook hay storage. Có thể kiểm tra mẫu số, năm tài chính và công ty trước khi kiểm tra thao tác trên trình duyệt. Tăng trưởng doanh thu dùng doanh thu năm trước làm mẫu số; tỷ trọng và lợi nhuận trên $100 dùng doanh thu năm hiện tại. E2E bổ sung bằng chứng rằng người dùng thực sự mở đúng bảng, xem được số liệu trên màn hình hẹp và quay lại đúng nút sau khi đóng.

Dùng lại số liệu chuẩn trong catalogue giúp tránh phải bảo trì hai bản số liệu. Tuy vậy, unit test tính toán đúng không thể chứng minh người nhập đã chép đúng báo cáo ban đầu. Bảng hiện tại là bản chép dữ liệu cục bộ, không phải bố cục tài liệu gốc. Liên kết báo cáo giúp đối chiếu; đánh dấu trực tiếp vùng tương ứng trong tài liệu gốc là bước phát triển tiếp theo.

## Bài tập

1. Trước khi mở Sales growth, dự đoán mẫu số của NVIDIA: `60,922` hay `130,497`? Giải thích vì sao chọn doanh thu năm trước.
2. Trong `frontend/e2e/metric-source.spec.ts`, tìm assertion có `(130,497 − 60,922) ÷ 60,922 × 100`. Nếu mẫu số bị đổi sang năm hiện tại, assertion nào phát hiện sai lệch?
3. Chọn Gaming rồi mở View share calculation. Giải thích vì sao `11,350` là tử số nhưng `130,497` vẫn là mẫu số. So sánh với nút mở bản đồ phụ thuộc để thấy hai câu hỏi khác nhau mà giao diện hỗ trợ.
