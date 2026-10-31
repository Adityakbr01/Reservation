import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { AppProviders } from "@/components/providers/app-providers";
import { AppRoutes } from "@/app/routes";

const SmoothScroll = lazy(() =>
  import("@/components/common/SmoothScroll").then((m) => ({
    default: m.SmoothScroll,
  })),
);

function App() {
  useEffect(() => {
    window.__HS_HYDRATING__ = false;
  }, []);

  return (
    <AppProviders>
      <Suspense fallback={null}>
        <SmoothScroll />
      </Suspense>
      <AppRoutes />
      <Toaster position="top-right" />
    </AppProviders>
  );
}

export default App;
