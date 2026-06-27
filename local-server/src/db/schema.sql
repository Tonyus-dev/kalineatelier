-- Schema da Kaline Offline (PR 2). Aplicado de forma idempotente por migrate.ts.
-- Timestamps em ISO 8601 (UTC), gerados em JS com `new Date().toISOString()`.

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_threads (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  facet TEXT NOT NULL CHECK (facet IN ('kaline', 'kharis', 'kuanyin', 'coder')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  metadata_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id, created_at);

CREATE TABLE IF NOT EXISTS registro_vivo (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (
    kind IN ('nota', 'evento', 'sentimento', 'ideia', 'dor', 'ganho', 'sonho', 'pergunta', 'decisao')
  ),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_registro_vivo_kind ON registro_vivo(kind, created_at);

CREATE TABLE IF NOT EXISTS jardim_memorias (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  ease REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  due_at TEXT,
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  source_sedimento_id TEXT REFERENCES sedimentos(id)
);
CREATE INDEX IF NOT EXISTS idx_jardim_memorias_due_at ON jardim_memorias(due_at);

-- Sedimento é hipótese. Sedimentação não confirma verdade.
CREATE TABLE IF NOT EXISTS sedimentos (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('em_revisao', 'confirmado', 'descartado', 'promovido')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  confirmed_at TEXT,
  discarded_at TEXT,
  metadata_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_sedimentos_status ON sedimentos(status);

CREATE TABLE IF NOT EXISTS decisoes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  project TEXT,
  status TEXT NOT NULL DEFAULT 'aberta',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  kind TEXT NOT NULL,
  content_md TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Preparado para a ponte futura. Nesta fase só recebe eventos locais via API,
-- sem criptografia, Worker ou sync.
CREATE TABLE IF NOT EXISTS inbox_events (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  payload_json TEXT NOT NULL,
  trust_level TEXT NOT NULL CHECK (trust_level IN ('local', 'untrusted', 'trusted')) DEFAULT 'local',
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'discarded', 'processed', 'error')) DEFAULT 'pending',
  received_at TEXT NOT NULL,
  processed_at TEXT,
  error TEXT,
  metadata_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_inbox_events_status ON inbox_events(status);
