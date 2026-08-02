CREATE TABLE "source_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "source_chunks" ADD CONSTRAINT "source_chunks_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;