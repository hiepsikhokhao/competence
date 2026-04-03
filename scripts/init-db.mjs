/**
 * Database initialization script — runs on every container start.
 * Idempotent: only creates tables/seeds if they don't exist yet.
 *
 * 1. Push Prisma schema (create tables if missing)
 * 2. Add generated column for final_score
 * 3. Seed data if cycle table is empty (first run only)
 * 4. Create default HR admin user if no users exist
 */

import { execSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // ── Step 0: Drop existing generated column if present (needed for fresh db push) ─
  console.log('[init-db] Ensuring clean state for final_score...')
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        -- Drop the generated column if it exists (Prisma can't push schema with it present)
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'assessment_scores' AND column_name = 'final_score'
          AND is_generated != 'NEVER'
        ) THEN
          ALTER TABLE assessment_scores DROP COLUMN final_score;
        END IF;
      END $$;
    `)
    console.log('[init-db] Cleaned up existing generated column (if any)')
  } catch (e) {
    // Ignore if column doesn't exist yet
  }

  // ── Step 1: Push schema (idempotent — only creates missing tables) ────────
  console.log('[init-db] Pushing Prisma schema...')
  execSync('npx prisma db push --skip-generate --accept-data-loss 2>&2', {
    stdio: 'inherit',
    env: process.env,
  })

  // ── Step 2: Add generated column (idempotent) ────────────────────────────
  console.log('[init-db] Ensuring final_score generated column...')
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        -- Check if column exists and is NOT generated
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'assessment_scores' AND column_name = 'final_score'
          AND is_generated = 'NEVER'
        ) THEN
          ALTER TABLE assessment_scores DROP COLUMN final_score;
          ALTER TABLE assessment_scores
            ADD COLUMN final_score int GENERATED ALWAYS AS (COALESCE(manager_score, self_score)) STORED;
        END IF;

        -- If column doesn't exist at all, add it
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'assessment_scores' AND column_name = 'final_score'
        ) THEN
          ALTER TABLE assessment_scores
            ADD COLUMN final_score int GENERATED ALWAYS AS (COALESCE(manager_score, self_score)) STORED;
        END IF;
      END $$;
    `)
  } catch (e) {
    console.log('[init-db] Generated column already exists or skipped:', e.message)
  }

  // ── Step 3: Check if already seeded ────────────────────────────────────────
  const cycleCount = await prisma.cycle.count()
  if (cycleCount > 0) {
    console.log('[init-db] Database already seeded. Skipping.')
    return
  }

  console.log('[init-db] First run detected — seeding database...')

  // ── Step 4: Create default HR admin ────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@company.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'HR Admin',
      email: adminEmail,
      username: adminEmail.split('@')[0],
      password: hashedPassword,
      role: 'hr',
    },
  })
  console.log(`[init-db] Created admin user: ${adminEmail}`)

  // ── Step 5: Seed cycle ─────────────────────────────────────────────────────
  await prisma.cycle.create({
    data: { name: 'POC 2026', status: 'closed' },
  })
  console.log('[init-db] Created cycle: POC 2026')

  // ── Step 6: Seed LiveOps skills ────────────────────────────────────────────
  const liveOpsSkills = [
    { id: 'a1000001-0000-0000-0000-000000000001', name: 'Quality Assurance', definition: 'Đảm bảo game hoạt động đúng trước và sau mỗi bản cập nhật - kiểm tra chất lượng của các tính năng, hệ thống thanh toán và sự kiện trong game.', function: 'LiveOps', importance: 1 },
    { id: 'a1000001-0000-0000-0000-000000000002', name: 'Technical & Integration Management', definition: 'Lập kế hoạch và triển khai các hạng mục kỹ thuật của game (SDK, Server, Log, Tracking, Store…) đúng thời điểm; phối hợp với Dev, Product và Marketing để đảm bảo triển khai suôn sẻ, giảm thiểu các gián đoạn tới trải nghiệm người chơi.', function: 'LiveOps', importance: 2 },
    { id: 'a1000001-0000-0000-0000-000000000003', name: 'Game Stability & Monitoring', definition: 'Theo dõi liên tục sức khỏe của game sau release để phát hiện sớm các vấn đề về server, hiệu năng hoặc vận hành trước khi ảnh hưởng đến trải nghiệm người chơi.', function: 'LiveOps', importance: 2 },
    { id: 'a1000001-0000-0000-0000-000000000004', name: 'Release & Patch Management', definition: 'Lập kế hoạch và triển khai các bản cập nhật game đúng thời điểm và đảm bảo chất lượng - phối hợp với đội Dev, Product và Marketing mà không gây gián đoạn trải nghiệm người chơi.', function: 'LiveOps', importance: 2 },
    { id: 'a1000001-0000-0000-0000-000000000005', name: 'Player Insights', definition: 'Hiểu sâu nhu cầu, cảm nhận và hành vi của người chơi; kết hợp dữ liệu và quan sát thực tế để đưa ra cách tiếp cận tối ưu cho người dùng.', function: 'LiveOps', importance: 3 },
    { id: 'a1000001-0000-0000-0000-000000000006', name: 'Game Balancing', definition: 'Quản lý tài nguyên trong game, góp ý điều chỉnh độ khó và gameplay balance để đảm bảo trải nghiệm công bằng và thú vị cho người chơi.', function: 'LiveOps', importance: 3 },
    { id: 'a1000001-0000-0000-0000-000000000007', name: 'Monetization', definition: 'Thiết kế mô hình tối ưu hóa giá trị người dùng (giá tiền, gói vật phẩm, cơ chế reward liên kết với các nhóm khách hàng) nhằm tối đa hóa doanh thu một cách bền vững và hợp lý.', function: 'LiveOps', importance: 3 },
    { id: 'a1000001-0000-0000-0000-000000000008', name: 'Content Planning', definition: 'Lập kế hoạch phân phối nội dung game (sự kiện, tính năng mới, cập nhật content) theo từng giai đoạn của vòng đời game nhằm duy trì sự hứng thú của người chơi.', function: 'LiveOps', importance: 3 },
  ]

  for (const s of liveOpsSkills) {
    await prisma.skill.create({ data: s })
  }
  console.log(`[init-db] Seeded ${liveOpsSkills.length} LiveOps skills`)

  // ── Step 7: Seed skill levels ──────────────────────────────────────────────
  const skillLevels = [
    // Quality Assurance
    { skillId: 'a1000001-0000-0000-0000-000000000001', level: 1, label: 'Basic', description: 'Kiểm tra các chức năng cơ bản theo checklist (login, payment, events...)' },
    { skillId: 'a1000001-0000-0000-0000-000000000001', level: 2, label: 'Developing', description: 'Tự kiểm tra được nhiều khía cạnh: giao diện, thanh toán, event mà không cần hỏi thêm' },
    { skillId: 'a1000001-0000-0000-0000-000000000001', level: 3, label: 'Proficient', description: 'Dẫn dắt QA, phát hiện bugs phức tạp, thiết lập quy trình test chuẩn cho team' },
    { skillId: 'a1000001-0000-0000-0000-000000000001', level: 4, label: 'Expert', description: 'Thiết kế hệ thống QA toàn bộ, đào tạo team, đặt tiêu chuẩn chất lượng cho mỗi lần update' },
    // Technical & Integration Management
    { skillId: 'a1000001-0000-0000-0000-000000000002', level: 1, label: 'Basic', description: 'Hiểu và tham gia các hoạt động tích hợp giữa GPP và đối tác dưới sự hướng dẫn của senior (SDK, Server, Log, Tracking…).' },
    { skillId: 'a1000001-0000-0000-0000-000000000002', level: 2, label: 'Developing', description: 'Chủ động tham gia và xử lý các trao đổi liên quan đến Technical & Integration trong quá trình vận hành, không cần sự hướng dẫn của senior.' },
    { skillId: 'a1000001-0000-0000-0000-000000000002', level: 3, label: 'Proficient', description: 'Lập kế hoạch và quản lý toàn bộ Technical & Integration và quy trình release của game.' },
    { skillId: 'a1000001-0000-0000-0000-000000000002', level: 4, label: 'Expert', description: 'Làm chủ Kỹ thuật & Tích hợp: thiết kế kiến trúc integration, đánh giá platform mới, đào tạo team.' },
    // Game Stability & Monitoring
    { skillId: 'a1000001-0000-0000-0000-000000000003', level: 1, label: 'Basic', description: 'Có khả năng đọc hiểu và theo dõi các dashboard cơ bản hằng ngày.' },
    { skillId: 'a1000001-0000-0000-0000-000000000003', level: 2, label: 'Developing', description: 'Chủ động theo dõi các chỉ số healthy của game, phát hiện bất thường qua dashboard.' },
    { skillId: 'a1000001-0000-0000-0000-000000000003', level: 3, label: 'Proficient', description: 'Thiết kế dashboard và alert theo dõi healthy của game; xác định nguyên nhân, phối hợp dev xử lý.' },
    { skillId: 'a1000001-0000-0000-0000-000000000003', level: 4, label: 'Expert', description: 'Xây dựng quy trình monitoring 24/7, thiết lập SLA chuẩn, chủ động cải tiến cách đo lường dữ liệu.' },
    // Release & Patch Management
    { skillId: 'a1000001-0000-0000-0000-000000000004', level: 1, label: 'Basic', description: 'Thực hiện các công việc release theo checklist dưới sự hướng dẫn.' },
    { skillId: 'a1000001-0000-0000-0000-000000000004', level: 2, label: 'Developing', description: 'Chủ động tham dự vào quá trình release & patch management mà không cần sự hỗ trợ.' },
    { skillId: 'a1000001-0000-0000-0000-000000000004', level: 3, label: 'Proficient', description: 'Lập kế hoạch và quản lý Release & Patch Management, điều phối team thực hiện đúng tiến độ.' },
    { skillId: 'a1000001-0000-0000-0000-000000000004', level: 4, label: 'Expert', description: 'Xây dựng quy trình và release rhythm, đào tạo team và xử lý các sự cố ngoài kế hoạch.' },
    // Player Insights
    { skillId: 'a1000001-0000-0000-0000-000000000005', level: 1, label: 'Basic', description: 'Theo dõi và tổng hợp feedback từ cộng đồng game.' },
    { skillId: 'a1000001-0000-0000-0000-000000000005', level: 2, label: 'Developing', description: 'Kết hợp quan sát cộng đồng và phân tích dữ liệu hành vi người chơi để nhận diện xu hướng.' },
    { skillId: 'a1000001-0000-0000-0000-000000000005', level: 3, label: 'Proficient', description: 'Kết hợp dữ liệu và feedback cộng đồng để lập kế hoạch tối ưu trải nghiệm người dùng.' },
    { skillId: 'a1000001-0000-0000-0000-000000000005', level: 4, label: 'Expert', description: 'Sử dụng player insights để đưa ra quyết định chiến lược cho toàn bộ portfolio.' },
    // Game Balancing
    { skillId: 'a1000001-0000-0000-0000-000000000006', level: 1, label: 'Basic', description: 'Chủ động chơi và quan sát để đưa ra các cảm nhận cá nhân về các update mới.' },
    { skillId: 'a1000001-0000-0000-0000-000000000006', level: 2, label: 'Developing', description: 'Phân tích và đánh giá độ balance của game sau mỗi update dựa trên player insight và dữ liệu.' },
    { skillId: 'a1000001-0000-0000-0000-000000000006', level: 3, label: 'Proficient', description: 'Đưa các phương án đề xuất cân bằng cho các nội dung và event của game.' },
    { skillId: 'a1000001-0000-0000-0000-000000000006', level: 4, label: 'Expert', description: 'Thiết kế kế hoạch cân bằng và ngăn chặn tình trạng mất cân bằng về kinh tế và gameplay.' },
    // Monetization
    { skillId: 'a1000001-0000-0000-0000-000000000007', level: 1, label: 'Basic', description: 'Sử dụng các phương thức và nội dung kiếm tiền sẵn có (bundle, limited-time offer...)' },
    { skillId: 'a1000001-0000-0000-0000-000000000007', level: 2, label: 'Developing', description: 'Chủ động đề xuất điều chỉnh phương thức và nội dung kiếm tiền.' },
    { skillId: 'a1000001-0000-0000-0000-000000000007', level: 3, label: 'Proficient', description: 'Thiết kế các phương thức và nội dung kiếm tiền mới phù hợp với nhu cầu khách hàng.' },
    { skillId: 'a1000001-0000-0000-0000-000000000007', level: 4, label: 'Expert', description: 'Lập chiến lược kiếm tiền dài hạn, cân bằng giữa doanh thu và sự hài lòng người chơi.' },
    // Content Planning
    { skillId: 'a1000001-0000-0000-0000-000000000008', level: 1, label: 'Basic', description: 'Theo lịch content sẵn có, phối hợp công việc đơn giản.' },
    { skillId: 'a1000001-0000-0000-0000-000000000008', level: 2, label: 'Developing', description: 'Chủ động lên kế hoạch cho lịch event dựa trên nhu cầu khách hàng.' },
    { skillId: 'a1000001-0000-0000-0000-000000000008', level: 3, label: 'Proficient', description: 'Xây dựng roadmap content cả năm, phối hợp Dev/Marketing/CS.' },
    { skillId: 'a1000001-0000-0000-0000-000000000008', level: 4, label: 'Expert', description: 'Xây dựng và tối ưu các nguyên tắc cốt lõi để thiết kế roadmap nội dung hiệu quả.' },
  ]

  await prisma.skillLevel.createMany({ data: skillLevels })
  console.log(`[init-db] Seeded ${skillLevels.length} skill levels`)

  // ── Step 8: Seed skill standards ───────────────────────────────────────────
  const standards = [
    // QA (imp:1)
    { skillId: 'a1000001-0000-0000-0000-000000000001', jobLevel: '1.2', requiredLevel: 1 },
    { skillId: 'a1000001-0000-0000-0000-000000000001', jobLevel: '1.3', requiredLevel: 2 },
    { skillId: 'a1000001-0000-0000-0000-000000000001', jobLevel: '2.1', requiredLevel: 3 },
    { skillId: 'a1000001-0000-0000-0000-000000000001', jobLevel: '2.2', requiredLevel: 4 },
    { skillId: 'a1000001-0000-0000-0000-000000000001', jobLevel: '2.3', requiredLevel: 3 },
    { skillId: 'a1000001-0000-0000-0000-000000000001', jobLevel: '3.1', requiredLevel: 3 },
    // Tech Integration (imp:2)
    { skillId: 'a1000001-0000-0000-0000-000000000002', jobLevel: '1.2', requiredLevel: 1 },
    { skillId: 'a1000001-0000-0000-0000-000000000002', jobLevel: '1.3', requiredLevel: 2 },
    { skillId: 'a1000001-0000-0000-0000-000000000002', jobLevel: '2.1', requiredLevel: 3 },
    { skillId: 'a1000001-0000-0000-0000-000000000002', jobLevel: '2.2', requiredLevel: 4 },
    { skillId: 'a1000001-0000-0000-0000-000000000002', jobLevel: '2.3', requiredLevel: 3 },
    { skillId: 'a1000001-0000-0000-0000-000000000002', jobLevel: '3.1', requiredLevel: 3 },
    // Game Stability (imp:2)
    { skillId: 'a1000001-0000-0000-0000-000000000003', jobLevel: '1.2', requiredLevel: 1 },
    { skillId: 'a1000001-0000-0000-0000-000000000003', jobLevel: '1.3', requiredLevel: 2 },
    { skillId: 'a1000001-0000-0000-0000-000000000003', jobLevel: '2.1', requiredLevel: 3 },
    { skillId: 'a1000001-0000-0000-0000-000000000003', jobLevel: '2.2', requiredLevel: 4 },
    { skillId: 'a1000001-0000-0000-0000-000000000003', jobLevel: '2.3', requiredLevel: 4 },
    { skillId: 'a1000001-0000-0000-0000-000000000003', jobLevel: '3.1', requiredLevel: 4 },
    // Release & Patch (imp:2)
    { skillId: 'a1000001-0000-0000-0000-000000000004', jobLevel: '1.2', requiredLevel: 1 },
    { skillId: 'a1000001-0000-0000-0000-000000000004', jobLevel: '1.3', requiredLevel: 2 },
    { skillId: 'a1000001-0000-0000-0000-000000000004', jobLevel: '2.1', requiredLevel: 3 },
    { skillId: 'a1000001-0000-0000-0000-000000000004', jobLevel: '2.2', requiredLevel: 4 },
    { skillId: 'a1000001-0000-0000-0000-000000000004', jobLevel: '2.3', requiredLevel: 3 },
    { skillId: 'a1000001-0000-0000-0000-000000000004', jobLevel: '3.1', requiredLevel: 3 },
    // Player Insights (imp:3)
    { skillId: 'a1000001-0000-0000-0000-000000000005', jobLevel: '1.2', requiredLevel: 2 },
    { skillId: 'a1000001-0000-0000-0000-000000000005', jobLevel: '1.3', requiredLevel: 2 },
    { skillId: 'a1000001-0000-0000-0000-000000000005', jobLevel: '2.1', requiredLevel: 3 },
    { skillId: 'a1000001-0000-0000-0000-000000000005', jobLevel: '2.2', requiredLevel: 3 },
    { skillId: 'a1000001-0000-0000-0000-000000000005', jobLevel: '2.3', requiredLevel: 4 },
    { skillId: 'a1000001-0000-0000-0000-000000000005', jobLevel: '3.1', requiredLevel: 4 },
    // Game Balancing (imp:3)
    { skillId: 'a1000001-0000-0000-0000-000000000006', jobLevel: '1.2', requiredLevel: 1 },
    { skillId: 'a1000001-0000-0000-0000-000000000006', jobLevel: '1.3', requiredLevel: 1 },
    { skillId: 'a1000001-0000-0000-0000-000000000006', jobLevel: '2.1', requiredLevel: 2 },
    { skillId: 'a1000001-0000-0000-0000-000000000006', jobLevel: '2.2', requiredLevel: 2 },
    { skillId: 'a1000001-0000-0000-0000-000000000006', jobLevel: '2.3', requiredLevel: 3 },
    { skillId: 'a1000001-0000-0000-0000-000000000006', jobLevel: '3.1', requiredLevel: 4 },
    // Monetization (imp:3)
    { skillId: 'a1000001-0000-0000-0000-000000000007', jobLevel: '1.2', requiredLevel: 1 },
    { skillId: 'a1000001-0000-0000-0000-000000000007', jobLevel: '1.3', requiredLevel: 1 },
    { skillId: 'a1000001-0000-0000-0000-000000000007', jobLevel: '2.1', requiredLevel: 2 },
    { skillId: 'a1000001-0000-0000-0000-000000000007', jobLevel: '2.2', requiredLevel: 3 },
    { skillId: 'a1000001-0000-0000-0000-000000000007', jobLevel: '2.3', requiredLevel: 4 },
    { skillId: 'a1000001-0000-0000-0000-000000000007', jobLevel: '3.1', requiredLevel: 4 },
    // Content Planning (imp:3)
    { skillId: 'a1000001-0000-0000-0000-000000000008', jobLevel: '1.2', requiredLevel: 1 },
    { skillId: 'a1000001-0000-0000-0000-000000000008', jobLevel: '1.3', requiredLevel: 1 },
    { skillId: 'a1000001-0000-0000-0000-000000000008', jobLevel: '2.1', requiredLevel: 2 },
    { skillId: 'a1000001-0000-0000-0000-000000000008', jobLevel: '2.2', requiredLevel: 3 },
    { skillId: 'a1000001-0000-0000-0000-000000000008', jobLevel: '2.3', requiredLevel: 3 },
    { skillId: 'a1000001-0000-0000-0000-000000000008', jobLevel: '3.1', requiredLevel: 4 },
  ]

  await prisma.skillStandard.createMany({ data: standards })
  console.log(`[init-db] Seeded ${standards.length} skill standards`)

  console.log('[init-db] Database initialization complete!')
}

main()
  .catch((e) => {
    console.error('[init-db] Error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
