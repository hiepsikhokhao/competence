const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');

const supabase = createClient(
  'https://ymvnrgtnirczagvxfxsv.supabase.co',  // Project URL
  'sb_publishable_6mJ71OS-6RCP6g7WvBjWBA_oh19ysty'  // service_role key
);

const emails = ['hr@vng.com.vn', 'manager1@vng.com.vn', 'emp1@vng.com.vn', 'emp2@vng.com.vn'];
const { data: { users } } = await supabase.auth.admin.listUsers();

for (const email of emails) {
  const user = users.find(u => u.email === email);
  if (!user) { console.log('Not found:', email); continue; }
  const { error } = await supabase.auth.admin.updateUserById(user.id, { 
    password: '123456', 
    email_confirm: true 
  });
  console.log(email, error ? 'FAILED: ' + error.message : 'OK ✓');
}

openclaw auth add deepseek --key sk-c60194901149463ca7eec6cdee3a5bd4 --endpoint https://api.deepseek.com
export OPENAI_API_KEY="sk-c60194901149463ca7eec6cdee3a5bd4" &&
export OPENAI_BASE_URL="https://api.deepseek.com"

OPENAI_API_KEY="sk-c60194901149463ca7eec6cdee3a5bd4" OPENAI_BASE_URL="https://api.deepseek.com" openclaw dashboard

echo 'export DEEPSEEK_API_KEY="sk-c60194901149463ca7eec6cdee3a5bd4"' >> ~/.zshrc
source ~/.zshrc

OPENROUTER Key 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

