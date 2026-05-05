export default function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-text-primary font-semibold text-lg mb-2">{title}</h3>
      {description && <p className="text-text-secondary text-sm mb-6 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}
