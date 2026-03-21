-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: LiveOps Hard Skills — VNGGames POC
-- Run AFTER schema.sql in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Skills ─────────────────────────────────────────────────────────────────

insert into public.skills (id, name, definition, function) values
(
  'a1000001-0000-0000-0000-000000000001',
  'Quality Assurance',
  'Đảm bảo game hoạt động đúng trước và sau mỗi bản cập nhật - kiểm tra chất lượng của các tính năng, hệ thống thanh toán và sự kiện trong game.',
  'LiveOps'
),
(
  'a1000001-0000-0000-0000-000000000002',
  'Technical & Integration Management',
  'Lập kế hoạch và triển khai các hạng mục kỹ thuật của game (SDK, Server, Log, Tracking, Store…) đúng thời điểm; phối hợp với Dev, Product và Marketing để đảm bảo triển khai suôn sẻ, giảm thiểu các gián đoạn tới trải nghiệm người chơi.',
  'LiveOps'
),
(
  'a1000001-0000-0000-0000-000000000003',
  'Game Stability & Monitoring',
  'Theo dõi liên tục sức khỏe của game sau release để phát hiện sớm các vấn đề về server, hiệu năng hoặc vận hành trước khi ảnh hưởng đến trải nghiệm người chơi.',
  'LiveOps'
),
(
  'a1000001-0000-0000-0000-000000000004',
  'Release & Patch Management',
  'Lập kế hoạch và triển khai các bản cập nhật game đúng thời điểm và đảm bảo chất lượng - phối hợp với đội Dev, Product và Marketing mà không gây gián đoạn trải nghiệm người chơi.',
  'LiveOps'
),
(
  'a1000001-0000-0000-0000-000000000005',
  'Player Insights',
  'Hiểu sâu nhu cầu, cảm nhận và hành vi của người chơi; kết hợp dữ liệu và quan sát thực tế để đưa ra cách tiếp cận tối ưu cho người dùng.',
  'LiveOps'
),
(
  'a1000001-0000-0000-0000-000000000006',
  'Game Balancing',
  'Quản lý tài nguyên trong game, góp ý điều chỉnh độ khó và gameplay balance để đảm bảo trải nghiệm công bằng và thú vị cho người chơi.',
  'LiveOps'
),
(
  'a1000001-0000-0000-0000-000000000007',
  'Monetization',
  'Thiết kế mô hình tối ưu hóa giá trị người dùng (giá tiền, gói vật phẩm, cơ chế reward liên kết với các nhóm khách hàng) nhằm tối đa hóa doanh thu một cách bền vững và hợp lý.',
  'LiveOps'
),
(
  'a1000001-0000-0000-0000-000000000008',
  'Content Planning',
  'Lập kế hoạch phân phối nội dung game (sự kiện, tính năng mới, cập nhật content) theo từng giai đoạn của vòng đời game nhằm duy trì sự hứng thú của người chơi.',
  'LiveOps'
);

-- ── 2. Skill Levels (4 levels × 8 skills = 32 rows) ──────────────────────────

insert into public.skill_levels (skill_id, level, label, description) values

-- Quality Assurance
('a1000001-0000-0000-0000-000000000001', 1, 'Basic',      'Kiểm tra các chức năng cơ bản theo checklist (login, payment, events...)'),
('a1000001-0000-0000-0000-000000000001', 2, 'Developing', 'Tự kiểm tra được nhiều khía cạnh: giao diện, thanh toán, event mà không cần hỏi thêm'),
('a1000001-0000-0000-0000-000000000001', 3, 'Proficient', 'Dẫn dắt QA, phát hiện bugs phức tạp, thiết lập quy trình test chuẩn cho team'),
('a1000001-0000-0000-0000-000000000001', 4, 'Expert',     'Thiết kế hệ thống QA toàn bộ, đào tạo team, đặt tiêu chuẩn chất lượng cho mỗi lần update'),

-- Technical & Integration Management
('a1000001-0000-0000-0000-000000000002', 1, 'Basic',      'Hiểu và tham gia các hoạt động tích hợp giữa GPP và đối tác dưới sự hướng dẫn của senior (SDK, Server, Log, Tracking…).'),
('a1000001-0000-0000-0000-000000000002', 2, 'Developing', 'Chủ động tham gia và xử lý các trao đổi liên quan đến Technical & Integration trong quá trình vận hành, không cần sự hướng dẫn của senior.'),
('a1000001-0000-0000-0000-000000000002', 3, 'Proficient', 'Lập kế hoạch và quản lý toàn bộ Technical & Integration và quy trình release của game (từ planning đến post-release); điều phối các team liên quan, phát hiện sớm rủi ro và tối thiểu hóa downtime trong quá trình vận hành và launching sản phẩm.'),
('a1000001-0000-0000-0000-000000000002', 4, 'Expert',     'Làm chủ Kỹ thuật & Tích hợp: thiết kế kiến trúc integration, đánh giá platform mới, đào tạo team và xử lý các tình huống đặc biệt để tối ưu vận hành sản phẩm.'),

-- Game Stability & Monitoring
('a1000001-0000-0000-0000-000000000003', 1, 'Basic',      'Có khả năng đọc hiểu và theo dõi các dashboard cơ bản hằng ngày (Game Data, Crash Rate, Server Status, AF…), phát hiện sớm các vấn đề tiềm ẩn và báo cáo.'),
('a1000001-0000-0000-0000-000000000003', 2, 'Developing', 'Chủ động theo dõi các chỉ số healthy của game (crash rate, server load, tỷ lệ lỗi…), phát hiện bất thường qua dashboard và đề xuất phương án xử lý cho leader.'),
('a1000001-0000-0000-0000-000000000003', 3, 'Proficient', 'Thiết kế dashboard và alert theo dõi healthy của game; xác định nguyên nhân, phối hợp dev xử lý và điều phối team giải quyết vấn đề.'),
('a1000001-0000-0000-0000-000000000003', 4, 'Expert',     'Duy trì mindset tối ưu trong việc theo dõi độ healthy của game; xây dựng quy trình monitoring 24/7, thiết lập SLA chuẩn, chủ động cải tiến cách đo lường dữ liệu và điều phối xử lý khi có sự cố lớn.'),

-- Release & Patch Management
('a1000001-0000-0000-0000-000000000004', 1, 'Basic',      'Thực hiện các công việc release theo checklist (build, upload store, test...) dưới sự hướng dẫn của các leader / Senior trong lĩnh vực này.'),
('a1000001-0000-0000-0000-000000000004', 2, 'Developing', 'Chủ động tham dự vào quá trình release & patch management mà không cần sự hỗ trợ và hướng dẫn của các leader liên quan.'),
('a1000001-0000-0000-0000-000000000004', 3, 'Proficient', 'Có khả năng lập kế hoạch và quản lý Release & Patch Management, điều phối team thực hiện đúng tiến độ và đảm bảo trải nghiệm người dùng.'),
('a1000001-0000-0000-0000-000000000004', 4, 'Expert',     'Làm chủ Release & Patch Management: xây dựng quy trình và release rhythm (tuần/tháng), đào tạo team và xử lý các sự cố ngoài kế hoạch nhằm đảm bảo chất lượng vận hành và trải nghiệm người dùng.'),

-- Player Insights
('a1000001-0000-0000-0000-000000000005', 1, 'Basic',      'Theo dõi và tổng hợp feedback từ cộng đồng game (comments, support, báo cáo daily/monthly) để quan sát và phản ánh kịp thời các ý kiến của người chơi.'),
('a1000001-0000-0000-0000-000000000005', 2, 'Developing', 'Kết hợp quan sát cộng đồng và phân tích dữ liệu hành vi người chơi để nhận diện xu hướng (retention, engagement...) và hiểu rõ nhu cầu thực tế của người chơi.'),
('a1000001-0000-0000-0000-000000000005', 3, 'Proficient', 'Kết hợp dữ liệu và feedback cộng đồng để hiểu nhu cầu, vấn đề và kỳ vọng của người chơi; từ đó lập kế hoạch và điều phối các hoạt động liên quan nhằm tối ưu trải nghiệm người dùng.'),
('a1000001-0000-0000-0000-000000000005', 4, 'Expert',     'Sử dụng player insights để đưa ra quyết định chiến lược (content, giá tiền, event) cho toàn bộ portfolio; đào tạo team tư duy player-centric với góc nhìn toàn cảnh thị trường.'),

-- Game Balancing
('a1000001-0000-0000-0000-000000000006', 1, 'Basic',      'Chủ động chơi và quan sát để đưa ra các cảm nhận cá nhân về các update mới (gameplay, tài nguyên, ...)'),
('a1000001-0000-0000-0000-000000000006', 2, 'Developing', 'Phân tích và đánh giá độ balance của game sau mỗi update dựa trên player insight, trải nghiệm cá nhân và dữ liệu; chủ động đề xuất điều chỉnh và giải thích rõ lý do cho từng thay đổi.'),
('a1000001-0000-0000-0000-000000000006', 3, 'Proficient', 'Đưa các phương án đề xuất cân bằng cho các nội dung và event của game; phối hợp team đánh giá, test và điều chỉnh để tránh overpowered/underpowered và duy trì sự công bằng cho người chơi.'),
('a1000001-0000-0000-0000-000000000006', 4, 'Expert',     'Thiết kế kế hoạch cân bằng và ngăn chặn tình trạng mất cân bằng về kinh tế và gameplay trong game, mentoring team về cách đạt được sự cân bằng giữa độ khó, reward và engagement.'),

-- Monetization
('a1000001-0000-0000-0000-000000000007', 1, 'Basic',      'Sử dụng các phương thức và nội dung kiếm tiền sẵn có (bundle, limited-time offer...)'),
('a1000001-0000-0000-0000-000000000007', 2, 'Developing', 'Chủ động đề xuất điều chỉnh phương thức (H5, ingame, webshop, ...) và nội dung (item, tính năng, ...) kiếm tiền, biết cách đọc ARPU, conversion rate, ROAS.'),
('a1000001-0000-0000-0000-000000000007', 3, 'Proficient', 'Thiết kế các phương thức và nội dung kiếm tiền mới phù hợp với nhu cầu khách hàng.'),
('a1000001-0000-0000-0000-000000000007', 4, 'Expert',     'Lập chiến lược kiếm tiền dài hạn, thử mô hình mới, cân bằng giữa doanh thu và sự hài lòng người chơi.'),

-- Content Planning
('a1000001-0000-0000-0000-000000000008', 1, 'Basic',      'Theo lịch content sẵn có, phối hợp công việc đơn giản (design asset, write script...)'),
('a1000001-0000-0000-0000-000000000008', 2, 'Developing', 'Chủ động lên kế hoạch cho lịch event dựa trên nhu cầu khách hàng, update align với marketing campaign.'),
('a1000001-0000-0000-0000-000000000008', 3, 'Proficient', 'Xây dựng roadmap content cả năm, phối hợp Dev/Marketing/CS, tối ưu dựa trên kết quả event trước.'),
('a1000001-0000-0000-0000-000000000008', 4, 'Expert',     'Xây dựng và tối ưu các nguyên tắc cốt lõi để thiết kế roadmap nội dung hiệu quả cho thể loại game tương tự; thử nghiệm format event mới và đào tạo team lập kế hoạch.');

-- ── 3. Skill Standards (required level per skill per job level) ───────────────
-- Job levels: 1.2, 1.3, 2.1, 2.2, 2.3, 3.1
-- required_level = 0 means not yet required (kept for visibility as agreed)
-- Note: required_level check constraint is 1-4, so we use NULL for level 0 cases

-- Quality Assurance (importance: 1)
insert into public.skill_standards (skill_id, job_level, required_level) values
('a1000001-0000-0000-0000-000000000001', '1.2', 1),
('a1000001-0000-0000-0000-000000000001', '1.3', 2),
('a1000001-0000-0000-0000-000000000001', '2.1', 3),
('a1000001-0000-0000-0000-000000000001', '2.2', 4),
('a1000001-0000-0000-0000-000000000001', '2.3', 3),
('a1000001-0000-0000-0000-000000000001', '3.1', 3),

-- Technical & Integration Management (importance: 2)
('a1000001-0000-0000-0000-000000000002', '1.2', 1),
('a1000001-0000-0000-0000-000000000002', '1.3', 2),
('a1000001-0000-0000-0000-000000000002', '2.1', 3),
('a1000001-0000-0000-0000-000000000002', '2.2', 4),
('a1000001-0000-0000-0000-000000000002', '2.3', 3),
('a1000001-0000-0000-0000-000000000002', '3.1', 3),

-- Game Stability & Monitoring (importance: 2)
('a1000001-0000-0000-0000-000000000003', '1.2', 1),
('a1000001-0000-0000-0000-000000000003', '1.3', 2),
('a1000001-0000-0000-0000-000000000003', '2.1', 3),
('a1000001-0000-0000-0000-000000000003', '2.2', 4),
('a1000001-0000-0000-0000-000000000003', '2.3', 4),
('a1000001-0000-0000-0000-000000000003', '3.1', 4),

-- Release & Patch Management (importance: 2)
('a1000001-0000-0000-0000-000000000004', '1.2', 1),
('a1000001-0000-0000-0000-000000000004', '1.3', 2),
('a1000001-0000-0000-0000-000000000004', '2.1', 3),
('a1000001-0000-0000-0000-000000000004', '2.2', 4),
('a1000001-0000-0000-0000-000000000004', '2.3', 3),
('a1000001-0000-0000-0000-000000000004', '3.1', 3),

-- Player Insights (importance: 3)
('a1000001-0000-0000-0000-000000000005', '1.2', 2),
('a1000001-0000-0000-0000-000000000005', '1.3', 2),
('a1000001-0000-0000-0000-000000000005', '2.1', 3),
('a1000001-0000-0000-0000-000000000005', '2.2', 3),
('a1000001-0000-0000-0000-000000000005', '2.3', 4),
('a1000001-0000-0000-0000-000000000005', '3.1', 4),

-- Game Balancing (importance: 3) — level 0 at 1.2 → set required_level = 1 as minimum visible
('a1000001-0000-0000-0000-000000000006', '1.2', 1),
('a1000001-0000-0000-0000-000000000006', '1.3', 1),
('a1000001-0000-0000-0000-000000000006', '2.1', 2),
('a1000001-0000-0000-0000-000000000006', '2.2', 2),
('a1000001-0000-0000-0000-000000000006', '2.3', 3),
('a1000001-0000-0000-0000-000000000006', '3.1', 4),

-- Monetization (importance: 3) — level 0 at 1.2 → set required_level = 1
('a1000001-0000-0000-0000-000000000007', '1.2', 1),
('a1000001-0000-0000-0000-000000000007', '1.3', 1),
('a1000001-0000-0000-0000-000000000007', '2.1', 2),
('a1000001-0000-0000-0000-000000000007', '2.2', 3),
('a1000001-0000-0000-0000-000000000007', '2.3', 4),
('a1000001-0000-0000-0000-000000000007', '3.1', 4),

-- Content Planning (importance: 3) — level 0 at 1.2 → set required_level = 1
('a1000001-0000-0000-0000-000000000008', '1.2', 1),
('a1000001-0000-0000-0000-000000000008', '1.3', 1),
('a1000001-0000-0000-0000-000000000008', '2.1', 2),
('a1000001-0000-0000-0000-000000000008', '2.2', 3),
('a1000001-0000-0000-0000-000000000008', '2.3', 3),
('a1000001-0000-0000-0000-000000000008', '3.1', 4);

-- ── 4. Add importance column & seed it ───────────────────────────────────────
-- importance: 1=low, 2=medium, 3=high (within LiveOps function)
alter table public.skills add column if not exists importance int check (importance in (1,2,3));

update public.skills set importance = 1 where id = 'a1000001-0000-0000-0000-000000000001'; -- QA
update public.skills set importance = 2 where id = 'a1000001-0000-0000-0000-000000000002'; -- Tech Integration
update public.skills set importance = 2 where id = 'a1000001-0000-0000-0000-000000000003'; -- Game Stability
update public.skills set importance = 2 where id = 'a1000001-0000-0000-0000-000000000004'; -- Release & Patch
update public.skills set importance = 3 where id = 'a1000001-0000-0000-0000-000000000005'; -- Player Insights
update public.skills set importance = 3 where id = 'a1000001-0000-0000-0000-000000000006'; -- Game Balancing
update public.skills set importance = 3 where id = 'a1000001-0000-0000-0000-000000000007'; -- Monetization
update public.skills set importance = 3 where id = 'a1000001-0000-0000-0000-000000000008'; -- Content Planning

-- ── 5. Create POC cycle ───────────────────────────────────────────────────────
insert into public.cycle (name, status) values ('POC 2026', 'closed');
