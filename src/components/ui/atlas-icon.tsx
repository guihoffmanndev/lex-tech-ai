import { cn } from "@/lib/utils";

interface AtlasIconProps extends React.HTMLAttributes<HTMLElement> {
  name: string;
  variant?: "regular" | "bold" | "thin";
}

export const AtlasIcon = ({ name, variant = "regular", className, ...props }: AtlasIconProps) => {
  const suffix = variant === "regular" ? "" : `-${variant}`;
  return <i className={cn(`at-${name}${suffix}`, className)} aria-hidden="true" {...props} />;
};
