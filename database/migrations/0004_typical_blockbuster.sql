ALTER TABLE "audit_logs" ADD COLUMN "request_id" varchar(128);

UPDATE "audit_logs"
SET "request_id" = 'legacy-' || "id"::text
WHERE "request_id" IS NULL;

ALTER TABLE "audit_logs"
ALTER COLUMN "request_id" SET NOT NULL;

CREATE INDEX "audit_logs_request_id_idx"
ON "audit_logs" USING btree ("request_id");
