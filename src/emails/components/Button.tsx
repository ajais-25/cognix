import { Button as EmailButton } from "@react-email/components";
import * as React from "react";
import { components } from "../styles/styles";

interface ButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "danger";
}

export const Button: React.FC<ButtonProps> = ({
  href,
  children,
  variant = "primary",
}) => {
  const style =
    variant === "danger" ? components.buttonDanger : components.button;

  return (
    <EmailButton style={style} href={href}>
      {children}
    </EmailButton>
  );
};
