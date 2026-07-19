import Image from "next/image";
import { cn } from "@/lib/utils";

interface PersonaAvatarProps {
  name: string;
  avatar?: string;
  size?: number;
  className?: string;
}

/**
 * One consistent persona mark for the AI assistant — the tenant's avatar
 * image when configured, otherwise a teal monogram.
 */
export function PersonaAvatar({
  name,
  avatar,
  size = 30,
  className,
}: PersonaAvatarProps) {
  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={name}
        width={size}
        height={size}
        className={cn("rounded-full object-cover shrink-0", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid place-items-center shrink-0 select-none rounded-full",
        "bg-primary text-primary-foreground",
        "font-[family-name:var(--font-heading)] font-semibold",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.44),
      }}
    >
      {(name || "A")[0]}
    </span>
  );
}
