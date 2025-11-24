DO $$
DECLARE
  v_id text;
BEGIN
  SELECT id INTO v_id FROM "User" WHERE email = 'admin@hugs.garden';

  IF v_id IS NULL THEN
    INSERT INTO "User" ("id","email","password","role","createdAt","updatedAt")
    VALUES (
      gen_random_uuid(),
      'admin@hugs.garden',
      '$2b$10$bEM0WFi13laECVFe52uXoeSze7zzL/wo0WQ87T/3j0YO1jNt/zI.6',
      'ADMIN',
      NOW(),
      NOW()
    );
  ELSE
    UPDATE "User"
       SET "password"  = '$2b$10$bEM0WFi13laECVFe52uXoeSze7zzL/wo0WQ87T/3j0YO1jNt/zI.6',
           "role"      = 'ADMIN',
           "updatedAt" = NOW()
     WHERE "id" = v_id;
  END IF;
END
$$;
