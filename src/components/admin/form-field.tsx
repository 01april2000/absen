"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type FormFieldProps = React.ComponentProps<typeof Input> & {
  label: string;
};

export function FormField({ label, id, ...props }: FormFieldProps) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...props} />
    </div>
  );
}