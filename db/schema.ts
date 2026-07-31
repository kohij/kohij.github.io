import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const patchNotes = sqliteTable("patch_notes", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  changes: text("changes").notNull(),
  position: integer("position").notNull(),
  updatedAt: text("updated_at").notNull(),
});
