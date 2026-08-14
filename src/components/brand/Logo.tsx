import Image from "next/image";
import logoImg from "../../../logo.jpeg";

const HEIGHT: Record<"sm" | "md", number> = {
  sm: 40,
  md: 52,
};

export default function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const height = HEIGHT[size];
  return (
    <Image
      src={logoImg}
      alt="Blanchix"
      height={height}
      style={{ height, width: "auto" }}
      priority
      className="rounded-full"
    />
  );
}
