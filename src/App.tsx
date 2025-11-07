import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Certification from "./pages/Certification";
import TrainingAttended from "./pages/TrainingAttended";
import TrainingImparted from "./pages/TrainingImparted";
import ProjectRollOn from "./pages/ProjectRollOn";
import ProjectRollOff from "./pages/ProjectRollOff";
import TeamMovement from "./pages/TeamMovement";
import Registration from "./pages/Registration";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/certification" element={<Certification />} />
            <Route path="/training/attended" element={<TrainingAttended />} />
            <Route path="/training/imparted" element={<TrainingImparted />} />
            <Route path="/project/roll-on" element={<ProjectRollOn />} />
          <Route path="/project/roll-off" element={<ProjectRollOff />} />
          <Route path="/team-movement" element={<TeamMovement />} />
            <Route path="/registration" element={<Registration />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;