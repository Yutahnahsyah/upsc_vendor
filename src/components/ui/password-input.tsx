// @/components/ui/password-input.tsx
import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode; // Add this prop
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(({ className, leftIcon, ...props }, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="relative">
      {/* Render the left icon if provided */}
      {leftIcon && <div className="text-muted-foreground absolute top-2.5 left-2.5">{leftIcon}</div>}

      <Input
        type={showPassword ? 'text' : 'password'}
        // If there's a left icon, we add extra padding (pl-9)
        className={cn('pr-10', leftIcon ? 'pl-9' : '', className)}
        ref={ref}
        {...props}
      />

      <Button type="button" variant="ghost" size="sm" className="text-muted-foreground absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword((prev) => !prev)}>
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
});
PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
