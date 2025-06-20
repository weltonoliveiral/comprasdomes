import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { ElegantSignInForm } from "./components/ElegantSignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { Dashboard } from "./components/Dashboard";
import { ProfileSetup } from "./components/ProfileSetup";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm h-16 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 shadow-sm px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">🛒</span>
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Lista Inteligente
          </h2>
        </div>
        <Authenticated>
          <SignOutButton />
        </Authenticated>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-7xl mx-auto">
          <Content />
        </div>
      </main>
      <Toaster position="top-right" />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const userProfile = useQuery(api.userProfiles.getCurrentUserProfile);

  if (loggedInUser === undefined || userProfile === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Unauthenticated>
        <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left space-y-6">
            <h1 className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Lista Inteligente
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
              Revolucione suas compras com IA. Crie listas inteligentes, colabore em tempo real e nunca mais esqueça um item.
            </p>
            <div className="flex gap-4 justify-center lg:justify-start">
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                <span className="text-lg">✨</span>
                <span className="ml-2 text-sm font-medium">IA</span>
              </div>
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                <span className="text-lg">🔄</span>
                <span className="ml-2 text-sm font-medium">Tempo Real</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <ElegantSignInForm />
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        {!userProfile?.profile ? (
          <ProfileSetup />
        ) : (
          <Dashboard />
        )}
      </Authenticated>
    </div>
  );
}
