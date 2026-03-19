import { BookOpen } from 'lucide-react'

export default function TrainingPlans() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-3xl text-asha-dark mb-2">Training Plans</h1>
      <p className="font-body text-sm text-asha-muted mb-8">Assign and manage training plans for athletes.</p>

      <div className="bg-white rounded-2xl border border-asha-border p-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-asha-orangeDim flex items-center justify-center mx-auto mb-4">
          <BookOpen size={22} className="text-asha-orange" />
        </div>
        <h2 className="font-display font-semibold text-lg text-asha-dark mb-2">Coming soon</h2>
        <p className="font-body text-sm text-asha-muted">
          Training plan assignment and management will be available here.
        </p>
      </div>
    </div>
  )
}
