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

    // Get auth user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) throw new Error("Unauthorized");

    const { action, otp_id, code, transaction_data } = await req.json();

    if (action === "send") {
      // Generate 6-digit code
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));

      // Store OTP
      const { data: otp, error: otpErr } = await supabase
        .from("withdrawal_otps")
        .insert({
          user_id: user.id,
          code: otpCode,
          transaction_data: transaction_data,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
        .select("id")
        .single();

      if (otpErr) throw otpErr;

      // Get Resend API key from site_settings
      const { data: settingRow } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "resend_api_key")
        .single();

      const resendKey = settingRow?.value;

      if (resendKey && typeof resendKey === "string" && resendKey.length > 5) {
        // Send email via Resend
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "Tronnlix <noreply@tronnlix.com>",
            to: [user.email],
            subject: "Withdrawal Verification Code",
            html: `
              <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px;">
                <h2 style="color:#0a0e17;">Withdrawal Verification</h2>
                <p>Your withdrawal verification code is:</p>
                <div style="background:#f4f4f5;padding:16px 24px;border-radius:12px;text-align:center;margin:16px 0;">
                  <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#0a0e17;">${otpCode}</span>
                </div>
                <p style="color:#71717a;font-size:13px;">This code expires in 10 minutes. If you did not request this withdrawal, please contact support immediately.</p>
              </div>
            `,
          }),
        });

        if (!emailRes.ok) {
          console.error("Resend error:", await emailRes.text());
        }
      } else {
        // No Resend key configured – log the OTP for admin to see
        console.log(`OTP for ${user.email}: ${otpCode}`);
      }

      return new Response(JSON.stringify({ otp_id: otp.id, sent: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      // Verify OTP
      const { data: otp, error: otpErr } = await supabase
        .from("withdrawal_otps")
        .select("*")
        .eq("id", otp_id)
        .eq("user_id", user.id)
        .eq("verified", false)
        .single();

      if (otpErr || !otp) {
        return new Response(JSON.stringify({ verified: false, error: "Invalid or expired code" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(otp.expires_at) < new Date()) {
        return new Response(JSON.stringify({ verified: false, error: "Code expired" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (otp.code !== code) {
        return new Response(JSON.stringify({ verified: false, error: "Incorrect code" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark verified
      await supabase.from("withdrawal_otps").update({ verified: true }).eq("id", otp_id);

      // Create the withdrawal transaction
      const txData = otp.transaction_data as any;
      const { data: tx, error: txErr } = await supabase.from("transactions").insert({
        user_id: user.id,
        type: "withdrawal",
        crypto_id: txData.crypto_id,
        amount: txData.amount,
        usd_amount: txData.usd_amount,
        wallet_address: txData.wallet_address,
        network: txData.network,
        status: "pending",
      }).select("id").single();

      if (txErr) throw txErr;

      return new Response(JSON.stringify({ verified: true, transaction_id: tx.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
