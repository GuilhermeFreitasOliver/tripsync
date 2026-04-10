"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, refreshSession, logout } = useAuth();

  const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && !isLoading && !hasAttemptedRefresh) {
      setHasAttemptedRefresh(true);
      refreshSession().catch(() => {});
    }
  }, [isAuthenticated, isLoading, refreshSession, hasAttemptedRefresh]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4 h-full min-h-screen">
        <span className="text-primary font-medium animate-pulse">Carregando TripSync...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4 min-h-screen">
      <Card className="w-full max-w-lg border-none bg-card/60 shadow-xl backdrop-blur-sm">
        <CardContent className="flex flex-col items-center gap-6 py-16 text-center">
          
          {isAuthenticated && user ? (
            // AUTHENTICATED STATE "DASHBOARD"
            <>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 text-primary-foreground shadow-inner overflow-hidden">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-primary">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight">
                  Bem-vindo(a), <span className="text-primary">{user.name.split(" ")[0]}</span>!
                </h1>
                <p className="text-muted-foreground">
                  {user.email}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mt-4">
                <Button size="lg" className="flex-1 max-w-[200px]" onClick={() => router.push("/trips")}>
                  Minhas Viagens
                </Button>
                <Button size="lg" variant="outline" className="flex-1 max-w-[200px]" onClick={() => logout()}>
                  Sair
                </Button>
              </div>
            </>
          ) : (
            // UNAUTHENTICATED STATE "LANDING PAGE"
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-8 w-8"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              </div>

              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight">
                  Trip<span className="text-primary">Sync</span>
                </h1>
                <p className="text-muted-foreground">
                  Planeje viagens colaborativas em tempo real.
                </p>
              </div>

              <Button size="lg" className="mt-2 w-full max-w-xs" onClick={() => router.push("/login")}>
                Começar a planejar
              </Button>
            </>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
