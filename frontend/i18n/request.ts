import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export const SUPPORTED_LOCALES = ['pt-BR', 'en', 'es', 'zh'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function parseAcceptLanguage(header: string): SupportedLocale | null {
  const tags = header.split(',').map((t) => t.split(';')[0].trim().toLowerCase());
  for (const tag of tags) {
    if (tag.startsWith('zh')) return 'zh';
    if (tag.startsWith('es')) return 'es';
    if (tag.startsWith('pt')) return 'pt-BR';
    if (tag.startsWith('en')) return 'en';
  }
  return null;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  let locale: SupportedLocale = 'pt-BR';

  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  if (cookieLocale && (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale)) {
    locale = cookieLocale as SupportedLocale;
  } else {
    const acceptLang = headerStore.get('accept-language') ?? '';
    locale = parseAcceptLanguage(acceptLang) ?? 'pt-BR';
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
