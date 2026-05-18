import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 text-center">
      <h1 className="text-5xl font-bold tracking-tight mb-4">
        Welcome to <span className="text-primary">Equilibrium</span>
      </h1>
      <p className="text-xl text-muted-foreground max-w-2xl mb-8">
        Real-Time Performance Alignment System. Track goals, achievements, and review cycles seamlessly.
      </p>
      <div className="flex gap-4">
        <Link href="/login">
          <Button size="lg">Get Started</Button>
        </Link>
      </div>
    </div>
  );
}
