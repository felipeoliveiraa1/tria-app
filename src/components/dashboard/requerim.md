# 🔧 TRIA — Patch Pack (Vercel travando ficha + Home do dashboard sem dados)

> Cole este prompt no **Cursor** (ou siga manualmente) para aplicar **duas correções**:  
> **A)** “Ficha do paciente” travando (dependência de caches locais)  
> **B)** Home do **Dashboard** às vezes sem dados (cache/CDN/sessão)

---

## 🎯 Objetivos

1) **Paciente/[id]** não pode depender de caches antigos no `localStorage/sessionStorage`.  
2) **Dashboard** e suas **APIs** devem ser *no-store* (sem cache) e só buscar dados depois que a sessão do Supabase estiver pronta.

---

## ✅ Alteração A — Destravar a página do paciente e blindar caches locais

### Arquivos a criar/editar
- **CRIAR:** `src/lib/safe-storage.ts`
- **EDITAR:** `src/app/dashboard/patients/[id]/page.tsx`
- (se o preview/stream de áudio estiver nesta página, editar os `useEffect` que usam `audioFile`)

### 1) Criar utilitário de storage seguro
**`src/lib/safe-storage.ts`**
```ts
// src/lib/safe-storage.ts
type Entry<T> = { v: T; exp?: number };
const now = () => Date.now();

export function ssGet<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw) as Entry<T>;
    if (obj?.exp && obj.exp < now()) { sessionStorage.removeItem(key); return null; }
    return obj?.v ?? null;
  } catch { sessionStorage.removeItem(key); return null; }
}
export function ssSet<T>(key: string, v: T, ttlMs?: number) {
  try { sessionStorage.setItem(key, JSON.stringify({ v, exp: ttlMs ? now() + ttlMs : undefined })); } catch {}
}
export function ssDel(key: string) { try { sessionStorage.removeItem(key); } catch {} }

export function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw) as Entry<T>;
    if (obj?.exp && obj.exp < now()) { localStorage.removeItem(key); return null; }
    return obj?.v ?? null;
  } catch { localStorage.removeItem(key); return null; }
}
export function lsSet<T>(key: string, v: T, ttlMs?: number) {
  try { localStorage.setItem(key, JSON.stringify({ v, exp: ttlMs ? now() + ttlMs : undefined })); } catch {}
}
export function lsDel(key: string) { try { localStorage.removeItem(key); } catch {} }
2) Forçar página dinâmica + invalidar caches por ID e evitar loop em audioFile
src/app/dashboard/patients/[id]/page.tsx (topo do arquivo)

ts
Copiar
Editar
export const dynamic = 'force-dynamic';
export const revalidate = 0;
Dentro do componente

ts
Copiar
Editar
import { lsGet, lsSet, lsDel, ssGet, ssSet, ssDel } from '@/lib/safe-storage';
import { useEffect, useState } from 'react';

// gera chave de cache por ID e versão (para invalidar automaticamente se mudar estrutura)
const VERSION = 'v2';
const cacheKey = (id: string) => `patient:${VERSION}:view:${id}`;

useEffect(() => {
  // se existia chave genérica antiga, apaga (evita travar ao alternar itens)
  try { lsDel('patient:view'); ssDel('patient:view'); } catch {}
}, []);

const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  let alive = true;
  (async () => {
    try {
      setLoading(true);
      setError(null);

      // ... carregue patient/consultas/áudios **sempre do backend**
      // Se precisar aproveitar cache, só use dados válidos do ID atual:
      const cached = typeof window !== 'undefined' ? lsGet<any>(cacheKey(params.id)) : null;
      // hydrate state com "cached" se quiser (opcional)

      // exemplo defensivo para audio cache
      const aKey = `patient:audio:${params.id}`;
      const audioCached = ssGet<any>(aKey);
      if (audioCached && !audioCached.url) ssDel(aKey);

      // ... setStates(); lsSet(cacheKey(params.id), state, 30*60*1000);

    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar dados do paciente.');
    } finally {
      if (alive) setLoading(false);
    }
  })();
  return () => { alive = false; };
}, [params.id]);
Blindar efeitos que usam audioFile

ts
Copiar
Editar
useEffect(() => {
  if (!audioFile || !audioFile.url) return;       // não inicia stream sem URL
  startStreamingAudio(audioFile.url);
  return () => stopStreamingAudio?.();
}, [audioFile]);
Renderização defensiva

tsx
Copiar
Editar
if (loading) return <FullScreenLoader label="Carregando ficha do paciente..." />;
if (error)   return <ErrorState title="Não foi possível carregar a ficha" description={error} actionLabel="Tentar novamente" onAction={() => router.refresh()} />;
✅ Alteração B — Dashboard sem dados após refresh (desligar cache + sessão pronta)
Arquivos a editar
Página: src/app/dashboard/page.tsx

APIs (todas usadas pelo dashboard):

src/app/api/consultations/route.ts

src/app/api/patients/route.ts

src/app/api/transcriptions/route.ts

src/app/api/audio-files/route.ts

(e outras que a home consome)

Hooks de dados: src/hooks/use-data.ts (ou onde você faz fetch/SWR/React Query)

Auth Context: src/contexts/auth-context.tsx

1) Dashboard: página sempre dinâmica
src/app/dashboard/page.tsx

ts
Copiar
Editar
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { unstable_noStore as noStore } from 'next/cache';
noStore(); // se for Server Component
2) APIs: sem cache e com cabeçalho Cache-Control: no-store
Ex.: src/app/api/consultations/route.ts (repita nas demais APIs)

ts
Copiar
Editar
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  // ... sua lógica
  const payload = { /* ... */ };
  const res = NextResponse.json(payload, { status: 200 });
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  return res;
}
3) Fetches do cliente: cache: 'no-store' (ou SWR/RQ configurados)
src/hooks/use-data.ts (adaptar ao seu hook)

ts
Copiar
Editar
async function fetchJSON(url: string, init?: RequestInit) {
  for (let i = 0; i < 2; i++) {
    const res = await fetch(url, { cache: 'no-store', ...init });
    if (res.ok) return res.json();
    if (res.status === 401 || res.status === 429) {
      await new Promise(r => setTimeout(r, 200 + Math.random()*400));
      continue;
    }
    throw new Error(`${res.status} ${res.statusText}`);
  }
  throw new Error('Falha após tentativas');
}
SWR: revalidateOnFocus: true, revalidateOnReconnect: true, dedupingInterval: 0
React Query: staleTime: 0, refetchOnWindowFocus: true

4) Só buscar dados depois que a sessão estiver pronta
src/contexts/auth-context.tsx (expor sessionReady)

ts
Copiar
Editar
const [sessionReady, setSessionReady] = useState(false);

useEffect(() => {
  const sub = supabase.auth.onAuthStateChange(() => setSessionReady(true)).data?.subscription;
  supabase.auth.getSession().finally(() => setSessionReady(true));
  return () => { try { sub?.unsubscribe(); } catch {} };
}, []);
Nos componentes do dashboard que carregam dados

ts
Copiar
Editar
const { user, sessionReady } = useAuth();

useEffect(() => {
  if (!sessionReady) return;
  if (!user) return; // opcional: redirecionar para /login
  loadData();
}, [sessionReady, user]);
🧪 Teste rápido
Vercel: abrir /dashboard e dar vários refreshs → listas devem sempre carregar.

Abrir vários pacientes diferentes em sequência → a ficha abre sem travar; recarregar não exige limpar localStorage.

Deslogar/logar → dashboard revalida e APIs não retornam dados “antigos”.

📌 Observações
Se existirem Server Components que leem diretamente do Supabase, use noStore() e crie o client por request (via cookies()).

Ignore logs como “Feature is disabled” e “A listener indicated an asynchronous response…”: são de extensões do navegador (content scripts), não do app.

makefile
Copiar
Editar
::contentReference[oaicite:0]{index=0}