import { useState } from "react";
import Modal from "../shared/Modal";
import useExpenseStore from "../../store/expenseStore";
import { EXPENSE_CATEGORIES } from "../../utils/formatters";

const today = () => new Date().toISOString().slice(0, 10);

export default function ExpenseForm({ expense, onClose }) {
  const { addExpense, updateExpense } = useExpenseStore();
  const isEdit = Boolean(expense);

  const [form, setForm] = useState({
    date: expense ? expense.date.slice(0, 10) : today(),
    detail: expense?.detail || "",
    category: expense?.category || EXPENSE_CATEGORIES[0],
    amount: expense?.amount ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) {
      setError("Amount must be a positive number.");
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateExpense(expense.id, form);
      } else {
        await addExpense(form);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Expense" : "Add Expense"} onClose={onClose}>
      {error && (
        <div className="mb-4 px-4 py-3 bg-red/10 border border-red/30 rounded-xl text-red text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            className="input"
            value={form.date}
            onChange={set("date")}
            required
          />
        </div>
        <div>
          <label className="label">Detail</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Grab lunch, Netflix subscription"
            value={form.detail}
            onChange={set("detail")}
            required
          />
        </div>
        <div>
          <label className="label">Category</label>
          <select
            className="input"
            value={form.category}
            onChange={set("category")}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Amount (SGD)</label>
          <input
            type="number"
            className="input font-mono"
            placeholder="0.00"
            value={form.amount}
            onChange={set("amount")}
            step="0.01"
            min="0.01"
            required
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex-1"
            disabled={submitting}
          >
            {submitting ? "Saving…" : isEdit ? "Update" : "Add Expense"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
