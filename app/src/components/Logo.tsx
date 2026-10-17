export default function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <div
      className={`grid place-items-center rounded-lg bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-deep shadow-md ${className}`}
    >
      <span className="text-[11px] font-black tracking-tighter">ME</span>
    </div>
  );
}
