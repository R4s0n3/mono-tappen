import type { HomeRegion } from "@/lib/home/product";

export type EuCountry = {
  code:
    | "AT"
    | "BE"
    | "BG"
    | "HR"
    | "CY"
    | "CZ"
    | "DK"
    | "EE"
    | "FI"
    | "FR"
    | "DE"
    | "GR"
    | "HU"
    | "IE"
    | "IT"
    | "LV"
    | "LT"
    | "LU"
    | "MT"
    | "NL"
    | "PL"
    | "PT"
    | "RO"
    | "SK"
    | "SI"
    | "ES"
    | "SE";
  name: string;
};

export const EU_COUNTRIES = [
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czechia" },
  { code: "DK", name: "Denmark" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malta" },
  { code: "NL", name: "Netherlands" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
] as const satisfies readonly EuCountry[];

export type EuCountryCode = (typeof EU_COUNTRIES)[number]["code"];

if (
  EU_COUNTRIES.length !== 27 ||
  !EU_COUNTRIES.some((country) => country.code === "DE")
) {
  throw new Error(
    "EU_COUNTRIES must list the 27 member states, including Germany",
  );
}

export function countryName(code: string | null | undefined): string | null {
  if (!code) return null;
  const match = EU_COUNTRIES.find((country) => country.code === code);
  return match?.name ?? code;
}

export function shippingCountries(region: HomeRegion): EuCountryCode[] {
  if (region === "DE") return ["DE"];
  return EU_COUNTRIES.map((country) => country.code).filter(
    (code) => code !== "DE",
  );
}
