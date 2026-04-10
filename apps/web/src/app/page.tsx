import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
      <Card className="w-full max-w-lg border-none bg-card/60 shadow-xl backdrop-blur-sm">
        <CardContent className="flex flex-col items-center gap-6 py-16 text-center">
          {/* Logo / icon */}
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

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">
              Trip<span className="text-primary">Sync</span>
            </h1>
            <p className="text-muted-foreground">
              Planeje viagens colaborativas em tempo real.
            </p>
          </div>

          {/* Status pill */}
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            App rodando com sucesso
          </span>

          {/* CTA */}
          <Button size="lg" className="mt-2 w-full max-w-xs">
            Começar a planejar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
