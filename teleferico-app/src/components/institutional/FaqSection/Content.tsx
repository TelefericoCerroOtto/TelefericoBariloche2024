import { i18n } from "@/i18n";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import type { GetFaqsResponse, Locales } from "@/types";
import { stringifyQuery } from "@/utils";
import EmptyFaqs from "./EmptyFaqs";
import Error from "./Error";
import FaqList from "./FaqList";

// TODO: Encontrar alguna manera de no tener que pasar por props el locale en todos los RSC
interface Props {
  locale: Locales;
  favs: boolean;
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

  const { ok, data } = await strapiFetch<GetFaqsResponse>(
    { endpoint: STRAPI_ENDPOINTS.FAQS, qp: stringifyQuery(query) },
    { cache: "no-store" },
  );
  if (!ok) return <Error />;

  const { data: faqs } = data;

  if (!faqs.length) {
    return <EmptyFaqs locale={locale} />;
  }

  return (
    <section className="w-full px-6 py-8 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full flex-col gap-6">
        <FaqList
          faqs={faqs.map(({ id, question, answer }) => ({
            id,
            question,
            answer,
          }))}
        />
      </div>
    </section>
  );
}
