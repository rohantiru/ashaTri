import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import StatusBadge from '../../components/StatusBadge'
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronUp, Package } from 'lucide-react'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size']

function ItemModal({ item, onSave, onClose }) {
  const editing = !!item?.id
  const [form, setForm] = useState({
    name: item?.name || '',
    description: item?.description || '',
    type: item?.type || 'interest',
    hasSizes: item?.hasSizes ?? true,
    sizes: item?.sizes || ['S', 'M', 'L', 'XL'],
    inventory: item?.inventory || {}, // { 'S': 5, 'M': 10 }
    isActive: item?.isActive ?? true,
  })

  const toggleSize = (size) => {
    setForm(f => ({
      ...f,
      sizes: f.sizes.includes(size) ? f.sizes.filter(s => s !== size) : [...f.sizes, size],
    }))
  }

  const setInventoryCount = (size, val) => {
    setForm(f => ({ ...f, inventory: { ...f.inventory, [size]: parseInt(val) || 0 } }))
  }

  const handleSubmit = () => {
    if (!form.name.trim()) return
    onSave({ ...form, sizes: form.hasSizes ? form.sizes : ['One Size'] })
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-asha-border w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-asha-border">
          <h2 className="font-display font-bold text-asha-dark">{editing ? 'Edit Item' : 'Add Swag Item'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Item Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-asha-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-asha-orange transition-colors"
              placeholder="e.g. Asha Running Cap"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-asha-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-asha-orange transition-colors resize-none"
              rows={2}
              placeholder="Optional details about the item"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 'interest', label: 'Interest Poll', desc: 'Collect interest before ordering' },
                { val: 'inventory', label: 'Inventory', desc: 'In stock, ready for pickup' },
              ].map(({ val, label, desc }) => (
                <button
                  key={val}
                  onClick={() => setForm(f => ({ ...f, type: val }))}
                  className={`text-left p-3 rounded-xl border transition-all ${form.type === val ? 'border-asha-orange bg-asha-orangeDim' : 'border-asha-border hover:border-asha-orange/40'}`}
                >
                  <div className="font-body font-medium text-sm text-asha-dark">{label}</div>
                  <div className="font-body text-xs text-asha-muted mt-0.5">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Has sizes toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-body font-medium text-sm text-asha-dark">Size Variants</div>
              <div className="font-body text-xs text-asha-muted">Does this item come in different sizes?</div>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, hasSizes: !f.hasSizes }))}
              className={`w-11 h-6 rounded-full transition-colors relative ${form.hasSizes ? 'bg-asha-orange' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.hasSizes ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Size selection */}
          {form.hasSizes && (
            <div>
              <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Available Sizes</label>
              <div className="flex flex-wrap gap-2">
                {SIZES.filter(s => s !== 'One Size').map(size => (
                  <button
                    key={size}
                    onClick={() => toggleSize(size)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-body font-medium border transition-all ${form.sizes.includes(size) ? 'bg-asha-orange text-white border-asha-orange' : 'border-asha-border text-asha-muted hover:border-asha-orange/40'}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Inventory counts (only if type = inventory) */}
          {form.type === 'inventory' && (
            <div>
              <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Stock Count</label>
              <div className="space-y-2">
                {(form.hasSizes ? form.sizes : ['One Size']).map(size => (
                  <div key={size} className="flex items-center gap-3">
                    <span className="font-body text-sm text-asha-muted w-12">{size}</span>
                    <input
                      type="number"
                      min="0"
                      value={form.inventory[size] ?? ''}
                      onChange={e => setInventoryCount(size, e.target.value)}
                      className="w-24 border border-asha-border rounded-lg px-3 py-1.5 font-body text-sm focus:outline-none focus:border-asha-orange transition-colors"
                      placeholder="0"
                    />
                    <span className="font-body text-xs text-asha-muted">units</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-body font-medium text-sm text-asha-dark">Active</div>
              <div className="font-body text-xs text-asha-muted">Visible to athletes</div>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
              className={`w-11 h-6 rounded-full transition-colors relative ${form.isActive ? 'bg-asha-orange' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className="flex gap-2 p-5 border-t border-asha-border">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-asha-border font-body font-medium text-sm text-asha-muted hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} className="flex-1 py-2.5 rounded-xl bg-asha-orange text-white font-body font-medium text-sm hover:bg-asha-orangeLight transition-colors">
            {editing ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SwagItems() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'new' | item object

  const fetchItems = async () => {
    const snap = await getDocs(collection(db, 'swagItems'))
    setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  const handleSave = async (data) => {
    if (modal?.id) {
      await updateDoc(doc(db, 'swagItems', modal.id), { ...data, updatedAt: serverTimestamp() })
    } else {
      await addDoc(collection(db, 'swagItems'), { ...data, createdAt: serverTimestamp() })
    }
    setModal(null)
    fetchItems()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this item? This will not remove existing responses.')) return
    await deleteDoc(doc(db, 'swagItems', id))
    fetchItems()
  }

  const toggleActive = async (item) => {
    await updateDoc(doc(db, 'swagItems', item.id), { isActive: !item.isActive })
    fetchItems()
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl text-asha-dark">Swag Items</h1>
          <p className="font-body text-asha-muted text-sm mt-1">Manage interest polls and inventory items</p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-2 bg-asha-orange text-white px-4 py-2.5 rounded-xl font-body font-medium text-sm hover:bg-asha-orangeLight transition-colors"
        >
          <Plus size={16} />
          Add Item
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-asha-border h-20 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-asha-orangeDim flex items-center justify-center mx-auto mb-4">
            <Package size={24} className="text-asha-orange" />
          </div>
          <h3 className="font-display font-semibold text-asha-dark mb-1">No swag items yet</h3>
          <p className="font-body text-asha-muted text-sm">Add your first item to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className={`bg-white rounded-2xl border transition-all ${item.isActive ? 'border-asha-border' : 'border-dashed border-gray-200 opacity-60'}`}>
              <div className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-xl bg-asha-orangeDim flex items-center justify-center flex-shrink-0">
                  <Package size={18} className="text-asha-orange" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-semibold text-asha-dark">{item.name}</span>
                    <StatusBadge status={item.type} />
                    {!item.isActive && <span className="text-xs font-body text-asha-muted">(hidden)</span>}
                  </div>
                  {item.description && <p className="font-body text-xs text-asha-muted mt-0.5 truncate">{item.description}</p>}
                  {item.hasSizes && item.sizes?.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {item.sizes.map(s => (
                        <span key={s} className="text-xs bg-gray-100 text-asha-muted px-1.5 py-0.5 rounded font-body">
                          {s}{item.type === 'inventory' && item.inventory?.[s] !== undefined ? ` (${item.inventory[s]})` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleActive(item)} className={`p-1.5 rounded-lg text-xs font-body transition-colors ${item.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-asha-muted hover:bg-gray-100'}`}>
                    {item.isActive ? 'Live' : 'Off'}
                  </button>
                  <button onClick={() => setModal(item)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-asha-muted hover:text-asha-dark">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-asha-muted hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ItemModal
          item={modal === 'new' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
