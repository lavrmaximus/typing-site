import styles from "./Typing.module.css";

export function Hints({ items }: { items: Array<[string, string]> }) {
  return (
    <div className={styles.hints}>
      {items.map(([keys, text]) => (
        <div key={keys}>
          {keys.split(" ").map((k) => <kbd key={k}>{k}</kbd>)}
          <span>{text}</span>
        </div>
      ))}
    </div>
  );
}
