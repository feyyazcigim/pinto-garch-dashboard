import { Dashboard } from "./pages/Dashboard";
import { TooltipProvider } from "./components/ui/tooltip";

export default function App() {
  return (
    <TooltipProvider delayDuration={150}>
      <Dashboard />
    </TooltipProvider>
  );
}
