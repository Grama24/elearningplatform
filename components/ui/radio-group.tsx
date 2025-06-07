import * as React from "react";
import { cn } from "@/lib/utils";

const RadioGroupContext = React.createContext<{
  name: string;
  value: string | undefined;
  setValue: (value: string) => void;
} | null>(null);

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export function RadioGroup({
  name,
  value: controlledValue,
  defaultValue,
  onValueChange,
  className,
  children,
  ...props
}: RadioGroupProps) {
  const [value, setValue] = React.useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : value;

  const setRadioValue = (val: string) => {
    if (!isControlled) setValue(val);
    onValueChange?.(val);
  };

  return (
    <RadioGroupContext.Provider
      value={{ name, value: currentValue, setValue: setRadioValue }}
    >
      <div
        role="radiogroup"
        className={cn("flex flex-col gap-2", className)}
        {...props}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export interface RadioGroupItemProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  children?: React.ReactNode;
}

export const RadioGroupItem = React.forwardRef<
  HTMLInputElement,
  RadioGroupItemProps
>(({ value, children, className, ...props }, ref) => {
  const context = React.useContext(RadioGroupContext);
  if (!context)
    throw new Error("RadioGroupItem must be used within a RadioGroup");
  const checked = context.value === value;
  return (
    <label
      className={cn("inline-flex items-center gap-2 cursor-pointer", className)}
    >
      <input
        ref={ref}
        type="radio"
        name={context.name}
        value={value}
        checked={checked}
        onChange={() => context.setValue(value)}
        className="accent-sky-600"
        {...props}
      />
      {children}
    </label>
  );
});
RadioGroupItem.displayName = "RadioGroupItem";
