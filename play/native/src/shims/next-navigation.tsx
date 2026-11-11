import { useLocation, useNavigate, useSearchParams as useRouterSearchParams } from "react-router-dom";

/**
 * The play screens call Next's router. Query-only pushes (the rules-card swipe)
 * do a full navigation so the reload that follows cannot race the history update.
 * `refresh` is a no-op: this shell has no server components to re-fetch.
 */
export function useRouter() {
  const navigate = useNavigate();
  const location = useLocation();

  return {
    push(href: string) {
      if (href.startsWith("?")) {
        window.location.assign(`${location.pathname}${href}`);
        return;
      }
      navigate(href);
    },
    replace(href: string) {
      navigate(href, { replace: true });
    },
    back() {
      navigate(-1);
    },
    refresh() {
      return undefined;
    },
  };
}

export function useSearchParams() {
  const [params] = useRouterSearchParams();
  return params;
}

export function usePathname() {
  return useLocation().pathname;
}
