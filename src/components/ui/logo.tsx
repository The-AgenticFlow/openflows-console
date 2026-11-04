// Logo: the OpenFlows crab mark on a light tile. The mark's body is dark
// navy, so it needs a light backdrop to stay legible on the dark UI.
import Image from "next/image";

export function Logo({ size = 28, className = "" }: Readonly<{ size?: number; className?: string }>) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ${className}`}
      style={{ width: size, height: size }}
    >
      <Image src="/logo.png" alt="OpenFlows" width={size} height={size} priority />
    </span>
  );
}
