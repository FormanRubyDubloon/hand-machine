import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CheckIcon, PlusIcon, SkipForwardIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const countBoxVariants = cva(
  "inline-flex shrink-0 items-center justify-center font-semibold tabular-nums [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** A number still to get. On a dark (current) list row it flips to light. */
        default:
          "border border-primary text-foreground group-data-[tone=current]/list-row:border-primary-foreground group-data-[tone=current]/list-row:text-primary-foreground",
        /** A number on a dark (current) row. */
        inverse: "border border-primary-foreground text-primary-foreground",
        /** A selected value, e.g. the aisle being edited. */
        filled: "bg-primary text-primary-foreground",
        /** All got: solid box with a tick. */
        done: "bg-primary text-primary-foreground group-data-[tone=current]/list-row:bg-primary-foreground group-data-[tone=current]/list-row:text-primary",
        /** Skipped / not here: dashed box with a skip icon. */
        skipped:
          "border border-dashed border-foreground text-foreground group-data-[tone=current]/list-row:border-primary-foreground group-data-[tone=current]/list-row:text-primary-foreground",
        /** Add something: dashed, quieter border with a plus. */
        add: "border border-dashed border-ring text-foreground",
      },
      size: {
        default: "size-13 text-[22px] [&_svg]:size-5",
        sm: "size-10 text-[17px] [&_svg]:size-4",
        /** Wider box for short text values such as "+2" or "12". */
        wide: "h-11 min-w-14 px-2 text-xl [&_svg]:size-5",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function CountBox({
  className,
  variant = "default",
  size = "default",
  children,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof countBoxVariants>) {
  const icon =
    variant === "done" ? (
      <CheckIcon strokeWidth={2.5} />
    ) : variant === "skipped" ? (
      <SkipForwardIcon />
    ) : variant === "add" ? (
      <PlusIcon />
    ) : null

  return (
    <span
      data-slot="count-box"
      data-variant={variant}
      className={cn(countBoxVariants({ variant, size }), className)}
      {...props}
    >
      {icon ?? children}
    </span>
  )
}

export { CountBox, countBoxVariants }
