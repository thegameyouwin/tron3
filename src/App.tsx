import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import VerifiedRoute from "@/components/VerifiedRoute";
import AdminRoute from "@/components/AdminRoute";
import Index from "./pages/Index.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import EmailVerificationPage from "./pages/EmailVerificationPage.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import CryptoWalletPage from "./pages/CryptoWalletPage.tsx";
import FiatWalletPage from "./pages/FiatWalletPage.tsx";
import P2PMarketPage from "./pages/P2PMarketPage.tsx";
import MarketsPage from "./pages/MarketsPage.tsx";
import SpotTradingPage from "./pages/SpotTradingPage.tsx";
import CoinDetailPage from "./pages/CoinDetailPage.tsx";
import FuturesPage from "./pages/FuturesPage.tsx";
import BotsPage from "./pages/BotsPage.tsx";
import EarnStakePage from "./pages/EarnStakePage.tsx";
import ReferralPage from "./pages/ReferralPage.tsx";
import ConverterPage from "./pages/ConverterPage.tsx";
import DepositPage from "./pages/DepositPage.tsx";
import WithdrawPage from "./pages/WithdrawPage.tsx";
import TransactionHistoryPage from "./pages/TransactionHistoryPage.tsx";
import PaymentMethodsPage from "./pages/PaymentMethodsPage.tsx";
import KYCPage from "./pages/KYCPage.tsx";
import SecurityPage from "./pages/SecurityPage.tsx";
import HelpPage from "./pages/HelpPage.tsx";
import AdminPage from "./pages/AdminPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/verify-email" element={<ProtectedRoute><EmailVerificationPage /></ProtectedRoute>} />
            <Route path="/coin/:coinId" element={<CoinDetailPage />} />
            <Route path="/dashboard" element={<VerifiedRoute><Dashboard /></VerifiedRoute>} />
            <Route path="/crypto-wallet" element={<VerifiedRoute><CryptoWalletPage /></VerifiedRoute>} />
            <Route path="/fiat-wallet" element={<VerifiedRoute><FiatWalletPage /></VerifiedRoute>} />
            <Route path="/p2p" element={<VerifiedRoute><P2PMarketPage /></VerifiedRoute>} />
            <Route path="/markets" element={<VerifiedRoute><MarketsPage /></VerifiedRoute>} />
            <Route path="/spot-trading" element={<VerifiedRoute><SpotTradingPage /></VerifiedRoute>} />
            <Route path="/futures" element={<VerifiedRoute><FuturesPage /></VerifiedRoute>} />
            <Route path="/bots" element={<VerifiedRoute><BotsPage /></VerifiedRoute>} />
            <Route path="/earn" element={<VerifiedRoute><EarnStakePage /></VerifiedRoute>} />
            <Route path="/referral" element={<VerifiedRoute><ReferralPage /></VerifiedRoute>} />
            <Route path="/converter" element={<VerifiedRoute><ConverterPage /></VerifiedRoute>} />
            <Route path="/deposit" element={<VerifiedRoute><DepositPage /></VerifiedRoute>} />
            <Route path="/withdraw" element={<VerifiedRoute><WithdrawPage /></VerifiedRoute>} />
            <Route path="/transactions" element={<VerifiedRoute><TransactionHistoryPage /></VerifiedRoute>} />
            <Route path="/payment-methods" element={<VerifiedRoute><PaymentMethodsPage /></VerifiedRoute>} />
            <Route path="/kyc" element={<ProtectedRoute><KYCPage /></ProtectedRoute>} />
            <Route path="/security" element={<VerifiedRoute><SecurityPage /></VerifiedRoute>} />
            <Route path="/help" element={<VerifiedRoute><HelpPage /></VerifiedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
