export const appConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  dataProvider: import.meta.env.VITE_FOOTBALL_DATA_PROVIDER ?? 'mock',
}

export const hasSupabaseConfig = Boolean(appConfig.supabaseUrl && appConfig.supabaseAnonKey)

export const runtimeMode = hasSupabaseConfig ? 'supabase-ready' : 'local-beta'

export const productionChecklist = [
  {
    label: 'Supabase auth and database',
    state: hasSupabaseConfig ? 'configured' : 'env needed',
    detail: hasSupabaseConfig
      ? 'Browser has a Supabase URL and anon key.'
      : 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY after creating the Supabase project.',
  },
  {
    label: 'Football provider keys',
    state: appConfig.dataProvider === 'mock' ? 'mock mode' : 'API trial mode',
    detail: 'API-FOOTBALL is the first V1 target. Provider keys stay server-side in Supabase Edge Functions.',
  },
  {
    label: 'Normalized schema',
    state: 'ready to apply',
    detail: 'Initial SQL migration covers users, leagues, fixtures, predictions, award picks, and scoring.',
  },
]
