-- Own skins for the Premium skin builder.
-- Additive: new tables, a trigger, and foreign keys. No existing table is
-- rewritten and no existing row is updated. Apply from play/:
--   npx prisma migrate deploy

CREATE TABLE "OwnSkin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "configVersion" INTEGER NOT NULL DEFAULT 1,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnSkin_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OwnSkin_name_len" CHECK (char_length("name") BETWEEN 1 AND 24),
    CONSTRAINT "OwnSkin_config_object" CHECK (jsonb_typeof("config") = 'object'),
    CONSTRAINT "OwnSkin_config_version" CHECK ("configVersion" >= 1)
);

CREATE INDEX "OwnSkin_userId_idx" ON "OwnSkin"("userId");

ALTER TABLE "OwnSkin" ADD CONSTRAINT "OwnSkin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "OwnSkinEquip" (
    "userId" TEXT NOT NULL,
    "skinId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnSkinEquip_pkey" PRIMARY KEY ("userId")
);

CREATE UNIQUE INDEX "OwnSkinEquip_skinId_key" ON "OwnSkinEquip"("skinId");

ALTER TABLE "OwnSkinEquip" ADD CONSTRAINT "OwnSkinEquip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OwnSkinEquip" ADD CONSTRAINT "OwnSkinEquip_skinId_fkey" FOREIGN KEY ("skinId") REFERENCES "OwnSkin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Caps an account at 12 own skins, including writers that skip the API.
-- Locks the user row first so it lines up with the API transaction.
CREATE FUNCTION own_skin_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    skin_count integer;
BEGIN
    PERFORM 1 FROM "User" WHERE "id" = NEW."userId" FOR UPDATE;
    SELECT COUNT(*) INTO skin_count FROM "OwnSkin" WHERE "userId" = NEW."userId";
    IF skin_count >= 12 THEN
        RAISE EXCEPTION 'own_skin_limit';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "OwnSkin_limit"
BEFORE INSERT ON "OwnSkin"
FOR EACH ROW
EXECUTE FUNCTION own_skin_limit();
