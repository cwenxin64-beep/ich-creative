import { pgTable, serial, varchar, timestamp, text, jsonb } from "drizzle-orm/pg-core"

// 用户表 - 用于识别不同用户
export const users = pgTable("users", {
  id: serial().notNull().primaryKey(),
  device_id: varchar("device_id", { length: 255 }).notNull().unique(), // 设备唯一标识，用于匿名用户识别
  nickname: varchar("nickname", { length: 100 }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 收藏表 - 按用户隔离
export const favorites = pgTable("favorites", {
  id: serial().notNull().primaryKey(),
  user_id: serial("user_id").notNull().references(() => users.id), // 关联用户
  type: varchar("type", { length: 50 }).notNull(), // photo, audio, play, use
  image_url: text("image_url"),
  video_url: text("video_url"),
  title: varchar("title", { length: 255 }),
  metadata: jsonb("metadata"), // 存储额外信息
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 健康检查表（保留原有）
export const healthCheck = pgTable("health_check", {
  id: serial().notNull().primaryKey(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});
