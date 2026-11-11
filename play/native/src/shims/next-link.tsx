import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";

type LinkProps = {
  href: string;
  className?: string;
  children?: ReactNode;
  prefetch?: boolean;
};

export default function Link({ href, className, children }: LinkProps) {
  const external = /^[a-z][a-z0-9+.-]*:/i.test(href);
  if (external) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <RouterLink to={href} className={className}>
      {children}
    </RouterLink>
  );
}
