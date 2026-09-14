import {
  COMPANY_LOGO_ALT,
  COMPANY_LOGO_SRC,
  COMPANY_NAME,
  COMPANY_WEBSITE,
} from "../lib/brand";

type CompanyLogoProps = {
  className?: string;
  link?: boolean;
};

export function CompanyLogo({ className = "", link = true }: CompanyLogoProps) {
  const image = (
    <img
      className={`company-logo ${className}`.trim()}
      src={COMPANY_LOGO_SRC}
      alt={COMPANY_LOGO_ALT}
      width={168}
      height={48}
      decoding="async"
    />
  );

  if (!link) {
    return image;
  }

  return (
    <a
      className="company-logo-link"
      href={COMPANY_WEBSITE}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`前往 ${COMPANY_NAME} 官網`}
    >
      {image}
    </a>
  );
}
