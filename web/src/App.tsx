import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import ModelConfig from "./pages/ModelConfig";
import InstallGuide from "./pages/InstallGuide";
import Monitoring from "./pages/Monitoring";
import PortableConfig from "./pages/PortableConfig";
import AgentOrchestration from "./pages/AgentOrchestration";
import AgentMonitor from "./pages/AgentMonitor";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/models" component={ModelConfig} />
      <Route path="/install" component={InstallGuide} />
      <Route path="/monitoring" component={Monitoring} />
      <Route path="/portable" component={PortableConfig} />
      <Route path="/agents" component={AgentOrchestration} />
      <Route path="/agent-monitor" component={AgentMonitor} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: 'oklch(0.15 0.025 250)',
                border: '1px solid oklch(0.25 0.03 250)',
                color: 'oklch(0.9 0.01 250)',
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
