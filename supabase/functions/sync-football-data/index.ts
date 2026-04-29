// Supabase Edge Function scaffold.
// Deploy with: supabase functions deploy sync-football-data

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createApiFootballProvider, createSportmonksProvider } from "./providers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-secret",
};

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const configuredSecret = Deno.env.get("SYNC_CRON_SECRET");
  const incomingSecret = request.headers.get("x-sync-secret");

  if (configuredSecret && incomingSecret !== configuredSecret) {
    return json({ error: "unauthorized" }, 401);
  }

  const url = new URL(request.url);
  const providerName = url.searchParams.get("provider") ?? Deno.env.get("FOOTBALL_DATA_PROVIDER") ?? "sportmonks";
  const resource = url.searchParams.get("resource") ?? "fixtures";

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Missing Supabase service configuration" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const provider = providerName === "api-football"
    ? createApiFootballProvider(Deno.env.get("APIFOOTBALL_API_KEY") ?? "")
    : createSportmonksProvider(Deno.env.get("SPORTMONKS_API_TOKEN") ?? "");

  const startedAt = new Date().toISOString();
  const { data: run } = await supabase
    .from("provider_sync_runs")
    .insert({ provider: provider.name, resource, status: "running", started_at: startedAt })
    .select("id")
    .single();

  try {
    const items = await provider.sync(resource);
    await supabase
      .from("provider_sync_runs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        summary: { count: items.length, provider: provider.name, resource },
      })
      .eq("id", run?.id);

    // The first deploy should validate provider coverage. Upsert table writes
    // should be added per resource after the trial provider is selected.
    return json({ provider: provider.name, resource, count: items.length, items: items.slice(0, 5) });
  } catch (error) {
    await supabase
      .from("provider_sync_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : String(error),
      })
      .eq("id", run?.id);

    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}
