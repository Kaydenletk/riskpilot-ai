import { Icon } from "./Icon";
import styles from "./research.module.css";

export function EmptyState({
  title,
  description,
  action,
  onClick,
}: {
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className={styles.emptyState}>
      <span>
        <Icon name="book" size={29} />
      </span>
      <h4>{title}</h4>
      <p>{description}</p>
      <button className={styles.primaryButton} onClick={onClick}>
        {action}
        <Icon name="arrow" size={15} />
      </button>
    </div>
  );
}
