export const appConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  dataProvider: import.meta.env.VITE_FOOTBALL_DATA_PROVIDER ?? 'mock',
}

export const hasSupabaseConfig = Boolean(appConfig.supabaseUrl && appConfig.supabaseAnonKey)
