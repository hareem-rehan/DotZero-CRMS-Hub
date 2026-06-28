-- Drop old single-column unique index on email
DROP INDEX IF EXISTS "users_email_key";

-- Add compound unique index matching @@unique([email, role]) in schema
CREATE UNIQUE INDEX "users_email_role_key" ON "users"("email", "role");
