import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/layout/AppLayout";
import {
  DashboardPage,
  InventoryPage,
  TrussPage,
  EntriesPage,
  ExitsPage,
  PurchasesPage,
  FormResponsesPage,
  ProductsPage,
  SuppliersPage,
  SupplierMaterialsPage,
  UsersPage,
  VehiclesPage,
} from "./pages/RoutePages";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/estoque" element={<InventoryPage />} />
            <Route path="/trelica" element={<TrussPage />} />
            <Route path="/entradas" element={<EntriesPage />} />
            <Route path="/saidas" element={<ExitsPage />} />
            <Route path="/compras" element={<PurchasesPage />} />
            <Route path="/requisicoes" element={<FormResponsesPage />} />
            <Route path="/produtos" element={<ProductsPage />} />
            <Route path="/fornecedores" element={<SuppliersPage />} />
            <Route path="/fornecedores-materiais" element={<SupplierMaterialsPage />} />
            <Route path="/usuarios" element={<UsersPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
