/**
 * scripts/db-seed.mjs
 * Inserta categorías preset en Supabase.
 * Uso: node scripts/db-seed.mjs
 */

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

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
  console.warn("⚠️  No se encontró .env.local");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || (!anonKey && !serviceRoleKey)) {
  console.error("❌ Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
  process.exit(1);
}

const key = serviceRoleKey || anonKey;

const PRESET_CATEGORIES = [
  { name: "Supermercado",    emoji: "🛒", color_bg: "#dcfce7", color_text: "#15803d" },
  { name: "Comida",          emoji: "🍔", color_bg: "#fef9c3", color_text: "#a16207" },
  { name: "Transporte",      emoji: "🚗", color_bg: "#dbeafe", color_text: "#1d4ed8" },
  { name: "Salud",           emoji: "💊", color_bg: "#fce7f3", color_text: "#9d174d" },
  { name: "Entretenimiento", emoji: "🎬", color_bg: "#ede9fe", color_text: "#6d28d9" },
  { name: "Ropa",            emoji: "👕", color_bg: "#fef3c7", color_text: "#d97706" },
  { name: "Servicios",       emoji: "⚡", color_bg: "#e0f2fe", color_text: "#0369a1" },
  { name: "Viajes",          emoji: "✈️", color_bg: "#f0fdf4", color_text: "#15803d" },
  { name: "Tecnología",      emoji: "💻", color_bg: "#f1f5f9", color_text: "#475569" },
  { name: "Gastos de tarjeta", emoji: "🏦", color_bg: "#e0e7ff", color_text: "#4338ca" },
  { name: "Otro",            emoji: "📦", color_bg: "#f5f5f4", color_text: "#57534e" },
];

async function seed() {
  console.log("🌱 Insertando categorías preset...\n");

  const res = await fetch(`${supabaseUrl}/rest/v1/categories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "resolution=ignore-duplicates",
    },
    body: JSON.stringify(
      PRESET_CATEGORIES.map((c) => ({
        ...c,
        user_id: null,
        is_preset: true,
      }))
    ),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`❌ Error: ${res.status} ${body}`);
    process.exit(1);
  }

  console.log(`✅ ${PRESET_CATEGORIES.length} categorías preset insertadas (o ya existían).`);
}

seed();
