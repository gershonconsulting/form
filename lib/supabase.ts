import { createClient } from '@supabase/supabase-js';

let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!_client) {
    _client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return _client;
}

// Lazy proxy — createClient is never called at module import time,
// only when a route handler actually invokes a method.
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get(_: any, prop: string | symbol) {
    return (getClient() as any)[prop];
  },
});
