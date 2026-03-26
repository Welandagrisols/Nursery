import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-base sm:text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "text-white hover:transform hover:-translate-y-0.5 shadow-md hover:shadow-lg",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border bg-background hover:transform hover:-translate-y-0.5 shadow-sm hover:shadow-md",
        secondary:
          "border bg-transparent hover:transform hover:-translate-y-0.5 shadow-sm hover:shadow-md",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 sm:h-10 px-6 sm:px-4 py-3 sm:py-2",
        sm: "h-10 sm:h-9 rounded-md px-4 sm:px-3",
        lg: "h-14 sm:h-11 rounded-md px-10 sm:px-8",
        icon: "h-12 w-12 sm:h-10 sm:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Apply brand colors based on variant
    const brandStyle = {
      ...style,
      ...(variant === "default" && {
        backgroundColor: "#FF7A29",
      }),
      ...(variant === "outline" && {
        borderColor: "#4CB76F",
        color: "#4CB76F",
      }),
      ...(variant === "secondary" && {
        borderColor: "#4CB76F",
        color: "#4CB76F",
      }),
    }
    
    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (variant === "default") {
        e.currentTarget.style.backgroundColor = "#e66a24";
      } else if (variant === "outline" || variant === "secondary") {
        e.currentTarget.style.backgroundColor = "#4CB76F";
        e.currentTarget.style.color = "white";
      }
    }
    
    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (variant === "default") {
        e.currentTarget.style.backgroundColor = "#FF7A29";
      } else if (variant === "outline" || variant === "secondary") {
        e.currentTarget.style.backgroundColor = "transparent";
        e.currentTarget.style.color = "#4CB76F";
      }
    }
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        style={brandStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
