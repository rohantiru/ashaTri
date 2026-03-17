const configs = {
  interested: { label: 'Interested', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  ordered: { label: 'Ordered', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  ready: { label: 'Ready', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  picked_up: { label: 'Collected', classes: 'bg-gray-100 text-gray-500 border-gray-200' },
  available: { label: 'Available', classes: 'bg-asha-orangeDim text-asha-orange border-orange-200' },
  low_stock: { label: 'Low Stock', classes: 'bg-red-50 text-red-600 border-red-200' },
  out_of_stock: { label: 'Out of Stock', classes: 'bg-gray-100 text-gray-400 border-gray-200' },
  interest: { label: 'Poll', classes: 'bg-purple-50 text-purple-700 border-purple-200' },
  inventory: { label: 'In Stock', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

export default function StatusBadge({ status }) {
  const cfg = configs[status] || { label: status, classes: 'bg-gray-100 text-gray-500 border-gray-200' }
  return (
    <span className={`inline-flex items-center whitespace-nowrap px-2 py-1 rounded-full text-xs font-body font-medium border leading-none ${cfg.classes}`}>
      {cfg.label}
    </span>
  )
}
