import { ArrowLeft, CreditCard, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface Props {
  onBack: () => void;
}

const CardDepositForm = ({ onBack }: Props) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> {t("common.back")}
      </button>

      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">{t("deposit.cardPayment")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("deposit.cardPaymentDesc")}</p>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto">
          <CreditCard className="h-8 w-8 text-blue-500" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Coming Soon</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Card deposits are currently being set up. This feature will be available shortly. In the meantime, you can deposit using cryptocurrency or M-PESA.
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>Expected availability: Soon</span>
        </div>
      </div>

      <Button variant="outline" className="w-full h-12" onClick={onBack}>
        Choose Another Method
      </Button>
    </div>
  );
};

export default CardDepositForm;
