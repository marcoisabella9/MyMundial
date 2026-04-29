import { createClient } from '@supabase/supabase-js'
import { appConfig, hasSupabaseConfig } from './config'

export const supabase = hasSupabaseConfig
  ? createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey)
  : null

export function isSupabaseEnabled() {
  return Boolean(supabase)
}
