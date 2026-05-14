import { Section, Text, Link } from "@react-email/components";
import * as React from "react";
import { layout, components } from "../styles/styles";

interface FooterProps {
  companyName?: string;
  address?: string;
  privacyUrl?: string;
  termsUrl?: string;
}

export const Footer: React.FC<FooterProps> = ({
  companyName = "Cognix",
  privacyUrl = `${process.env.DOMAIN_URL!}/privacy`,
  termsUrl = `${process.env.DOMAIN_URL!}/terms`,
}) => {
  return (
    <Section style={layout.footer}>
      <Text style={layout.footerText}>
        © {new Date().getFullYear()} {companyName}. All rights reserved.
      </Text>
      <Text style={layout.footerText}>
        <Link href={privacyUrl} style={components.link}>
          Privacy Policy
        </Link>
        {" · "}
        <Link href={termsUrl} style={components.link}>
          Terms of Service
        </Link>
      </Text>
    </Section>
  );
};
