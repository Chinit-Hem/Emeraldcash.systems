'use client'

import * as React from 'react'
import { Search } from 'lucide-react'

import { cn } from '@/shared/utils/ui'
import { SearchClearButton } from '@/shared/components/ui/SearchClearButton'

const Command = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex h-full w-full flex-col overflow-hidden rounded-md bg-white/70 text-slate-950 backdrop-blur-xl', className)}
      {...props}
    />
  )
)
Command.displayName = 'Command'

const CommandInput = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'> & { value?: string; onClear?: () => void }>(
  ({ className, value, onClear, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center border-b px-3 py-2.5 text-sm ring-offset-background backdrop-blur-sm', className)}
      {...props}
    >
      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
      <input className="flex h-11 w-full flex-1 rounded-md bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Type to search..." readOnly value={value} />
      {value && onClear && (
        <SearchClearButton
          onClear={onClear}
          className="h-8 w-8 shrink-0"
        />
      )}
    </div>
  )
)
CommandInput.displayName = CommandInput.displayName = 'CommandInput'

const CommandEmpty = React.forwardRef<React.ElementRef<'p'>, React.ComponentPropsWithoutRef<'p'>>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('py-6 text-center text-slate-500', className)}
      {...props}
    >
      {children}
    </p>
  )
)
CommandEmpty.displayName = 'CommandEmpty'

const CommandGroup = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col overflow-auto', className)}
      {...props}
    />
  )
)
CommandGroup.displayName = 'CommandGroup'

const CommandItem = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-slate-200 aria-selected:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50', className)}
      {...props}
    />
  )
)
CommandItem.displayName = 'CommandItem'

export { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem }

