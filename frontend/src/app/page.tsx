import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingNav } from "@/components/landing/landing-nav";
import { CommandMenu } from "@/components/layout/command-menu";
import { FeatureBento, FinalCta, Impact, LandingFooter, LiveStrip } from "@/components/landing/sections";

export default function Home() {
  return (
    <>
      <LandingNav />
      <main>
        <Hero />
        <LiveStrip />
        <HowItWorks />
        <FeatureBento />
        <Impact />
        <FinalCta />
      </main>
      <LandingFooter />
      <CommandMenu />
    </>
  );
}
