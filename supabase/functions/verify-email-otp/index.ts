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

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) throw new Error("Unauthorized");

    const { action, code } = await req.json();

    if (action === "send") {
      // Rate limit: max 3 OTPs in 5 minutes
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("email_verifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", fiveMinAgo);

      if ((count || 0) >= 3) {
        return new Response(JSON.stringify({ error: "Too many OTP requests. Wait 5 minutes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const otp = String(Math.floor(100000 + Math.random() * 900000));
      
      await supabase.from("email_verifications").insert({
        user_id: user.id,
        email: user.email,
        code: otp,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

      // Send email via send-email function
      const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
      
      // Try sending via Resend directly
      const { data: settingRow } = await supabase
        .from("site_settings").select("value").eq("key", "resend_api_key").single();
      const resendKey = settingRow?.value;

      const { data: senderRow } = await supabase
        .from("site_settings").select("value").eq("key", "email_sender").single();
      const sender = (senderRow?.value as string) || "Tronnlix <hello@tronnlix.com>";

      if (resendKey && typeof resendKey === "string" && resendKey.length > 5) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: sender,
            to: [user.email],
            subject: "Verify Your Email - Tronnlix",
            html: `
              <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;background:#ffffff;">
                <h1 style="font-size:24px;font-weight:700;color:#0a0e17;text-align:center;">Email Verification</h1>
                <p style="color:#374151;font-size:15px;">Hi ${name},</p>
                <p style="color:#374151;font-size:15px;">Enter this code to verify your email:</p>
                <div style="background:#f8f9fa;padding:20px;border-radius:12px;text-align:center;margin:20px 0;">
                  <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#0a0e17;">${otp}</span>
                </div>
                <p style="color:#6b7280;font-size:13px;">This code expires in 10 minutes.</p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
                <p style="color:#9ca3af;font-size:12px;text-align:center;">© ${new Date().getFullYear()} Tronnlix</p>
              </div>`,
          }),
        });
      } else {
        console.log(`[verify-email-otp] OTP for ${user.email}: ${otp}`);
      }

      return new Response(JSON.stringify({ sent: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      if (!code || code.length !== 6) {
        return new Response(JSON.stringify({ verified: false, error: "Invalid code format" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: otp } = await supabase
        .from("email_verifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("code", code)
        .eq("verified", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!otp) {
        return new Response(JSON.stringify({ verified: false, error: "Invalid code" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(otp.expires_at) < new Date()) {
        return new Response(JSON.stringify({ verified: false, error: "Code expired" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark verified
      await supabase.from("email_verifications").update({ verified: true }).eq("id", otp.id);
      
      // Update profile
      await supabase.from("profiles").update({ email_verified: true }).eq("user_id", user.id);

      // Send welcome email
      const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
      const { data: settingRow2 } = await supabase
        .from("site_settings").select("value").eq("key", "resend_api_key").single();
      const resendKey2 = settingRow2?.value;
      const { data: senderRow2 } = await supabase
        .from("site_settings").select("value").eq("key", "email_sender").single();
      const sender2 = (senderRow2?.value as string) || "Tronnlix <hello@tronnlix.com>";

      if (resendKey2 && typeof resendKey2 === "string" && resendKey2.length > 5) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey2}`,
          },
          body: JSON.stringify({
            from: sender2,
            to: [user.email],
            subject: "Welcome to Tronnlix!",
            html: `
              <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;background:#ffffff;">
                <h1 style="font-size:28px;font-weight:700;color:#0a0e17;text-align:center;">Welcome to Tronnlix! 🎉</h1>
                <p style="color:#374151;font-size:15px;">Hi ${name},</p>
                <p style="color:#374151;font-size:15px;">Your email has been verified. You're all set to start trading!</p>
                <p style="color:#374151;font-size:15px;">Next steps:</p>
                <ul style="color:#374151;font-size:14px;line-height:2;">
                  <li>Complete your KYC verification</li>
                  <li>Make your first deposit</li>
                  <li>Start trading with our AI-powered bots</li>
                </ul>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
                <p style="color:#9ca3af;font-size:12px;text-align:center;">© ${new Date().getFullYear()} Tronnlix</p>
              </div>`,
          }),
        });
      }

      return new Response(JSON.stringify({ verified: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
