import type { ElementType } from 'react'

type OperationsPlaceholderProps = {
  title: string
  description: string
  icon: ElementType
  items: string[]
}

export function OperationsPlaceholder({ title, description, icon: Icon, items }: OperationsPlaceholderProps) {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-6 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#bfe8c4] bg-[#ecfdf3] text-[#00ab00]">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{description}</p>
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Data Readiness</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <div key={item} className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
