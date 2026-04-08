import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Mail, ShieldCheck, Loader2, RefreshCw } from "lucide-react";
import TronnlixLogo from "@/components/TronnlixLogo";

const EmailVerificationPage = () => {
  const { user, signOut } = useAuth();
  const { profile, refetch } = useProfile();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Already verified → redirect
  useEffect(() => {
    if (profile?.email_verified) {
      navigate("/kyc", { replace: true });
    }
  }, [profile?.email_verified, navigate]);

  // Send OTP on mount
  useEffect(() => {
    if (user && profile && !profile.email_verified) {
      sendOTP();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user?.id]);

  const startCooldown = () => {
    setCooldown(60);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOTP = async () => {
    if (sending || cooldown > 0) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-email-otp", {
        body: { action: "send" },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success("Verification code sent to your email");
        startCooldown();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send code");
    } finally {
      setSending(false);
    }
  };

  const verifyOTP = async () => {
    if (code.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-email-otp", {
        body: { action: "verify", code },
      });
      if (error) throw error;
      if (data?.verified) {
        toast.success("Email verified successfully!");
        await refetch();
        navigate("/kyc", { replace: true });
      } else {
        toast.error(data?.error || "Invalid code");
        setCode("");
      }
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center mb-6">
        <TronnlixLogo size={40} />
        <h1 className="text-2xl font-display font-bold text-foreground mt-3">Verify Your Email</h1>
        <p className="text-sm text-muted-foreground mt-1">
          We sent a 6-digit code to <span className="text-foreground font-medium">{user.email}</span>
        </p>
      </div>

      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="flex justify-center">
          <InputOTP value={code} onChange={setCode} maxLength={6}>
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} className="w-12 h-14 text-lg font-bold" />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button
          variant="gold"
          className="w-full h-12"
          onClick={verifyOTP}
          disabled={loading || code.length !== 6}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Verifying...
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4 mr-2" />
              Verify Email
            </>
          )}
        </Button>

        <div className="text-center space-y-2">
          <button
            onClick={sendOTP}
            disabled={sending || cooldown > 0}
            className="text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${sending ? "animate-spin" : ""}`} />
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
          </button>
          <div>
            <button
              onClick={signOut}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;
