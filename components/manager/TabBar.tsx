import Link from 'next/link'

type Tab = { id: string; label: string; href: string }

type Props = { tabs: Tab[]; currentTab: string }

export default function TabBar({ tabs, currentTab }: Props) {
  return (
    <div className="flex border-b border-gray-200 mb-6">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={[
            'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
            currentTab === tab.id
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
          ].join(' ')}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
