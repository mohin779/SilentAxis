process.env.PORT = process.env.PORT ?? "4000";
process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgres://test:test@localhost:5432/test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret";
process.env.ENCRYPTION_KEY_32 = process.env.ENCRYPTION_KEY_32 ?? "0123456789abcdef0123456789abcdef";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
