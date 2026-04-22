"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { cn } from "@/lib/utils";

type AuthFormFieldProps = Omit<React.ComponentProps<"input">, "id"> & {
  id: string;
  label: string;
  help?: React.ReactNode;
  error?: string | null;
  fieldClassName?: string;
};

export const AuthFormField = React.forwardRef<HTMLInputElement, AuthFormFieldProps>(
  function AuthFormField(
    { id, label, help, error, fieldClassName, className, ...inputProps },
    ref,
  ) {
    return (
      <div className={cn("space-y-1.5", fieldClassName)}>
        <Label htmlFor={id} className="text-[11px] font-semibold tracking-wider uppercase">
          {label}
        </Label>
        <Input
          id={id}
          ref={ref}
          aria-invalid={Boolean(error)}
          className={className}
          {...inputProps}
        />
        {help && !error && <p className="text-muted-foreground text-[11px]">{help}</p>}
        <FormError message={error} />
      </div>
    );
  },
);
