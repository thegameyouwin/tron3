import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HTML email templates
const templates: Record<string, (data: any) => { subject: string; html: string }> = {
  welcome: (data) => ({
    subject: "Welcome to Tronnlix!",
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;background:#ffffff;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="font-size:28px;font-weight:700;color:#0a0e17;margin:0;">Welcome to Tronnlix</h1>
        </div>
        <p style="color:#374151;font-size:15px;line-height:1.6;">Hi ${data.name || "there"},</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;">Thank you for joining Tronnlix! Your account has been created successfully.</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;">Please verify your email to unlock all features:</p>
        <div style="background:#f8f9fa;padding:20px;border-radius:12px;text-align:center;margin:20px 0;">
          <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#0a0e17;">${data.otp}</span>
        </div>
        <p style="color:#6b7280;font-size:13px;">This code expires in 10 minutes.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="color:#9ca3af;font-size:12px;text-align:center;">© ${new Date().getFullYear()} Tronnlix. All rights reserved.</p>
      </div>`,
  }),

  verify_email: (data) => ({
    subject: "Verify Your Email - Tronnlix",
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;background:#ffffff;">
        <h1 style="font-size:24px;font-weight:700;color:#0a0e17;text-align:center;">Email Verification</h1>
        <p style="color:#374151;font-size:15px;line-height:1.6;">Your verification code is:</p>
        <div style="background:#f8f9fa;padding:20px;border-radius:12px;text-align:center;margin:20px 0;">
          <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#0a0e17;">${data.otp}</span>
        </div>
        <p style="color:#6b7280;font-size:13px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="color:#9ca3af;font-size:12px;text-align:center;">© ${new Date().getFullYear()} Tronnlix</p>
      </div>`,
  }),

  deposit_confirmed: (data) => ({
    subject: "Deposit Confirmed - Tronnlix",
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;background:#ffffff;">
        <h1 style="font-size:24px;font-weight:700;color:#0a0e17;text-align:center;">Deposit Confirmed ✅</h1>
        <p style="color:#374151;font-size:15px;">Your deposit has been confirmed:</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;border-radius:12px;margin:16px 0;">
          <p style="margin:4px 0;color:#166534;font-size:14px;"><strong>Amount:</strong> ${data.amount} ${data.crypto || "USDT"}</p>
          <p style="margin:4px 0;color:#166534;font-size:14px;"><strong>USD Value:</strong> $${data.usd_amount || "0.00"}</p>
          <p style="margin:4px 0;color:#166534;font-size:14px;"><strong>Network:</strong> ${data.network || "N/A"}</p>
        </div>
        <p style="color:#6b7280;font-size:13px;">Your balance has been updated.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="color:#9ca3af;font-size:12px;text-align:center;">© ${new Date().getFullYear()} Tronnlix</p>
      </div>`,
  }),

  withdrawal_confirmed: (data) => ({
    subject: "Withdrawal Request Submitted - Tronnlix",
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;background:#ffffff;">
        <h1 style="font-size:24px;font-weight:700;color:#0a0e17;text-align:center;">Withdrawal Submitted</h1>
        <p style="color:#374151;font-size:15px;">Your withdrawal request is being processed:</p>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:16px;border-radius:12px;margin:16px 0;">
          <p style="margin:4px 0;color:#1e40af;font-size:14px;"><strong>Amount:</strong> ${data.amount} ${data.crypto || "USDT"}</p>
          <p style="margin:4px 0;color:#1e40af;font-size:14px;"><strong>USD Value:</strong> $${data.usd_amount || "0.00"}</p>
          <p style="margin:4px 0;color:#1e40af;font-size:14px;"><strong>Address:</strong> ${data.wallet_address ? data.wallet_address.slice(0, 12) + "..." : "N/A"}</p>
        </div>
        <p style="color:#6b7280;font-size:13px;">You'll receive another email when the withdrawal is completed.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="color:#9ca3af;font-size:12px;text-align:center;">© ${new Date().getFullYear()} Tronnlix</p>
      </div>`,
  }),

  account_upgrade: (data) => ({
    subject: "Account Upgraded - Tronnlix",
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;background:#ffffff;">
        <h1 style="font-size:24px;font-weight:700;color:#0a0e17;text-align:center;">Account Upgraded 🎉</h1>
        <p style="color:#374151;font-size:15px;">Congratulations! Your account has been upgraded to:</p>
        <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);padding:20px;border-radius:12px;text-align:center;margin:16px 0;">
          <span style="font-size:28px;font-weight:bold;color:#92400e;">${data.tier || "Pro"} Tier</span>
        </div>
        <p style="color:#374151;font-size:15px;">You now have access to enhanced features and higher limits.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="color:#9ca3af;font-size:12px;text-align:center;">© ${new Date().getFullYear()} Tronnlix</p>
      </div>`,
  }),

  deposit_reminder: (data) => ({
    subject: "Your Tronnlix Account is Waiting",
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;background:#ffffff;">
        <h1 style="font-size:24px;font-weight:700;color:#0a0e17;text-align:center;">Start Trading Today</h1>
        <p style="color:#374151;font-size:15px;">Hi ${data.name || "there"},</p>
        <p style="color:#374151;font-size:15px;">We noticed you haven't made your first deposit yet. Fund your account to start trading with Tronnlix's powerful tools.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${data.deposit_url || 'https://tronnlix.com/deposit'}" style="background:#d4a017;color:#0a0e17;padding:14px 32px;border-radius:12px;font-weight:bold;text-decoration:none;display:inline-block;">Make a Deposit</a>
        </div>
        <p style="color:#6b7280;font-size:13px;">Minimum deposit: $30 USD equivalent.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="color:#9ca3af;font-size:12px;text-align:center;">© ${new Date().getFullYear()} Tronnlix</p>
      </div>`,
  }),
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { template, to, data, user_id } = await req.json();

    if (!template || !to) {
      return new Response(JSON.stringify({ error: "template and to are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const templateFn = templates[template];
    if (!templateFn) {
      return new Response(JSON.stringify({ error: `Unknown template: ${template}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Resend API key from site_settings
    const { data: settingRow } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "resend_api_key")
      .single();

    const resendKey = settingRow?.value;
    if (!resendKey || typeof resendKey !== "string" || resendKey.length < 5) {
      console.log(`[send-email] No Resend key configured. Template: ${template}, To: ${to}`);
      return new Response(JSON.stringify({ sent: false, reason: "no_resend_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get sender from settings or default
    const { data: senderRow } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "email_sender")
      .single();
    const sender = (senderRow?.value as string) || "Tronnlix <hello@tronnlix.com>";

    const { subject, html } = templateFn(data || {});

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: sender,
        to: [to],
        subject,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("[send-email] Resend error:", errText);
      return new Response(JSON.stringify({ sent: false, error: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await emailRes.json();
    return new Response(JSON.stringify({ sent: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[send-email] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
