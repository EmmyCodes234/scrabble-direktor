import React, { forwardRef } from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import Icon from '../AppIcon';
import { cn } from '../../utils/cn';

const Accordion = AccordionPrimitive.Root;

const AccordionItem = forwardRef(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn(
      "backdrop-blur-lg bg-card/80 border border-border rounded-lg mb-4 overflow-hidden transition-smooth hover:shadow-glow hover:border-primary/30",
      className
    )}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = forwardRef(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between p-6 font-heading font-semibold text-foreground transition-smooth hover:bg-accent/10 focus:bg-accent/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background [&[data-state=open]>svg]:rotate-180 min-h-[60px]",
        className
      )}
      {...props}
    >
      {children}
      <Icon
        name="ChevronDown"
        size={20}
        className="text-primary transition-transform duration-200 shrink-0 ml-4"
      />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = forwardRef(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("px-6 pb-6", className)}>
      {children}
    </div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };