import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { monitor_id } = await req.json();

    if (!monitor_id) {
      return new Response(JSON.stringify({ error: "monitor_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: monitor, error: mErr } = await supabase
      .from("deposit_monitors")
      .select("*")
      .eq("id", monitor_id)
      .single();

    if (mErr || !monitor) {
      return new Response(JSON.stringify({ error: "Monitor not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (monitor.status !== "monitoring") {
      return new Response(JSON.stringify({ status: monitor.status, monitor }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if expired
    if (new Date(monitor.expires_at) < new Date()) {
      await supabase
        .from("deposit_monitors")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", monitor_id);

      return new Response(JSON.stringify({ status: "expired", monitor: { ...monitor, status: "expired" } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Scan blockchain based on network
    let txFound = null;
    const address = monitor.address;
    const createdAt = new Date(monitor.created_at).getTime();

    if (monitor.network === "TRC-20" || monitor.network === "TRON") {
      txFound = await scanTronNetwork(address, createdAt);
    } else if (monitor.network === "ERC-20" || monitor.network === "ETH") {
      txFound = await scanEthNetwork(address, createdAt);
    } else if (monitor.network === "BTC") {
      txFound = await scanBtcNetwork(address, createdAt);
    } else if (monitor.network === "SOL") {
      txFound = await scanSolNetwork(address, createdAt);
    }

    if (txFound) {
      // Update monitor with detected amount
      await supabase
        .from("deposit_monitors")
        .update({
          status: "detected",
          amount_detected: txFound.amount,
          tx_hash: txFound.txHash,
          updated_at: new Date().toISOString(),
        })
        .eq("id", monitor_id);

      // Create a pending transaction for admin approval
      await supabase.from("transactions").insert({
        user_id: monitor.user_id,
        type: "deposit",
        crypto_id: monitor.crypto_id,
        amount: txFound.amount,
        usd_amount: 0, // Admin will set the correct USD amount
        status: "pending",
        wallet_address: address,
      });

      return new Response(
        JSON.stringify({
          status: "detected",
          amount: txFound.amount,
          tx_hash: txFound.txHash,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ status: "monitoring", message: "No transaction detected yet" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function scanTronNetwork(address: string, afterTimestamp: number) {
  try {
    const res = await fetch(
      `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?limit=10&min_timestamp=${afterTimestamp}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    
    if (data.data && data.data.length > 0) {
      for (const tx of data.data) {
        if (tx.to?.toLowerCase() === address.toLowerCase() && tx.type === "Transfer") {
          const decimals = tx.token_info?.decimals || 6;
          const amount = Number(tx.value) / Math.pow(10, decimals);
          return { amount, txHash: tx.transaction_id };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function scanEthNetwork(address: string, afterTimestamp: number) {
  try {
    // Use public Ethereum RPC - check last few blocks for transfers to address
    const res = await fetch(
      `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&page=1&offset=5`
    );
    if (!res.ok) return null;
    const data = await res.json();
    
    if (data.result && Array.isArray(data.result)) {
      for (const tx of data.result) {
        const txTime = Number(tx.timeStamp) * 1000;
        if (tx.to?.toLowerCase() === address.toLowerCase() && txTime > afterTimestamp) {
          const amount = Number(tx.value) / 1e18;
          return { amount, txHash: tx.hash };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function scanBtcNetwork(address: string, afterTimestamp: number) {
  try {
    const res = await fetch(`https://blockchain.info/rawaddr/${address}?limit=5`);
    if (!res.ok) return null;
    const data = await res.json();
    
    if (data.txs) {
      for (const tx of data.txs) {
        if ((tx.time * 1000) > afterTimestamp) {
          for (const out of tx.out) {
            if (out.addr === address) {
              return { amount: out.value / 1e8, txHash: tx.hash };
            }
          }
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function scanSolNetwork(address: string, _afterTimestamp: number) {
  try {
    const res = await fetch("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getSignaturesForAddress",
        params: [address, { limit: 5 }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    
    if (data.result && data.result.length > 0) {
      return { amount: 0, txHash: data.result[0].signature };
    }
    return null;
  } catch {
    return null;
  }
}
