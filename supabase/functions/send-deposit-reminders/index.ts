import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get Resend key
    const { data: settingRow } = await supabase
      .from("site_settings").select("value").eq("key", "resend_api_key").single();
    const resendKey = settingRow?.value;

    if (!resendKey || typeof resendKey !== "string" || resendKey.length < 5) {
      return new Response(JSON.stringify({ sent: 0, reason: "no_resend_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: senderRow } = await supabase
      .from("site_settings").select("value").eq("key", "email_sender").single();
    const sender = (senderRow?.value as string) || "Tronnlix <hello@tronnlix.com>";

    // Find users who signed up > 3 days ago with no deposits
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, display_name")
      .lt("created_at", threeDaysAgo)
      .eq("email_verified", true);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;
    for (const profile of profiles) {
      // Check if user has any completed deposits
      const { count } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.user_id)
        .eq("type", "deposit")
        .eq("status", "completed");

      if ((count || 0) > 0) continue;

      // Check if we already sent a reminder in last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: reminderCount } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.user_id)
        .eq("type", "reminder_sent")
        .gte("created_at", sevenDaysAgo);

      if ((reminderCount || 0) > 0) continue;

      if (!profile.email) continue;

      const name = profile.display_name || profile.email.split("@")[0];

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: sender,
            to: [profile.email],
            subject: "Your Tronnlix Account is Waiting",
            html: `
              <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;background:#ffffff;">
                <h1 style="font-size:24px;font-weight:700;color:#0a0e17;text-align:center;">Start Trading Today</h1>
                <p style="color:#374151;font-size:15px;">Hi ${name},</p>
                <p style="color:#374151;font-size:15px;">We noticed you haven't made your first deposit yet. Fund your account to start trading with Tronnlix's powerful tools and AI bots.</p>
                <div style="text-align:center;margin:24px 0;">
                  <a href="https://tron3.lovable.app/deposit" style="background:#d4a017;color:#0a0e17;padding:14px 32px;border-radius:12px;font-weight:bold;text-decoration:none;display:inline-block;">Make a Deposit</a>
                </div>
                <p style="color:#6b7280;font-size:13px;">Minimum deposit: $30 USD equivalent.</p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
                <p style="color:#9ca3af;font-size:12px;text-align:center;">© ${new Date().getFullYear()} Tronnlix</p>
              </div>`,
          }),
        });
        sentCount++;
      } catch (e) {
        console.error(`Failed to send reminder to ${profile.email}:`, e);
      }
    }

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
