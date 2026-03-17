import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { fmtUSD } from '../../utils/format'
import { Plus, X, Receipt, Trash2 } from 'lucide-react'

const CATEGORIES = ['Travel', 'Entry Fee', 'Equipment', 'Accommodation', 'Food', 'Other']

function ExpenseModal({ onSave, onClose }) {
  const [form, setForm] = useState({ title: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'Other', notes: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.amount || isNaN(parseFloat(form.amount))) return
    setSaving(true)
    await onSave({ ...form, amount: parseFloat(form.amount) })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-asha-border w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-asha-border">
          <h2 className="font-display font-bold text-asha-dark">Add Expense</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Description *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-asha-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-asha-orange transition-colors"
              placeholder="e.g. Race entry fee, travel, equipment…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Amount (USD) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body text-sm text-asha-muted">$</span>
                <input
                  type="number" min="0" step="0.01"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-asha-border rounded-xl pl-7 pr-3 py-2.5 font-body text-sm focus:outline-none focus:border-asha-orange transition-colors"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-asha-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-asha-orange transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setForm(f => ({ ...f, category: cat }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium border transition-all ${form.category === cat ? 'bg-asha-orange text-white border-asha-orange' : 'border-asha-border text-asha-muted hover:border-asha-orange/40'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-asha-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-asha-orange transition-colors resize-none"
              rows={2}
              placeholder="Optional — receipt link, event name, details…"
            />
          </div>
        </div>
        <div className="flex gap-2 p-5 border-t border-asha-border">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-asha-border font-body font-medium text-sm text-asha-muted hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-asha-orange text-white font-body font-medium text-sm hover:bg-asha-orangeLight transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Add Expense'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Expenses() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const fetchExpenses = async () => {
    const snap = await getDocs(query(collection(db, 'expenses'), where('athleteId', '==', user.uid)))
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    data.sort((a, b) => (b.date > a.date ? 1 : -1))
    setExpenses(data)
    setLoading(false)
  }

  useEffect(() => { fetchExpenses() }, [user.uid])

  const handleSave = async (data) => {
    await addDoc(collection(db, 'expenses'), { ...data, athleteId: user.uid, createdAt: serverTimestamp() })
    setShowModal(false)
    fetchExpenses()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return
    await deleteDoc(doc(db, 'expenses', id))
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  const byCategory = {}
  expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount })

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl text-asha-dark">My Expenses</h1>
          <p className="font-body text-asha-muted text-sm mt-1">Submit expenses for Asha reimbursement</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-asha-orange text-white px-4 py-2.5 rounded-xl font-body font-medium text-sm hover:bg-asha-orangeLight transition-colors"
        >
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {!loading && expenses.length > 0 && (
        <>
          {/* Total + breakdown */}
          <div className="bg-white rounded-2xl border border-asha-border p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="font-display font-semibold text-asha-dark">Total Submitted</span>
                <p className="font-body text-xs text-asha-muted mt-0.5">Pending reimbursement from Asha</p>
              </div>
              <span className="font-display font-bold text-2xl text-asha-orange">{fmtUSD(total)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(byCategory).map(([cat, amt]) => (
                <div key={cat} className="flex items-center gap-1.5 bg-asha-cream rounded-lg px-3 py-1.5">
                  <span className="font-body text-xs text-asha-muted">{cat}</span>
                  <span className="font-body text-xs font-semibold text-asha-dark">{fmtUSD(amt)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="space-y-2">
            {expenses.map(e => (
              <div key={e.id} className="bg-white rounded-2xl border border-asha-border flex items-center gap-4 px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-asha-orangeDim flex items-center justify-center flex-shrink-0">
                  <Receipt size={15} className="text-asha-orange" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-body font-medium text-sm text-asha-dark">{e.title}</div>
                  <div className="font-body text-xs text-asha-muted">{e.date} · {e.category}</div>
                  {e.notes && <div className="font-body text-xs text-asha-muted mt-0.5 truncate">{e.notes}</div>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-body font-semibold text-sm text-asha-dark">{fmtUSD(e.amount)}</span>
                  <button onClick={() => handleDelete(e.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-asha-muted hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && expenses.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-asha-orangeDim flex items-center justify-center mx-auto mb-4">
            <Receipt size={24} className="text-asha-orange" />
          </div>
          <h3 className="font-display font-semibold text-asha-dark mb-1">No expenses yet</h3>
          <p className="font-body text-asha-muted text-sm">Add your first expense to start tracking</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-asha-border h-16 animate-pulse" />)}
        </div>
      )}

      {showModal && <ExpenseModal onSave={handleSave} onClose={() => setShowModal(false)} />}
    </div>
  )
}
