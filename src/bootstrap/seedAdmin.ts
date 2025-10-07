import bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';

export async function seedAdmin(): Promise<void> {
  const repo = AppDataSource.getRepository(User);
  const email = process.env.ADMIN_EMAIL || 'admin@admin.com';
  const password = process.env.ADMIN_PASSWORD || 'admin';
  const name = process.env.ADMIN_NAME || 'Administrador';

  let user = await repo.findOne({ where: { email } });
  if (user) {
    return; // already exists
  }

  const saltRounds = 10;
  const hashed = await bcrypt.hash(password, saltRounds);

  user = repo.create({
    email,
    password: hashed,
    name,
    isActive: true,
  });

  await repo.save(user);
  // eslint-disable-next-line no-console
  console.log(`Seed: usuário admin criado => ${email}`);
}
