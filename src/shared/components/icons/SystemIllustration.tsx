import { Banknote, BookOpen, ChartNoAxesColumnIncreasing, ClipboardList, GraduationCap, HandCoins, IdCard, Lightbulb, Package, Settings, UsersRound } from "lucide-react";

/** Scalable system illustrations inspired by the hub reference, inheriting each card's color. */
export function SystemIllustration({ systemId }: { systemId: string }) {
  const isLearning = systemId === "learning-center";
  const isAssets = systemId === "asset-inventory";
  const isHr = systemId === "human-resources";
  const isLoan = systemId === "loan-management";
  const isScreen = !isAssets && !isHr && !isLoan;
  const ScreenIcon = isLearning ? GraduationCap : ChartNoAxesColumnIncreasing;
  const MainIcon = isAssets ? Package : isHr ? UsersRound : HandCoins;
  const DetailIcon = isLearning ? BookOpen : isAssets ? ClipboardList : isHr ? IdCard : isLoan ? Banknote : Settings;

  return (
    <div aria-hidden="true" className="relative isolate mx-auto h-28 w-44 max-w-full">
      <div className="absolute left-5 top-1 h-24 w-24 rounded-full bg-current opacity-[0.14]" />
      <div className="absolute right-1 top-6 h-20 w-28 -rotate-12 rounded-[45%] bg-current opacity-[0.08]" />
      <div className="absolute bottom-1 left-3 right-1 h-2 rounded-[50%] bg-current opacity-[0.12] blur-sm" />
      {isScreen ? (
        <>
          <div className="absolute left-3 top-5 flex h-16 w-24 items-center justify-center rounded-md border-[3px] border-current bg-white shadow-sm dark:bg-slate-900">
            <span className="absolute left-1.5 top-1 h-1 w-5 rounded-full bg-current opacity-40" />
            <ScreenIcon className="mt-2 h-10 w-14" strokeWidth={1.7} />
          </div>
          <div className="absolute bottom-5 left-1 h-1.5 w-28 rounded-b-lg bg-current" />
        </>
      ) : (
        <MainIcon className="absolute left-3 top-6 h-16 w-20 fill-current/20 drop-shadow-sm" strokeWidth={1.8} />
      )}
      <div className="absolute bottom-3 right-1 rounded-lg bg-white/95 p-1.5 shadow-sm dark:bg-slate-900">
        <DetailIcon className="h-11 w-10" strokeWidth={1.8} />
      </div>
      {isLearning ? (
        <Lightbulb className="absolute right-5 top-1 h-7 w-7" strokeWidth={1.6} />
      ) : isHr ? (
        <Settings className="absolute bottom-1 right-0 h-6 w-6 rounded-full bg-white dark:bg-slate-900" strokeWidth={2} />
      ) : null}
    </div>
  );
}
