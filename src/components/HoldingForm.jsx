import { useState } from 'react'
import './HoldingForm.css'

const emptyHolding = {
  metal: 'gold',
  form: 'coin',
  name: '',
  mint: '',
  weightGrams: '',
  quantity: 1,
  totalPaid: '',
  purchaseDate: new Date().toISOString().slice(0, 10),
  dealer: '',
  notes: '',
}

export default function HoldingForm({ initialValue, onSubmit, onCancel }) {
  const [values, setValues] = useState(initialValue ?? emptyHolding)

  function update(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({
      ...values,
      weightGrams: parseFloat(values.weightGrams),
      quantity: parseFloat(values.quantity),
      totalPaid: parseFloat(values.totalPaid),
    })
  }

  return (
    <div className="holding-form-backdrop" onClick={onCancel}>
      <form className="holding-form" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>{initialValue ? 'Edit purchase' : 'Add purchase'}</h2>

        <div className="holding-form-row">
          <label>
            Metal
            <select value={values.metal} onChange={(e) => update('metal', e.target.value)}>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
            </select>
          </label>
          <label>
            Form
            <select value={values.form} onChange={(e) => update('form', e.target.value)}>
              <option value="coin">Coin</option>
              <option value="bar">Bar</option>
            </select>
          </label>
        </div>

        <label>
          Name
          <input
            type="text"
            placeholder="e.g. American Eagle 1oz"
            value={values.name}
            onChange={(e) => update('name', e.target.value)}
            required
          />
        </label>

        <label>
          Mint (optional)
          <input
            type="text"
            placeholder="e.g. US Mint"
            value={values.mint}
            onChange={(e) => update('mint', e.target.value)}
          />
        </label>

        <div className="holding-form-row">
          <label>
            Weight per unit (g)
            <input
              type="number"
              step="0.001"
              min="0"
              value={values.weightGrams}
              onChange={(e) => update('weightGrams', e.target.value)}
              required
            />
          </label>
          <label>
            Quantity
            <input
              type="number"
              step="1"
              min="1"
              value={values.quantity}
              onChange={(e) => update('quantity', e.target.value)}
              required
            />
          </label>
        </div>

        <div className="holding-form-row">
          <label>
            Total paid (EUR)
            <input
              type="number"
              step="0.01"
              min="0"
              value={values.totalPaid}
              onChange={(e) => update('totalPaid', e.target.value)}
              required
            />
          </label>
          <label>
            Purchase date
            <input
              type="date"
              value={values.purchaseDate}
              onChange={(e) => update('purchaseDate', e.target.value)}
              required
            />
          </label>
        </div>

        <label>
          Dealer (optional)
          <input
            type="text"
            placeholder="e.g. local coin shop"
            value={values.dealer}
            onChange={(e) => update('dealer', e.target.value)}
          />
        </label>

        <label>
          Notes (optional)
          <textarea
            rows={2}
            value={values.notes}
            onChange={(e) => update('notes', e.target.value)}
          />
        </label>

        <div className="holding-form-actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary">
            {initialValue ? 'Save changes' : 'Add purchase'}
          </button>
        </div>
      </form>
    </div>
  )
}
