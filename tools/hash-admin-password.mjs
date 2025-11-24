import bcrypt from 'bcrypt';

const password = process.env.ADMIN_PLAIN_PASSWORD || 'HugsAdmin!2025';

(async () => {
  const hash = await bcrypt.hash(password, 10);
  console.log(hash);
})();
