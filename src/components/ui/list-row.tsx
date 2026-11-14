import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

const listRowVariants = cva(
  "group/list-row flex w-full shrink-0 items-center gap-4 border-b px-5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset disabled:pointer-events-none",
  {
    variants: {
      tone: {
        default: "border-border bg-background text-foreground",
        /** The row you're on: dark fill. */
        current: "border-primary bg-primary text-primary-foreground",
        /** Skipped, selected or active: grey fill. */
        muted: "border-border bg-muted text-foreground",
        /** Nothing to do here: grey text. */
        quiet: "border-border bg-background text-muted-foreground",
      },
      size: {
        sm: "min-h-16",
        default: "min-h-21",
        lg: "min-h-23",
      },
    },
    defaultVariants: { tone: "default", size: "default" },
  }
)

function ListRow({
  className,
  tone = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof listRowVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div"
  return (
    <Comp
      data-slot="list-row"
      data-tone={tone}
      className={cn(listRowVariants({ tone, size }), className)}
      {...props}
    />
  )
}

const titleSizes = {
  lg: "text-[22px]",
  md: "text-xl",
  sm: "text-[17px]",
}

/** The text block of a list row: optional eyebrow, title, description. */
function ListRowText({
  className,
  eyebrow,
  title,
  description,
  titleSize = "lg",
  titleClassName,
  descriptionClassName,
  ...props
}: Omit<React.ComponentProps<"span">, "title"> & {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  titleSize?: keyof typeof titleSizes
  titleClassName?: string
  descriptionClassName?: string
}) {
  return (
    <span
      data-slot="list-row-text"
      className={cn(
        "flex min-w-0 flex-1 flex-col",
        titleSize === "sm" ? "gap-0.5" : eyebrow ? "gap-1.5" : "gap-1",
        className
      )}
      {...props}
    >
      {eyebrow && (
        <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase group-data-[tone=current]/list-row:text-primary-foreground/70">
          {eyebrow}
        </span>
      )}
      <span className={cn("leading-tight font-medium", titleSizes[titleSize], titleClassName)}>
        {title}
      </span>
      {description && (
        <span
          className={cn(
            "text-muted-foreground group-data-[tone=current]/list-row:text-primary-foreground/70",
            titleSize === "sm" ? "text-[13px]" : "text-sm",
            descriptionClassName
          )}
        >
          {description}
        </span>
      )}
    </span>
  )
}

export { ListRow, ListRowText, listRowVariants }
