import { useLocation, useNavigate, useSearchParams as useRouterSearchParams } from "react-router-dom";

/**
 * The play screens call Next's router. A query-only push replaces the search
 * string and keeps the hash. Home reads that search from the router, so a
 * reload is not required. `refresh` is a no-op: this shell has no server
 * components to re-fetch.
 */
export function useRouter() {
  const navigate = useNavigate();
  const location = useLocation();

  return {
    push(href: string) {
      if (href.startsWith("?")) {
        navigate({ pathname: location.pathname, search: href, hash: location.hash });
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
