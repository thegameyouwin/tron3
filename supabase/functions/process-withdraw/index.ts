import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { method, phone, amount_kes, amount_usd, wallet_address, network, crypto_id } = body;

    if (!amount_usd || amount_usd <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find user's USDT wallet
    const { data: wallet } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .or("crypto_id.eq.tether,crypto_id.eq.usdt")
      .limit(1)
      .maybeSingle();

    if (!wallet || Number(wallet.balance) < amount_usd) {
      return new Response(JSON.stringify({ error: "Insufficient USDT balance" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct balance (service role bypasses RLS)
    const newBalance = Number(wallet.balance) - amount_usd;
    await supabase
      .from("wallets")
      .update({ balance: newBalance })
      .eq("id", wallet.id);

    // Create withdrawal transaction
    const notes = method === "mpesa"
      ? `M-PESA withdrawal KES ${amount_kes || Math.round(amount_usd * 129)}`
      : `Crypto withdrawal ${crypto_id || "tether"} via ${network || "TRC-20"}`;

    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        type: "withdrawal",
        crypto_id: crypto_id || "tether",
        amount: amount_usd,
        usd_amount: amount_usd,
        wallet_address: method === "mpesa" ? (phone || "M-PESA") : (wallet_address || ""),
        network: method === "mpesa" ? "M-PESA" : (network || "TRC-20"),
        status: "pending",
        notes,
      })
      .select()
      .single();

    if (txError) {
      // Rollback balance
      await supabase.from("wallets").update({ balance: Number(wallet.balance) }).eq("id", wallet.id);
      throw txError;
    }

    // Ledger entry
    await supabase.from("ledger_entries").insert({
      user_id: user.id,
      crypto_id: "usdt",
      amount: -amount_usd,
      entry_type: method === "mpesa" ? "mpesa_withdrawal" : "crypto_withdrawal",
      description: notes,
      reference_id: tx.id,
    });

    return new Response(JSON.stringify({
      success: true,
      transaction_id: tx.id,
      message: "Withdrawal submitted for admin approval",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
