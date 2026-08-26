"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Label({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<"label"> & {
  /** Marca el campo como obligatorio con un asterisco (*) decorativo. */
  required?: boolean
}) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {required ? (
        <span>
          {children}
          <span aria-hidden="true" className="ml-0.5 text-destructive">
            *
          </span>
        </span>
      ) : (
        children
      )}
    </label>
  )
}

export { Label }
