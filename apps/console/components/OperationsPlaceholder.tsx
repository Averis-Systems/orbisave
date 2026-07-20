import type { ElementType } from 'react'
import { PageHeader, SectionCard } from '@/components/ui'

type OperationsPlaceholderProps = {
  title: string
  description: string
  icon: ElementType
  items: string[]
}

/**
 * Shared shell for Console pages whose interior is still being built.
 *
 * Rebuilt onto the same primitives as the overview and users pages so the
 * seven pending pages read as part of one product while we build their real
 * interiors one at a time. The "what this page will show" list is deliberately
 * kept, because a page that plainly states it is coming is more honest than a
 * fabricated table of zeros.
 */
export function OperationsPlaceholder({ title, description, icon: Icon, items }: OperationsPlaceholderProps) {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-16">
      <PageHeader title={title} description={description} />

      <SectionCard
        title="Being built"
        description="This page is next in line. Here is what it will show once its data is wired."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={item}
              className="flex items-start gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600"
            >
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-200">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
