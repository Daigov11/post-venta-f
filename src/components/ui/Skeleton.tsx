import "./ui.css";

export function Skeleton({
  height = 16,
  width = "100%",
}: {
  height?: number | string;
  width?: number | string;
}) {
  return <span className="skeleton" style={{ height, width }} />;
}
