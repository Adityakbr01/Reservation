import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AppProviders } from "@/components/providers/app-providers";
import { ScrollToTop } from "@/components/common/ScrollToTop";
import { AppRoutes } from "@/app/routes";

function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <ScrollToTop />
        <AppRoutes />
        <Toaster position="top-right" />
      </BrowserRouter>
    </AppProviders>
  );
}

export default App;
