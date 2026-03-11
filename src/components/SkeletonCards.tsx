export default function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-full h-48 rounded-[28px] bg-black/5"
          style={{
            transform: `translateY(${i * -120}px) scale(${1 - i * 0.05})`,
            zIndex: 10 - i,
          }}
        />
      ))}
    </div>
  );
}
