/**
 * scripts/db-migrate.mjs
 * Aplica todas las migraciones SQL a Supabase.
 *
 * Requiere: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY en .env.local
 * Uso: node scripts/db-migrate.mjs
 */

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Cargar .env.local manualmente (sin dotenv como dep)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "../.env.local");

try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
  }
} catch {
  console.warn("⚠️  No se encontró .env.local — usando variables de entorno del sistema.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectId = process.env.SUPABASE_PROJECT_ID;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("\n❌ Variables requeridas no encontradas en .env.local:");
  console.error("   NEXT_PUBLIC_SUPABASE_URL");
  console.error("   SUPABASE_SERVICE_ROLE_KEY\n");
  process.exit(1);
}

const migrationsDir = join(__dirname, "../migrations");

async function executeSql(sql) {
  // Supabase Management API — ejecuta SQL directo en el proyecto
  const url = `https://api.supabase.com/v1/projects/${projectId}/database/query`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }

  return res.json();
}

async function runMigrations() {
  if (!projectId) {
    console.error("\n❌ SUPABASE_PROJECT_ID no configurado en .env.local");
    console.error("\n📋 Alternativa: ejecutá el SQL manualmente en el Dashboard:");
    console.error(`   https://supabase.com/dashboard → SQL Editor → New query\n`);

    // Mostrar el SQL para que lo peguen
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      console.error(`\n── ${file} ──`);
      console.error(readFileSync(join(migrationsDir, file), "utf-8"));
    }
    process.exit(1);
  }

  console.log("🚀 Aplicando migraciones a Supabase...\n");

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("⚠️  No se encontraron archivos .sql en migrations/");
    return;
  }

  for (const file of files) {
    process.stdout.write(`  ▶ ${file} ... `);
    const sql = readFileSync(join(migrationsDir, file), "utf-8");

    try {
      await executeSql(sql);
      console.log("✅");
    } catch (err) {
      console.log("❌");
      console.error(`\n  Error en ${file}:`);
      console.error(`  ${err.message}\n`);
      console.error("📋 Podés ejecutarlo manualmente en el Dashboard de Supabase → SQL Editor\n");
      process.exit(1);
    }
  }

  console.log("\n✅ Todas las migraciones aplicadas correctamente.");
}

runMigrations();
