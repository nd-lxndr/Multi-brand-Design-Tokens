import React from "react";
import "../../dist/tokens.css";
import "./Button.css";

// ---- Props ---------------------------------------------------------------
// This is the "contract" for anyone using <Button />. TypeScript will
// yell at them at compile time if they forget a required prop or pass
// the wrong type - e.g. variant="huge" would fail, because "huge" isn't
// one of the allowed strings below.
interface ButtonProps {
  /** What the button says */
  label: string;
  /** Visual style - defaults to "primary" if not passed */
  variant?: "primary" | "secondary";
  /** Disables interaction and dims the button */
  disabled?: boolean;
  /** Called when the button is clicked */
  onClick?: () => void;
}

// React.FC = "Function Component". <ButtonProps> tells it which props
// shape to expect. Destructuring in the function signature
// ({ label, variant = "primary", ... }) both unpacks the props object
// AND sets a default value for variant in one line.
export const Button: React.FC<ButtonProps> = ({
  label,
  variant = "primary",
  disabled = false,
  onClick,
}) => {
  return (
    <button
      // Template literal: builds a string like "ds-button ds-button--primary"
      // so CSS can target each variant separately.
      className={`ds-button ds-button--${variant}`}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
};
