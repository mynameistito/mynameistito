import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const Card = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    data-slot="card"
    className={cn(
      "flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
);

const CardHeader = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    data-slot="card-header"
    className={cn(
      "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
      className
    )}
    {...props}
  />
);

const CardTitle = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    data-slot="card-title"
    className={cn("leading-none font-semibold", className)}
    {...props}
  />
);

const CardDescription = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    data-slot="card-description"
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
);

const CardContent = ({ className, ...props }: ComponentProps<"div">) => (
  <div data-slot="card-content" className={cn("px-6", className)} {...props} />
);

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
