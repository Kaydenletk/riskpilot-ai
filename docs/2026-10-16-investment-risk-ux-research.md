# RiskPilot — Investment risk bottlenecks và hướng sản phẩm

Ngày nghiên cứu: 16/10/2026. Ngôn ngữ: tiếng Việt. Trạng thái: desk research và giả thuyết UX; chưa phỏng vấn khách hàng, chưa xác nhận product-market fit.

## 1. Câu hỏi nghiên cứu và kết luận

Người mới tìm hiểu cổ phiếu mắc ở đâu giữa nghe một nhận định, tìm bằng chứng, hình thành quan điểm và xem lại quyết định? RiskPilot có thể hỗ trợ đoạn nào mà người dùng tự kiểm tra được?

Hướng đề xuất: **Claim → Evidence → Understanding → Thesis → Review**. Điểm vào MVP là một nhận định về một công ty. Kết quả phiên đầu là hiểu biết người dùng tự diễn đạt, căn cứ và câu hỏi còn mở. Journal mở rộng sau khi kiểm chứng giá trị phiên đầu.

RAG cung cấp bằng chứng; UX giúp người dùng kiểm tra và lập luận. Confidence tự báo cáo là chỉ số phụ. Việc cảm thấy chắc chắn hơn chưa chứng minh hiểu tốt hơn hay đầu tư tốt hơn.

## 2. Phương pháp và giới hạn

- Dùng skill `ux-researcher-designer`: journey, tổng hợp insight, proto-persona, usability protocol. Dùng các vai trò bibliography, source verification và phản biện của workflow deep-research để kiểm tra nguồn độc lập.
- Desk research có chủ đích, không phải systematic review hay meta-analysis. Nguồn được tìm và đọc qua web ngày 16/10/2026; ưu tiên báo cáo gốc FINRA/NORC, FCA, Investor.gov và nghiên cứu HCI gốc. Trang chính thức sản phẩm chỉ dùng để xác nhận tính năng họ công bố.
- Cụm tìm kiếm chính: `FINRA investment risk comprehension diversification`, `FINRA finfluencers knowledge confidence`, `FCA digital engagement practices experiment`, `LLM explanations sources overreliance`, `cognitive forcing functions AI`, `new investor journey`, `Perplexity finance earnings documents`, `NotebookLM citations`.
- Không dùng blog tổng hợp, nội dung affiliate hay lời người bán để chứng minh hiệu quả hoặc nhu cầu trả tiền. Preprint được ghi riêng; kết quả HCI ngoài đầu tư chỉ là căn cứ thiết kế cần thử lại.
- Chủ yếu dữ liệu Mỹ/Anh. Chưa biết người dùng đích là người Việt đầu tư thị trường Mỹ, người Mỹ hay người đầu tư tại Việt Nam. MVP tài liệu SEC là giả định phạm vi, không phải kết luận về thị trường Việt Nam.
- NFCS 2024 và các phân tích xuất bản 2025/2026 dùng chung dữ liệu; không coi là ba mẫu độc lập xác nhận kết quả.
- Nghiên cứu có AI hỗ trợ tìm kiếm và tổng hợp. Các user story bên dưới là tình huống giả định, không phải lời khách hàng đã phỏng vấn.

## 3. Evidence register

| ID | Nguồn và phương pháp | Kết quả dùng được | Giới hạn |
|---|---|---|---|
| E1 | [FINRA/NORC, Risk, 12/2024](https://www.finrafoundation.org/sites/finrafoundation/files/2025-06/how-consumers-think-about-investment-risk.pdf): khảo sát xác suất 1.066 người trưởng thành Mỹ, 8/2024 | 80% trả lời đúng một câu nhận diện biến động; 55% chọn phương án đa dạng hóa trong bài giả định | Hai câu đơn giản, không đo toàn bộ risk literacy; không chỉ người mới; response rate 3,2%; không chứng minh nhân quả |
| E2 | [FINRA NFCS Investor Survey 2024, phát hành 12/2025](https://finrafoundation.org/InvestorReport2024): 2.861 người có đầu tư ngoài retirement | Điểm trung bình 5,3/11; 56% tự đánh giá kiến thức cao | Online/self-report; trọng số tuổi/học vấn; không coi mọi người trả lời là beginner |
| E3 | [FINRA/Stanford, 10/2026](https://www.finrafoundation.org/sites/finrafoundation/files/2026-10/what-separates-sophisticated-investors-102026.pdf): phân tích NFCS 2024, 13 câu và phân nhóm literacy | 18% đạt nhóm advanced theo định nghĩa nghiên cứu; nhóm basic-only sẵn lòng tham gia cơ hội giả định có dấu hiệu fraud nhiều nhất | Liên hệ thống kê, không chứng minh học kiến thức gây thay đổi outcomes; advanced gồm cả leverage/options |
| E4 | [FINRA Finfluencers, 4/2026](https://www.finrafoundation.org/sites/finrafoundation/files/2026-03/FINRA_Foundation_Research_Brief_Social_Media_Finfluencers.pdf): NFCS 2021/2024 | Nhóm dùng social media có objective knowledge thấp hơn nhưng tự đánh giá cao hơn; báo cáo dùng nhiều nguồn hơn | Correlation, self-report; không suy ra social media gây fraud; folder URL không phải ngày xuất bản |
| E5 | [FINRA/NORC, Assessing Information, 9/2025](https://finrafoundation.org/sites/finrafoundation/files/2025-09/What-Matters-to-Consumers-When-Assessing-Information-for-Financial-Decision-Making.pdf): khảo sát xác suất 1.031 người Mỹ | 56% tự tin quyết định quản lý tiền, 40% tự tin đánh giá thông tin | Đo tự tin và tiêu chí tự báo cáo, không trực tiếp đo kỹ năng kiểm chứng |
| E6 | [FCA trading-app experiment, 6/2024](https://www.fca.org.uk/publication/research-notes/research-note-digital-engagement-practices-trading-apps-experiment.pdf): randomized online, 9.140 người hoàn thành | Notifications và points/prize draw tăng tần suất giao dịch; không có hiệu ứng tổng thể có ý nghĩa lên mức rủi ro portfolio cuối phiên | Thí nghiệm ngắn; không chứng minh tác động dài hạn lên lợi nhuận; không phải mọi UI engagement đều gây hại |
| E7 | [Kim et al., CHI 2025](https://cognition.princeton.edu/sites/g/files/toruqf3386/files/documents/fostering_reliance_0.pdf): think-aloud 16 người; controlled preregistered 308 người | Explanation tăng reliance cả đáp án đúng/sai; nguồn giảm reliance sai trong tác vụ đó | Câu hỏi khách quan, không đo quyết định cổ phiếu; citations không phải bảo đảm đúng |
| E8 | [Li & Aral, Human Trust in AI Search, 2025](https://arxiv.org/html/2504.06435): preregistered experiment, 4.927 người | Reference links tăng trust; người tham gia không phân biệt hữu hiệu link hợp lệ với link lỗi/không liên quan | Preprint/working paper tại nguồn đọc; search tasks, không đo investment returns |
| E9 | [Buçinca et al., CHI 2021](https://arxiv.org/html/2102.09692): experiment 199 người | Cognitive forcing giảm overreliance; thiết kế hiệu quả nhất bị đánh giá chủ quan kém hơn | Tác vụ thực phẩm, không phải đầu tư/LLM; thêm friction có chi phí usability |
| E10 | [Vasconcelos et al., 2023](https://arxiv.org/html/2212.06823): năm nghiên cứu maze/simulated AI | Lợi ích explanation phụ thuộc chi phí kiểm tra, độ khó và incentives | Không suy ra explanation luôn xấu hay luôn tốt trong finance |
| E11 | [Odean, disposition effect, 1998](https://faculty.haas.berkeley.edu/odean/papers/disposition/disposition.html): hồ sơ 10.000 tài khoản | Mẫu cho thấy xu hướng hiện thực hóa lãi hơn lỗ | Historical observational; không chứng minh journal khắc phục hành vi hay mọi lần giữ cổ phiếu lỗ đều sai |
| E12 | [Commonwealth/FINRA investor journey, 2/2024](https://www.finrafoundation.org/sites/finrafoundation/files/exploring-the-stages-of-the-new-Investor-journey.pdf): qualitative/co-design, mẫu có chủ đích | Journey contemplative → starting → engaging → integrating; actionable knowledge và bối cảnh quan trọng | Mẫu nhỏ, phần lớn phụ nữ Black/Hispanic thu nhập thấp/vừa; breakdown mẫu pha đầu không khớp hoàn toàn; không tổng quát hóa |

## 4. Risk nào sản phẩm có thể tác động?

Đây là khung phân tích sản phẩm, không phải thang điểm risk đã được xác thực.

| Lớp | Câu hỏi thực tế | RiskPilot hỗ trợ đến đâu |
|---|---|---|
| Hiểu biết/thông tin | Tôi hiểu claim không? Nguồn có hỗ trợ nó không? | Trọng tâm: dẫn nguồn, ngày, diễn giải, chỉ ra khoảng trống |
| Doanh nghiệp | Điều gì có thể làm doanh nghiệp gặp khó? | Giải thích cơ chế rủi ro từ disclosure, không dự báo chắc chắn |
| Giá và kỳ vọng | Công ty tốt có đồng nghĩa đầu tư tốt ở giá này? | Giải thích khái niệm và điều chưa kiểm tra; không tự tạo fair value |
| Portfolio | Tôi đang phụ thuộc một công ty/ngành không? | Giáo dục concentration/diversification; MVP không tính allocation tối ưu |
| Hoàn cảnh cá nhân | Khi nào cần dùng tiền? Chịu lỗ có ảnh hưởng cuộc sống không? | Cho người dùng tự ghi bối cảnh; không gán nhãn suitability |
| Hành vi | Tôi đang kiểm chứng hay tìm lý do đồng ý với mình? | Lưu luận điểm, nguồn phản đối và điều kiện thay đổi quan điểm |
| Bất định thị trường | Dù hiểu đúng, kết quả vẫn có thể xấu? | Làm rõ giới hạn; sản phẩm không loại bỏ market risk |

[Investor.gov](https://www.investor.gov/introduction-investing/getting-started/asset-allocation) giải thích vai trò time horizon, risk tolerance và diversification. [Hướng dẫn 10-K](https://www.investor.gov/introduction-investing/getting-started/researching-investments/how-read-10-k) mô tả business, báo cáo tài chính và risk factors. Hồ sơ doanh nghiệp không bao quát toàn bộ hoàn cảnh nhà đầu tư.

## 5. Bottleneck → giả thuyết can thiệp

Các can thiệp sau chưa được xác thực cho RiskPilot.

| Bottleneck | Hành vi cần quan sát | Giả thuyết UX | Cách thất bại cần kiểm tra |
|---|---|---|---|
| Không biết bắt đầu từ đâu | Mở nhiều tab nhưng không đặt được câu hỏi | Bắt đầu từ nhận định đã nghe hoặc câu hỏi gợi ý về business | Onboarding dài, bắt viết khi chưa biết gì |
| Có thông tin nhưng khó kiểm chứng | Tin logo/citation thay vì nội dung | Claim đứng cạnh đoạn nguồn, kỳ báo cáo và giải thích mối liên hệ | Citation làm câu sai trông đáng tin hơn |
| Nghe tên risk nhưng chưa hiểu cơ chế | Chép nguyên danh sách risk factors | Risk card: sự kiện → tác động tới business → điều cần theo dõi | AI tự bịa quan hệ nhân quả hoặc xếp hạng rủi ro thiếu căn cứ |
| Tự tin vượt hiểu biết | Tóm tắt trôi chảy nhưng không tự giải thích được | My Understanding bằng lời người dùng; chỉ rõ unknowns | Quá giống bài thi; người dùng chép bản AI |
| Tìm bằng chứng đồng tình | Bỏ qua dữ kiện trái chiều | Board hỗ trợ/phản đối/chưa đủ; agent hỏi về claim cụ thể | Tạo false balance hoặc bịa counterevidence cho đủ hai bên |
| Quên lý do cũ | Diễn giải lại quyết định theo giá hiện tại | Thesis có version và ngày; review theo bằng chứng | Lưu journal nhưng không quay lại; notification gây quá tải |
| Bỏ qua hoàn cảnh cá nhân | Hiểu công ty nhưng không nghĩ tới nhu cầu tiền | Một bước reflection tùy chọn về horizon/liquidity/concentration | Hiểu nhầm hệ thống đã xác nhận phù hợp để mua |

## 6. Ba hướng sản phẩm

### A. Claim Checker — điểm vào nên thử trước

Job: “Tôi nghe một nhận định về cổ phiếu; giúp tôi kiểm tra nó dựa trên tài liệu nào và còn thiếu gì.”

Input: ticker được hỗ trợ + claim người dùng tự nhập. Output: tách claim thành câu hỏi kiểm chứng; bằng chứng liên quan; trạng thái “được đoạn này hỗ trợ / trái với đoạn này / chưa đủ”; phần suy luận riêng. Dự báo không thể xác nhận từ filing được ghi là giả định, không ép nhãn đúng/sai.

Ưu điểm giả thuyết: nhu cầu khởi đầu cụ thể, test được với claim có đáp án nguồn. Rủi ro: người dùng muốn verdict mua/bán; độ đúng ở cấp claim khó hơn chỉ gắn citation. Giới hạn MVP: claim factual đơn giản về một công ty, không mọi video/link hoặc dự báo thị trường.

### B. Guided Stock Explorer — trải nghiệm chính

Job: “Tôi muốn tự giải thích công ty kiếm tiền thế nào và điều gì có thể sai.”

Company Map → Evidence Panel → My Understanding. Progressive disclosure; nguồn gốc công ty công bố khác với diễn giải AI và ý kiến người dùng. Cần thử liệu người mới chịu đi qua các bước hay muốn một summary nhanh.

### C. Thesis Memory & Review — second brain sau phiên đầu

Job: “Tôi muốn nhớ lý do mình cân nhắc và xem thông tin mới có thay đổi lập luận không.”

Lưu thesis người dùng xác nhận, nguồn, câu hỏi còn mở, ngày review. Khi cập nhật tài liệu, hiển thị thay đổi trong bằng chứng và mời người dùng sửa thesis. Không tự biến thay đổi thesis thành lệnh mua/bán. Hiệu quả journal và retention còn cần kiểm chứng.

Chọn một sản phẩm phát triển theo A → B → C. Đây là thứ tự thử nghiệm, không ba app độc lập.

## 7. Cạnh tranh và giá trị business

[Perplexity Finance](https://www.perplexity.ai/en-GB/changelog/what-we-shipped-july-25th) công bố screener và earnings documents; [NotebookLM](https://blog.google/innovation-and-ai/products/notebooklm-beginner-tips/) có hỏi đáp và citations tới nguồn; [Fiscal.ai](https://docs.fiscal.ai/docs/guides/mcp-skills) có workflow nghiên cứu và liên kết tới filing. Chỉ xác nhận tính năng từ tài liệu chính thức, chưa audit toàn bộ trải nghiệm hiện tại.

Suy luận sản phẩm: RAG, summary và citations riêng lẻ chưa đủ làm điểm khác biệt. Giả thuyết phân biệt của RiskPilot là giúp novice tự kiểm chứng, diễn đạt và tiếp tục lập luận cá nhân. Chưa chứng minh đối thủ thiếu hoàn toàn khả năng này hay người dùng sẽ trả tiền.

| Đường business giả thuyết | Người dùng/người trả tiền | Tín hiệu cần có |
|---|---|---|
| B2C workspace | Người mới có nhu cầu nghiên cứu lặp lại | Dùng lại cho công ty khác; chấp nhận pilot trả phí thật |
| Công cụ cho lớp đầu tư | Người học / đơn vị giáo dục | Giáo viên dùng brief để xem hiểu nhầm; đồng ý pilot với rubric |
| B2B2C onboarding | Người mới / nền tảng tài chính | Buyer xác nhận vấn đề education và đồng ý pilot; chưa build integrations |

Ưu tiên tiếp cận người dùng thật trước khi chọn kênh. Không tối ưu doanh thu theo số giao dịch hoặc sự hấp dẫn của ticker được quảng bá. Chưa có TAM, giá bán, doanh thu hoặc willingness-to-pay được xác minh.

## 8. User stories và demo stories

Các tình huống dưới đây là kịch bản giả định cho prototype, không phải phát hiện phỏng vấn.

1. **Từ lời đồn tới câu hỏi:** “Tôi nghe doanh thu tăng nghĩa là cổ phiếu chắc chắn tăng.” Agent tách phần factual và phần dự đoán; tìm nguồn cho factual; giữ dự đoán là điều chưa chứng minh. Kết quả: biết giới hạn claim.
2. **Từ risk label tới cơ chế:** “Tôi đọc thấy customer concentration nhưng chưa hiểu.” Người dùng xem đoạn nguồn, diễn giải hệ quả và lưu điều cần theo dõi. Kết quả: tự giải thích được rủi ro cụ thể.
3. **Từ thesis một chiều tới lập luận có điều kiện:** “Tôi thích sản phẩm của công ty.” Board ghi bằng chứng, khoảng trống và điều có thể đổi ý. Không bịa một bear case cân bằng giả tạo. Kết quả: thesis có điều kiện kiểm tra.
4. **Từ hiểu công ty tới reflection cá nhân:** “Tôi có thể cần tiền này sớm.” Workspace nhắc horizon/liquidity là câu hỏi riêng, không xác nhận cổ phiếu phù hợp. Kết quả: người dùng nhận ra phần quyết định còn thiếu.
5. **Từ giá biến động tới review bằng chứng:** “Tôi quên tại sao mình quan tâm công ty này.” Mở snapshot cũ, đối chiếu nguồn mới, cập nhật hoặc giữ thesis. Kết quả: truy lại rationale, không chấm quyết định chỉ theo lãi/lỗ.

Interview story cho người xây: discovery thay đổi hướng sản phẩm; citation trông đúng nhưng không hỗ trợ claim; phiên đầu người dùng tự tin hơn mà hiểu không hơn; friction giảm lỗi nhưng tăng dropout; thiết kế memory giữ nguyên lịch sử suy nghĩ. Chỉ kể kết quả đo được sau khi thực sự làm, không dùng kịch bản như thành tích.

## 9. Kế hoạch UX validation

### Discovery: 8 người, 30–45 phút/người

Tuyển người gần đây tìm hiểu cổ phiếu riêng lẻ và tự nhận cần hỗ trợ. Có người đã mua, người còn do dự; ghi thị trường/ngôn ngữ kinh nghiệm. Không đồng nhất “young” với “beginner”.

Hỏi về lần gần nhất, yêu cầu tái hiện bằng tài liệu đã che thông tin cá nhân:

- Điều gì khiến bạn chú ý tới công ty đó?
- Hãy chỉ cách bạn tìm thông tin và lúc quyết định dừng tìm.
- Bạn có thể giải thích công ty kiếm tiền thế nào không?
- Nhận định nào bạn tin nhất; điều gì có thể khiến bạn đổi ý?
- Lần nào bạn không hiểu hoặc nghi ngờ AI/nguồn?
- Bạn hiện lưu suy nghĩ ở đâu, lần sau có đọc lại không?

Ghi sự kiện, hành vi, quotation được đồng ý, workaround, hậu quả và tần suất. Không hỏi dẫn “Bạn có muốn một second brain không?” hoặc dùng lời khen làm bằng chứng nhu cầu. Xin đồng ý trước ghi âm; không cần số tài khoản, balance hay holdings thực để test.

### Formative test: 6–8 người

Prototype một công ty và claim curated, gồm đúng, sai và chưa đủ tài liệu. Nói rõ đây là research sandbox; debrief và sửa mọi thông tin sai được chèn. Tasks: tìm business model; kiểm chứng một claim; giải thích một risk; lưu unknown; viết hiểu biết; mở lại phiên cũ.

Đo đường đi, lỗi, confusion và dropout. Không rút kết luận thị trường từ mẫu nhỏ. Nếu người dùng không hiểu claim entry, thử Company Map làm điểm vào và giữ claim checker theo ngữ cảnh.

### So sánh exploratory: workspace với summary chat

Cùng corpus, nội dung factual, giới hạn thời gian và nguồn; hai công ty/claim có độ khó tương đương. Randomize/counterbalance thứ tự condition và công ty để giảm practice effect. Lưu mọi khác biệt nội dung có thể gây confound. Mẫu thử nhỏ dùng phát hiện vấn đề, không claim causal efficacy hoặc uplift rộng.

Rubric thủ công 0–2 mỗi mục: business model đúng; nguồn thực sự hỗ trợ claim; risk mechanism hợp lý; nhận ra unknown/giới hạn. Người chấm dùng answer key và không biết condition nếu làm được; ghi bất đồng giữa người chấm. Không dùng LLM làm trọng tài duy nhất.

Đo riêng chấp nhận claim đúng, từ chối claim sai, phân loại chưa đủ; tự tin trước/sau từng câu; thời gian và dropout. Đếm citation clicks chỉ là hành vi, không bằng chứng hiểu. Một tuần sau kiểm tra recall và khả năng tìm lại căn cứ.

### Pilot sử dụng lặp lại

Mời nhóm nhỏ dùng hai tuần; ghi return có mục đích, nghiên cứu công ty thứ hai, sửa thesis và dùng lại nguồn. Phân biệt quay lại tự nguyện với notification-driven visit. Sau khi có ích, đề nghị pilot trả phí cụ thể và ghi hành vi thật; không dùng khảo sát “sẵn sàng trả” thay doanh thu.

## 10. Quy tắc quyết định scope

- Ưu tiên evidence/understanding nếu confidence tăng mà rubric không cải thiện.
- Giảm friction nếu người dùng bỏ giữa chừng; không tự động bỏ bước kiểm chứng.
- Giữ claim checker làm ngữ cảnh nếu họ chưa có claim để nhập.
- Hoãn journal nếu chưa có giá trị phiên đầu hoặc không dùng lại rationale.
- Nếu nguồn không hỗ trợ hoặc retrieval không tìm thấy, hiển thị giới hạn corpus; không kết luận thế giới không có bằng chứng.
- Không claim tăng returns, ngăn thua lỗ, loại bỏ risk hoặc journal chữa bias. Chưa có dữ liệu chứng minh các kết quả này.

## 11. Handoff sang kế hoạch build

Thực hiện discovery → prototype → local vertical slice một công ty → evaluation → pilot. Stack và danh sách file triển khai chỉ chốt sau khi chọn entry point qua prototype. Giữ code RiskPilot hiện tại làm bản tham khảo; không xóa hoặc sửa các thay đổi chưa commit trong giai đoạn nghiên cứu.
