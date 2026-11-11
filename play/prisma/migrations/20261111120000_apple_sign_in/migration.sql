-- Sign in with Apple subjects and hashed native bearer tokens.
-- Apply with: npx prisma migrate deploy

CREATE TABLE "AppleSignIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sub" TEXT NOT NULL,
    "email" TEXT,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppleSignIn_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppleSignIn_userId_key" ON "AppleSignIn"("userId");
CREATE UNIQUE INDEX "AppleSignIn_sub_key" ON "AppleSignIn"("sub");

ALTER TABLE "AppleSignIn" ADD CONSTRAINT "AppleSignIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "BearerToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BearerToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BearerToken_tokenHash_key" ON "BearerToken"("tokenHash");
CREATE INDEX "BearerToken_userId_idx" ON "BearerToken"("userId");

ALTER TABLE "BearerToken" ADD CONSTRAINT "BearerToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
