"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const currentYear = new Date().getFullYear()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout="dropdown"
      fromYear={currentYear - 100}
      toYear={currentYear}
      className={cn("rounded-md border bg-background p-4 shadow-sm w-fit", className)}
      classNames={{
        months: "flex flex-col gap-4",
        month: "space-y-2",
        caption: "flex justify-between items-center gap-2",
        caption_label: "hidden", // hides the Month Year title
        nav: "hidden", // hides arrow navigation
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground w-9 text-xs font-semibold text-center",
        row: "flex w-full",
        cell: cn(
          "h-9 w-9 text-center text-sm p-0 relative",
          "focus-within:relative focus-within:z-20"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal text-center"
        ),
        day_selected:
          "bg-primary text-white hover:bg-primary/90 focus:bg-primary",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "text-muted-foreground opacity-50 pointer-events-none",
        day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
