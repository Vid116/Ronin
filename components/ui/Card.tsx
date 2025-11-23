import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'interactive';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', className = '', ...props }, ref) => {
    const baseStyles = 'rounded-lg transition-all duration-200';

    const variants = {
      default: 'bg-surface border border-warm-gray-700',
      bordered: 'bg-surface border-2 border-sage-600',
      interactive: 'bg-surface border-2 border-warm-gray-700 hover:border-sage-600 cursor-pointer',
    };

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
