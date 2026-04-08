import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Upload, AlertCircle, CheckCircle2, X, ChevronRight, ChevronLeft, User, FileText, Camera, Lock, Loader2 } from "lucide-react";
import { useState, useRef, ChangeEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type KYCStatus = "unverified" | "pending" | "verified" | "rejected";
type Step = 1 | 2 | 3 | 4;

const KYCPage = () => {
  const { user } = useAuth();
  const { profile, refetch } = useProfile();
  const navigate = useNavigate();

  const status: KYCStatus = (profile?.kyc_status as KYCStatus) || "unverified";
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);

  // Personal info
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");

  // Front ID
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);

  // Back ID
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [idBackPreview, setIdBackPreview] = useState<string | null>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // Selfie
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, type: "front" | "back" | "selfie") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowed.includes(file.type)) { toast.error("Only JPG, PNG, PDF allowed"); return; }

    const setFile = type === "front" ? setIdFrontFile : type === "back" ? setIdBackFile : setSelfieFile;
    const setPreview = type === "front" ? setIdFrontPreview : type === "back" ? setIdBackPreview : setSelfiePreview;
    setFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const removeFile = (type: "front" | "back" | "selfie") => {
    if (type === "front") { setIdFrontFile(null); setIdFrontPreview(null); if (frontInputRef.current) frontInputRef.current.value = ""; }
    else if (type === "back") { setIdBackFile(null); setIdBackPreview(null); if (backInputRef.current) backInputRef.current.value = ""; }
    else { setSelfieFile(null); setSelfiePreview(null); if (selfieInputRef.current) selfieInputRef.current.value = ""; }
  };

  const uploadFile = async (file: File, docType: string) => {
    if (!user) throw new Error("Not authenticated");
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${docType}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("kyc-documents").upload(path, file);
    if (error) throw error;
    return path;
  };

  const submitKYC = async () => {
    if (!idFrontFile || !idBackFile || !selfieFile) { toast.error("Please upload all required documents"); return; }
    if (!user) return;
    setSubmitting(true);

    try {
      // Upload all files
      const [frontPath, backPath, selfiePath] = await Promise.all([
        uploadFile(idFrontFile, "id_front"),
        uploadFile(idBackFile, "id_back"),
        uploadFile(selfieFile, "selfie"),
      ]);

      // Create KYC document records
      const docs = [
        { user_id: user.id, document_type: "id_front", file_url: frontPath, status: "pending" },
        { user_id: user.id, document_type: "id_back", file_url: backPath, status: "pending" },
        { user_id: user.id, document_type: "selfie", file_url: selfiePath, status: "pending" },
      ];
      const { error } = await supabase.from("kyc_documents").insert(docs);
      if (error) throw error;

      // Update profile
      await supabase.from("profiles").update({
        kyc_status: "pending",
        display_name: fullName || profile?.display_name,
        country: country || profile?.country,
      }).eq("user_id", user.id);

      await refetch();
      toast.success("KYC documents submitted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!fullName.trim() || !dateOfBirth || !country.trim()) { toast.error("Please fill all fields"); return; }
      setStep(2);
    } else if (step === 2) {
      if (!idFrontFile) { toast.error("Please upload front of ID"); return; }
      setStep(3);
    } else if (step === 3) {
      if (!idBackFile) { toast.error("Please upload back of ID"); return; }
      setStep(4);
    }
  };

  const inputClass = "w-full h-10 rounded-lg bg-secondary border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all";

  const renderFileUpload = (
    label: string,
    desc: string,
    icon: React.ReactNode,
    file: File | null,
    preview: string | null,
    type: "front" | "back" | "selfie",
    inputRef: React.RefObject<HTMLInputElement>,
    accept: string
  ) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-foreground mb-2">
        {icon}
        <h2 className="text-sm font-semibold">{label}</h2>
      </div>
      <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
        {!file ? (
          <>
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-foreground font-medium mb-1">{desc}</p>
            <p className="text-xs text-muted-foreground mb-4">JPG, PNG, or PDF (max 10MB)</p>
            <Button variant="goldOutline" size="sm" onClick={() => inputRef.current?.click()}>
              Select File
            </Button>
            <input type="file" ref={inputRef} onChange={e => handleFileChange(e, type)} accept={accept} className="hidden" />
          </>
        ) : (
          <div className="relative">
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg border border-border" />
            ) : (
              <div className="bg-secondary rounded-lg p-4">
                <p className="text-sm text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            )}
            <button onClick={() => removeFile(type)} className="absolute top-2 right-2 p-1 bg-destructive/90 rounded-full hover:bg-destructive text-white">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (status === "verified") {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6 max-w-3xl mx-auto">
          <div className="bg-profit/5 border border-profit/30 rounded-2xl p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-profit mx-auto mb-3" />
            <h2 className="text-xl font-bold text-foreground">Verification Complete</h2>
            <p className="text-sm text-muted-foreground mt-1">Your identity has been verified.</p>
            <Button variant="gold" className="mt-4" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (status === "pending") {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6 max-w-3xl mx-auto">
          <div className="bg-primary/5 border border-primary/30 rounded-2xl p-6 text-center">
            <AlertCircle className="h-12 w-12 text-primary mx-auto mb-3" />
            <h2 className="text-xl font-bold text-foreground">Verification Pending</h2>
            <p className="text-sm text-muted-foreground mt-1">We're reviewing your documents. This usually takes 1-3 business days.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Identity Verification (KYC)</h1>
          <p className="text-sm text-muted-foreground">Complete verification to unlock full platform features</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-8">
          {["Personal", "ID Front", "ID Back", "Selfie"].map((label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                step > i + 1 ? "bg-profit text-white" : step === i + 1 ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
              }`}>
                {step > i + 1 ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-foreground mb-2">
                <User className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Personal Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Full Name (as on ID)</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" className={inputClass} required />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Date of Birth</label>
                  <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className={inputClass} required />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Residential Address</label>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, city, postal code" className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Country</label>
                  <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="Country of residence" className={inputClass} required />
                </div>
              </div>
            </div>
          )}

          {step === 2 && renderFileUpload(
            "ID Document (Front)", "Upload the front of your ID, passport, or driver's license",
            <FileText className="h-4 w-4 text-primary" />,
            idFrontFile, idFrontPreview, "front", frontInputRef, "image/jpeg,image/png,application/pdf"
          )}

          {step === 3 && renderFileUpload(
            "ID Document (Back)", "Upload the back of your ID document",
            <FileText className="h-4 w-4 text-primary" />,
            idBackFile, idBackPreview, "back", backInputRef, "image/jpeg,image/png,application/pdf"
          )}

          {step === 4 && renderFileUpload(
            "Selfie with ID", "Take a photo holding your ID next to your face",
            <Camera className="h-4 w-4 text-primary" />,
            selfieFile, selfiePreview, "selfie", selfieInputRef, "image/jpeg,image/png"
          )}
        </div>

        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="outline" size="lg" onClick={() => setStep((step - 1) as Step)} className="flex-1 gap-1">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          )}
          {step < 4 ? (
            <Button variant="gold" size="lg" onClick={nextStep} className="flex-1 gap-1">
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="gold" size="lg" onClick={submitKYC} disabled={submitting} className="flex-1">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : "Submit Verification"}
            </Button>
          )}
        </div>

        <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Your data is encrypted and stored securely. We follow strict privacy regulations.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default KYCPage;
