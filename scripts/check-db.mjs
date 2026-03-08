#!/usr/bin/env node
/**
 * 检查 .env 和 MySQL 连接、表是否存在
 * 运行: npm run check-db（需在项目根目录）
 */
import { config } from "dotenv";
config(); // 从项目根目录加载 .env
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
const DEV_USER_EMAIL = process.env.DEV_USER_EMAIL;

console.log("=== 环境检查 ===\n");

if (!DATABASE_URL) {
  console.error("❌ .env 里没有 DATABASE_URL，请配置后再试。");
  process.exit(1);
}
// 解析出用户名，方便确认是否误写了中文
try {
  const u = new URL(DATABASE_URL.replace(/^mysql:\/\//, "http://"));
  const user = u.username || "(空)";
  console.log("✅ DATABASE_URL 已配置");
  console.log("   当前读取到的用户名:", user === "(空)" ? "(无)" : user);
  if (/[\u4e00-\u9fa5]/.test(user)) {
    console.error("\n❌ 用户名里不能是中文！请改成英文，例如 root");
    process.exit(1);
  }
} catch {
  console.log("✅ DATABASE_URL 已配置");
}

if (!DEV_USER_EMAIL) {
  console.warn("⚠️  未配置 DEV_USER_EMAIL，开发直通不会生效");
} else {
  console.log("✅ DEV_USER_EMAIL 已配置:", DEV_USER_EMAIL);
}

console.log("\n=== 连接 MySQL ===\n");

let conn;
try {
  conn = await mysql.createConnection(DATABASE_URL);
  console.log("✅ MySQL 连接成功");
} catch (err) {
  console.error("❌ MySQL 连接失败:", err.message);
  if (err.message.includes("ECONNREFUSED")) {
    console.error("\n→ 请确认 MySQL 已启动: brew services start mysql");
  }
  if (err.message.includes("Access denied")) {
    console.error("\n→ 请检查 .env 里 DATABASE_URL 的用户名和密码是否正确");
  }
  process.exit(1);
}

try {
  const [rows] = await conn.execute(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'"
  );
  if (rows.length === 0) {
    console.error("❌ 数据库里没有 users 表");
    console.error("\n→ 请执行建表: npm run db:push");
    process.exit(1);
  }
  console.log("✅ users 表已存在");
} catch (err) {
  console.error("❌ 查询失败:", err.message);
  process.exit(1);
} finally {
  await conn.end();
}

console.log("\n=== 检查通过，可以启动: npm run dev ===\n");
