import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Library from "./pages/Library";
import Broadcast from "./pages/Broadcast";
import ProgramSchedule from "./pages/ProgramSchedule";
import TNTTransmission from "./pages/TNTTransmission";
import EmbedSettings from "./pages/EmbedSettings";
import EmbedPlayer from "./pages/EmbedPlayer";
import ActivationKeysAdmin from "./pages/ActivationKeysAdmin";
import StreamMonitor from "./pages/StreamMonitor";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/library" element={<Library />} />
          <Route path="/broadcast/:channelId" element={<Broadcast />} />
          <Route path="/schedule/:channelId" element={<ProgramSchedule />} />
          <Route path="/transmission/:channelId" element={<TNTTransmission />} />
          <Route path="/embed-settings/:channelId" element={<EmbedSettings />} />
          <Route path="/embed/:channelId" element={<EmbedPlayer />} />
          <Route path="/admin/activation-keys" element={<ActivationKeysAdmin />} />
          <Route path="/monitor/:channelId" element={<StreamMonitor />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
