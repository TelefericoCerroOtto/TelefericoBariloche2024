import { i18n } from "@/i18n";
import type { GetFaqsResponse, Locales } from "@/types";
import { fetchWrapper } from "@/utils/fetch";
import { getStrapiURL } from "@/utils/get-strapi-url";
import { stringifyQuery } from "@/utils/query";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";
import Error from "./Error";

// TODO: Encontrar alguna manera de no tener que pasar por props el locale en todos los RSC
interface Props {
  locale: Locales;
  favs: boolean;
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <p className="text-start text-2xl font-bold">{q}</p>
      <p className="text-start">{a}</p>
    </div>
  );
}

export default async function Content(props: Props) {
  const { locale, favs } = props;
  let query;

  if (!favs) {
    query = {
      locale: locale ?? i18n.defaultLocale,
    };
  } else {
    query = {
      locale: locale ?? i18n.defaultLocale,
      filters: {
        featured: {
          $eq: true,
        },
      },
    };
  }

  const { ok, data } = await fetchWrapper<GetFaqsResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.FAQS, stringifyQuery(query)),
  );
  if (!ok) return <Error />;

  const { data: faqs } = data;

  return (
    <section className="w-full px-6 md:px-6 lg:px-16">
      <div className="grid max-w-[1536px] grid-cols-1 gap-y-6 md:grid-cols-2 md:gap-x-14">
        {faqs.map((faq) => (
          <Faq q={faq.question} a={faq.answer} key={faq.id} />
        ))}
      </div>
    </section>
  );
}
