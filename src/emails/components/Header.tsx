import { Section, Img } from "@react-email/components";
import * as React from "react";
import { spacing } from "../styles/styles";

interface HeaderProps {
  logoUrl?: string;
  logoAlt?: string;
}

export const Header: React.FC<HeaderProps> = ({
  logoUrl = "https://via.placeholder.com/150x50/4F46E5/ffffff?text=YourLogo",
  logoAlt = "Company Logo",
}) => {
  return (
    <Section style={headerStyle}>
      <Img
        src={logoUrl}
        width="150"
        height="50"
        alt={logoAlt}
        style={logoStyle}
      />
    </Section>
  );
};

const headerStyle = {
  padding: `${spacing.xl} 20px 0`,
  textAlign: "center" as const,
};

const logoStyle = {
  margin: "0 auto",
};
