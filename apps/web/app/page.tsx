import TailwindAdvancedEditor from "@/components/tailwind/advanced-editor";
import { AppProvider } from "@/contexts/AppContext";

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col items-center gap-4 py-4 sm:px-5">
      <AppProvider>
        <TailwindAdvancedEditor />
      </AppProvider>
    </div>
  );
}

