import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AppProviders } from "@/components/providers/app-providers";
import { SmoothScroll } from "@/components/common/SmoothScroll";
import { AppRoutes } from "@/app/routes";

function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <SmoothScroll />
        <AppRoutes />
        <Toaster position="top-right" />
      </BrowserRouter>
    </AppProviders>
  );
}

export default App;
