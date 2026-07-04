export function OrderNoteField({ value, onChange }) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <label
        style={{
          display: "block",
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "var(--c-text)",
          marginBottom: "0.3125rem",
        }}
      >
        Order Note / Special Instructions
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Any special instructions for your order… (e.g. leave at door, call before delivery)"
        rows={3}
        style={{
          width: "100%",
          padding: "0.5rem 0.75rem",
          fontSize: "0.875rem",
          border: "1px solid var(--c-border)",
          borderRadius: "8px",
          background: "var(--c-surface)",
          color: "var(--c-text)",
          outline: "none",
          resize: "vertical",
        }}
      />
    </div>
  );
}
