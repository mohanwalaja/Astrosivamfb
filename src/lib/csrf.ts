export function getCsrfToken(): string {
  const entry = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("astrosivam_csrf="));
  return entry ? decodeURIComponent(entry.slice("astrosivam_csrf=".length)) : "";
}
